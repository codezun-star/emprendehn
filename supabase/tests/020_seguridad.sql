-- Pruebas de la migración 020 (permisos mínimos, admin con dos pasos, validaciones y auditoría).
\set ON_ERROR_STOP 1

insert into auth.users (id, email) values
  ('f6666666-6666-6666-6666-666666666666', 'dueno20@x.com'),
  ('f7777777-7777-7777-7777-777777777777', 'admin20@x.com');
update public.profiles set rol = 'admin' where id = 'f7777777-7777-7777-7777-777777777777';

set role authenticated; select pruebas.t_como('f6666666-6666-6666-6666-666666666666');
insert into public.businesses (owner_id, nombre, slug, descripcion, category_id, municipio_id, telefono)
values ('f6666666-6666-6666-6666-666666666666', 'Tienda Veinte', '', 'Ropa típica y artesanías de todo Honduras, hechas a mano por familias.',
        (select id from public.categories limit 1), (select id from public.municipios limit 1), '+50499999999');
reset role;
create temp table n20 as select id from public.businesses where owner_id = 'f6666666-6666-6666-6666-666666666666';
grant select on n20 to anon, authenticated;

-- 1. Permisos mínimos (también en tablas nuevas)
select pruebas.t_ok(not exists (
  select 1 from pg_tables t, unnest(array['anon', 'authenticated']) as r(rol), unnest(array['TRUNCATE', 'REFERENCES', 'TRIGGER']) as p(permiso)
  where t.schemaname = 'public' and has_table_privilege(r.rol, format('public.%I', t.tablename), p.permiso)
), 'anon y authenticated no tienen TRUNCATE/REFERENCES/TRIGGER en ninguna tabla');
create table public.prueba_020 (id int);
select pruebas.t_ok(not has_table_privilege('anon', 'public.prueba_020', 'TRUNCATE')
  and has_table_privilege('anon', 'public.prueba_020', 'SELECT'), 'tablas nuevas: sin TRUNCATE (el resto igual que antes)');
drop table public.prueba_020;

-- 2. Admin = rol + segundo factor reciente
set role authenticated;
select pruebas.t_como('f7777777-7777-7777-7777-777777777777', 'aal2', '1 minute');
select pruebas.t_ok(public.is_admin(), 'admin con código verificado hace 1 minuto: es admin');
select pruebas.t_como('f7777777-7777-7777-7777-777777777777', 'aal2', '11 hours');
select pruebas.t_ok(public.is_admin(), 'admin con código de hace 11 horas: sigue siendo admin');
select pruebas.t_como('f7777777-7777-7777-7777-777777777777', 'aal2', '13 hours');
select pruebas.t_ok(not public.is_admin(), 'código de hace 13 horas: ya no es admin (debe verificar de nuevo)');
select pruebas.t_como('f7777777-7777-7777-7777-777777777777', 'aal1');
select pruebas.t_ok(not public.is_admin(), 'admin solo con contraseña (aal1): no es admin');
select pruebas.t_ok((select count(*) = 0 from public.businesses where id = (select id from n20)),
  'aal1: no ve negocios pendientes ajenos');
update public.businesses set estado = 'aprobado' where id = (select id from n20);
select pruebas.t_como('f6666666-6666-6666-6666-666666666666');
select pruebas.t_ok(not public.is_admin(), 'un dueño con aal2 no es admin');
-- Claims raras (sin amr, amr como objeto, fecha no numérica): false, sin error.
-- (auth.uid() de las pruebas lee primero request.jwt.claim.sub: se fija al admin.)
select set_config('request.jwt.claim.sub', 'f7777777-7777-7777-7777-777777777777', false);
select set_config('request.jwt.claims', '{"sub":"f7777777-7777-7777-7777-777777777777","aal":"aal2"}', false);
select pruebas.t_ok(not public.is_admin(), 'aal2 sin amr: no es admin');
select set_config('request.jwt.claims', '{"sub":"f7777777-7777-7777-7777-777777777777","aal":"aal2","amr":{"method":"totp"}}', false);
select pruebas.t_ok(not public.is_admin(), 'amr con formato inesperado: no es admin');
select set_config('request.jwt.claims', '{"sub":"f7777777-7777-7777-7777-777777777777","aal":"aal2","amr":[{"method":"totp","timestamp":"ayer"}]}', false);
select pruebas.t_ok(not public.is_admin(), 'fecha no numérica: no es admin');
select set_config('request.jwt.claims', '{"sub":"f7777777-7777-7777-7777-777777777777","aal":"aal2","amr":["totp","password"]}', false);
select pruebas.t_ok(public.is_admin(), 'amr en formato RFC 8176 (["totp", …]) con aal2: es admin (sin quedar bloqueado)');
select set_config('request.jwt.claims', '{"sub":"f7777777-7777-7777-7777-777777777777","aal":"aal1","amr":["totp","password"]}', false);
select pruebas.t_ok(not public.is_admin(), 'formato RFC 8176 pero aal1: no es admin');
reset role;
select pruebas.t_como(null);
select pruebas.t_ok((select estado = 'pendiente' from public.businesses where id = (select id from n20)),
  'el admin sin segundo factor no pudo aprobar');

-- 3. Validaciones en la base
set role authenticated; select pruebas.t_como('f6666666-6666-6666-6666-666666666666');
do $$ begin
  update public.businesses set redes_sociales = '{"facebook":"javascript:alert(1)"}' where id = (select id from n20);
  raise exception 'FALLA: se guardó un enlace javascript:';
exception when check_violation then raise notice 'OK  redes: rechaza javascript:';
end $$;
do $$ begin
  update public.businesses set redes_sociales = '{"otra":"https://x.com"}' where id = (select id from n20);
  raise exception 'FALLA: se guardó una red desconocida';
exception when check_violation then raise notice 'OK  redes: rechaza claves desconocidas';
end $$;
do $$ begin
  update public.businesses set redes_sociales = '{"sitio_web":"https://x.com/\"><script>"}' where id = (select id from n20);
  raise exception 'FALLA: se guardó un enlace con comillas';
exception when check_violation then raise notice 'OK  redes: rechaza comillas y <>';
end $$;
update public.businesses set redes_sociales =
  '{"facebook":"https://www.facebook.com/tienda","sitio_web":"http://tienda.hn/it''s?a=1&b=2#x"}' where id = (select id from n20);
select pruebas.t_ok((select redes_sociales ->> 'facebook' = 'https://www.facebook.com/tienda' from public.businesses where id = (select id from n20)),
  'redes: acepta enlaces normales');
do $$ begin
  update public.businesses set logo_path = (select id from n20)::text || '/../otro/logo.webp' where id = (select id from n20);
  raise exception 'FALLA: se guardó un logo con ruta rara';
exception when check_violation then raise notice 'OK  logo: rechaza rutas fuera de formato';
end $$;
do $$ begin
  insert into public.business_images (business_id, storage_path) values ((select id from n20), (select id from n20)::text || '/x.svg');
  raise exception 'FALLA: se guardó una foto con ruta rara';
exception when check_violation then raise notice 'OK  fotos: rechaza rutas fuera de formato';
end $$;
insert into public.business_images (business_id, storage_path)
values ((select id from n20), (select id from n20)::text || '/' || gen_random_uuid() || '.webp');
select pruebas.t_ok((select count(*) = 1 from public.business_images where business_id = (select id from n20)), 'fotos: acepta el formato de la app');
reset role;

-- 4. Auditoría
select pruebas.t_ok(exists (select 1 from public.admin_auditoria
  where tabla = 'profiles' and registro_id = 'f7777777-7777-7777-7777-777777777777' and actor_id is null
    and cambios -> 'rol' = '["business_owner", "admin"]'::jsonb),
  'cambio de rol desde el SQL Editor: queda registrado');
delete from public.admin_auditoria;  -- (solo el dueño de la base puede; ver punto 5)

set role authenticated; select pruebas.t_como('f6666666-6666-6666-6666-666666666666');
update public.businesses set descripcion = 'Ropa típica, artesanías y recuerdos de Honduras, hechos a mano por familias.' where id = (select id from n20);
reset role;
select pruebas.t_ok((select count(*) = 0 from public.admin_auditoria), 'cambios del dueño: no se registran');

set role authenticated; select pruebas.t_como('f7777777-7777-7777-7777-777777777777');
update public.businesses set estado = 'aprobado' where id = (select id from n20);
update public.categories set nombre = nombre || ' 20' where id = (select category_id from public.businesses where id = (select id from n20));
reset role;
select pruebas.t_ok((select count(*) = 1 from public.admin_auditoria
  where tabla = 'businesses' and accion = 'editar' and actor_id = 'f7777777-7777-7777-7777-777777777777'
    and cambios -> 'estado' = '["pendiente", "aprobado"]'::jsonb and registro = 'Tienda Veinte'
    and not cambios ? 'updated_at'),
  'el admin aprueba: se registra quién, qué y antes → después');
select pruebas.t_ok((select count(*) = 1 from public.admin_auditoria where tabla = 'categories')
  and (select count(*) = 1 from public.admin_auditoria where tabla = 'businesses'),
  'renombrar categoría: 1 registro (no los negocios que se actualizan solos)');

set role authenticated; select pruebas.t_como('f7777777-7777-7777-7777-777777777777');
update public.categories set nombre = left(nombre, -3) where id = (select category_id from public.businesses where id = (select id from n20));
delete from public.businesses where id = (select id from n20);
reset role;
select pruebas.t_ok((select count(*) = 1 from public.admin_auditoria where tabla = 'businesses' and accion = 'eliminar'
  and cambios -> 'nombre' = '["Tienda Veinte", null]'::jsonb),
  'el admin elimina un negocio: queda registrado con sus datos');
select pruebas.t_ok((select count(*) = 0 from public.admin_auditoria where tabla = 'business_images'),
  'las fotos borradas en cascada no llenan el registro');

-- 5. Nadie más lee ni edita el registro
set role authenticated; select pruebas.t_como('f6666666-6666-6666-6666-666666666666');
select pruebas.t_ok((select count(*) = 0 from public.admin_auditoria), 'un dueño no ve el registro');
select pruebas.t_como('f7777777-7777-7777-7777-777777777777', 'aal1');
select pruebas.t_ok((select count(*) = 0 from public.admin_auditoria), 'el admin sin segundo factor no ve el registro');
select pruebas.t_como('f7777777-7777-7777-7777-777777777777');
select pruebas.t_ok((select count(*) >= 3 from public.admin_auditoria), 'el admin verificado sí lo ve');
do $$ begin
  delete from public.admin_auditoria;
  raise exception 'FALLA: el admin pudo borrar el registro';
exception when insufficient_privilege then raise notice 'OK  ni el admin puede borrar el registro (42501)';
end $$;
do $$ begin
  insert into public.admin_auditoria (accion, tabla) values ('editar', 'businesses');
  raise exception 'FALLA: se pudo escribir en el registro';
exception when insufficient_privilege then raise notice 'OK  nadie escribe el registro a mano (42501)';
end $$;
reset role;
set role anon; select pruebas.t_como(null);
do $$ begin
  perform 1 from public.admin_auditoria;
  raise exception 'FALLA: anon leyó el registro';
exception when insufficient_privilege then raise notice 'OK  anon no puede leer el registro (42501)';
end $$;
reset role;

-- 6. Lo que el admin borra directo (no en cascada) sí se registra
insert into auth.users (id, email) values ('f8888888-8888-8888-8888-888888888888', 'otro20@x.com');
set role authenticated; select pruebas.t_como('f8888888-8888-8888-8888-888888888888');
insert into public.businesses (owner_id, nombre, slug, descripcion, category_id, municipio_id, telefono)
values ('f8888888-8888-8888-8888-888888888888', 'Otra Tienda Veinte', '', 'Otra tienda de prueba con descripción suficientemente larga.',
        (select id from public.categories limit 1), (select id from public.municipios limit 1), '+50499999999');
insert into public.business_images (business_id, storage_path)
select id, id::text || '/' || gen_random_uuid() || '.webp' from public.businesses where owner_id = 'f8888888-8888-8888-8888-888888888888';
select pruebas.t_como('f7777777-7777-7777-7777-777777777777');
delete from public.business_images where business_id = (select id from public.businesses where owner_id = 'f8888888-8888-8888-8888-888888888888');
reset role;
select pruebas.t_ok((select count(*) = 1 from public.admin_auditoria where tabla = 'business_images' and accion = 'eliminar'),
  'el admin borra una foto directamente: queda registrado');

-- 7. Storage: solo nombres con el formato de la app, en la carpeta de un negocio propio
grant insert on storage.objects to authenticated;  -- (en Supabase ya lo tiene)
create temp table otro20 as select id from public.businesses where owner_id = 'f8888888-8888-8888-8888-888888888888';
grant select on otro20 to authenticated;
set role authenticated; select pruebas.t_como('f8888888-8888-8888-8888-888888888888');
insert into storage.objects (bucket_id, name) select 'business-images', id::text || '/' || gen_random_uuid() || '.webp' from otro20;
insert into storage.objects (bucket_id, name) select 'business-images', id::text || '/logo-' || gen_random_uuid() || '.jpg' from otro20;
do $$ begin
  insert into storage.objects (bucket_id, name) select 'business-images', id::text || '/pagina.html' from otro20;
  raise exception 'FALLA: se subió un archivo con nombre libre';
exception when insufficient_privilege then raise notice 'OK  storage: rechaza nombres fuera de formato';
end $$;
select pruebas.t_como('f6666666-6666-6666-6666-666666666666');
do $$ begin
  insert into storage.objects (bucket_id, name) select 'business-images', id::text || '/' || gen_random_uuid() || '.webp' from otro20;
  raise exception 'FALLA: se subió a la carpeta de otro negocio';
exception when insufficient_privilege then raise notice 'OK  storage: no se sube a la carpeta de otro negocio';
end $$;
reset role;
select pruebas.t_ok((select count(*) = 2 from storage.objects where name like (select id from otro20)::text || '/%'),
  'storage: acepta fotos y logos con el formato de la app');

-- 8. Una cuenta admin no se elimina desde el panel, ni siquiera sin el segundo factor
set role authenticated; select pruebas.t_como('f7777777-7777-7777-7777-777777777777', 'aal1');
select pruebas.t_ok(not public.puedo_eliminar_mi_cuenta(), 'admin con solo contraseña: no puede eliminar su cuenta');
do $$ begin
  perform public.eliminar_mi_cuenta();
  raise exception 'FALLA: se eliminó la cuenta admin con aal1';
exception when raise_exception then raise notice 'OK  eliminar_mi_cuenta rechaza la cuenta admin (aal1)';
end $$;
reset role;
select pruebas.t_ok(exists (select 1 from auth.users where id = 'f7777777-7777-7777-7777-777777777777'), 'la cuenta admin sigue ahí');
