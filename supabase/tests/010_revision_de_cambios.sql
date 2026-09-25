-- Pruebas de la migración 010 (revisión posterior de cambios y reenvío a revisión).
-- Se ejecutan con scripts/probar-migraciones.sh sobre un Postgres limpio.
\set ON_ERROR_STOP 1

insert into auth.users (id, email, raw_user_meta_data) values
  ('11111111-1111-1111-1111-111111111111', 'dueno@x.com', '{"nombre_completo":"Marta"}'),
  ('22222222-2222-2222-2222-222222222222', 'admin@x.com', '{}');
update public.profiles set rol = 'admin' where email = 'admin@x.com';
create temp table ctx as select (select id from public.categories limit 1) as cat, (select id from public.municipios limit 1) as mun,
  (select id from public.municipios offset 1 limit 1) as mun2;
grant select on ctx to authenticated;

-- 1. Dueño crea (pendiente)
set role authenticated; select pruebas.t_como('11111111-1111-1111-1111-111111111111');
insert into public.businesses (owner_id, nombre, slug, descripcion, category_id, municipio_id, telefono)
select '11111111-1111-1111-1111-111111111111', 'Baleadas Marta', '', repeat('Muy buenas baleadas. ', 3), cat, mun, '+50499999999' from ctx;
reset role;
create temp table n as select id from public.businesses where owner_id = '11111111-1111-1111-1111-111111111111'; grant select on n to authenticated;
select pruebas.t_ok((select estado = 'pendiente' and cambios_por_revisar = '{}' from public.businesses where id = (select id from n)), 'crear: pendiente, sin marcas');

-- 2. Pendiente: el dueño edita -> sigue pendiente, sin marcas
set role authenticated; select pruebas.t_como('11111111-1111-1111-1111-111111111111');
update public.businesses set nombre = 'Baleadas Doña Marta' where id = (select id from n);
reset role;
select pruebas.t_ok((select estado = 'pendiente' and cambios_por_revisar = '{}' from public.businesses where id = (select id from n)), 'pendiente editado: sin marcas');

-- 3. Admin aprueba
set role authenticated; select pruebas.t_como('22222222-2222-2222-2222-222222222222');
update public.businesses set estado = 'aprobado' where id = (select id from n);
reset role;
select pruebas.t_ok((select estado = 'aprobado' and aprobado_en is not null from public.businesses where id = (select id from n)), 'admin aprueba');

-- 4. Aprobado: cambio menor (teléfono, horario) -> sin marcas
set role authenticated; select pruebas.t_como('11111111-1111-1111-1111-111111111111');
update public.businesses set telefono = '+50488888888', horario = '{"lun":[]}', direccion = 'Col. Kennedy' where id = (select id from n);
reset role;
select pruebas.t_ok((select estado = 'aprobado' and cambios_por_revisar = '{}' and cambios_por_revisar_desde is null from public.businesses where id = (select id from n)), 'aprobado + cambio menor: sigue publicado, sin marcas');

-- 5. Aprobado: cambio sensible -> sigue publicado y queda marcado
set role authenticated; select pruebas.t_como('11111111-1111-1111-1111-111111111111');
update public.businesses set nombre = 'Baleadas La Marta', redes_sociales = '{"facebook":"https://fb.com/x"}' where id = (select id from n);
reset role;
select pruebas.t_ok((select estado = 'aprobado' and cambios_por_revisar = '{nombre,redes}' and cambios_por_revisar_desde is not null from public.businesses where id = (select id from n)), 'aprobado + nombre/redes: publicado y marcado {nombre,redes}');
create temp table desde as select cambios_por_revisar_desde d from public.businesses where id = (select id from n);

-- 6. Más cambios: se acumulan sin duplicar, "desde" no cambia
set role authenticated; select pruebas.t_como('11111111-1111-1111-1111-111111111111');
update public.businesses set nombre = 'Baleadas Marta HN', descripcion = repeat('Las mejores baleadas. ', 3), municipio_id = (select mun2 from ctx) where id = (select id from n);
reset role;
select pruebas.t_ok((select cambios_por_revisar = '{ciudad,descripcion,nombre,redes}' and cambios_por_revisar_desde = (select d from desde) from public.businesses where id = (select id from n)), 'marcas acumuladas y ordenadas; desde se conserva');

-- 7. Logo: quitarlo no marca, ponerlo sí
set role authenticated; select pruebas.t_como('11111111-1111-1111-1111-111111111111');
update public.businesses set logo_path = null where id = (select id from n);
reset role;
select pruebas.t_ok((select not ('logo' = any(cambios_por_revisar)) from public.businesses where id = (select id from n)), 'quitar logo: no marca');
set role authenticated; select pruebas.t_como('11111111-1111-1111-1111-111111111111');
update public.businesses set logo_path = (select id from n)::text || '/logo-' || gen_random_uuid() || '.webp' where id = (select id from n);
reset role;
select pruebas.t_ok((select 'logo' = any(cambios_por_revisar) from public.businesses where id = (select id from n)), 'poner logo: marca logo');

-- 8. Foto nueva en aprobado -> marca fotos
set role authenticated; select pruebas.t_como('11111111-1111-1111-1111-111111111111');
insert into public.business_images (business_id, storage_path) select id, id::text || '/' || gen_random_uuid() || '.webp' from n;
reset role;
select pruebas.t_ok((select 'fotos' = any(cambios_por_revisar) and estado = 'aprobado' from public.businesses where id = (select id from n)), 'foto nueva: marca fotos, sigue aprobado');

-- 9. El dueño NO puede borrar las marcas
set role authenticated; select pruebas.t_como('11111111-1111-1111-1111-111111111111');
do $$ begin
  update public.businesses set cambios_por_revisar = '{}', cambios_por_revisar_desde = null where id = (select id from n);
  raise exception 'FALLA: el dueño pudo borrar las marcas';
exception when insufficient_privilege then raise notice 'OK  el dueño no puede borrar las marcas (42501)';
end $$;
reset role;

-- 10. Admin marca como revisado
set role authenticated; select pruebas.t_como('22222222-2222-2222-2222-222222222222');
update public.businesses set cambios_por_revisar = '{}', cambios_por_revisar_desde = null where id = (select id from n);
reset role;
select pruebas.t_ok((select cambios_por_revisar = '{}' and cambios_por_revisar_desde is null and estado = 'aprobado' from public.businesses where id = (select id from n)), 'admin marca revisado');

-- 11. Admin suspende (con marcas previas) -> se limpian
set role authenticated; select pruebas.t_como('11111111-1111-1111-1111-111111111111');
update public.businesses set nombre = 'Otro nombre' where id = (select id from n);
select pruebas.t_como('22222222-2222-2222-2222-222222222222');
update public.businesses set estado = 'suspendido', motivo_estado = 'Fotos que no son del negocio.' where id = (select id from n);
reset role;
select pruebas.t_ok((select estado = 'suspendido' and cambios_por_revisar = '{}' and motivo_estado is not null from public.businesses where id = (select id from n)), 'admin suspende: limpia marcas, guarda motivo');

-- 12. Suspendido: el dueño edita -> vuelve a pendiente
set role authenticated; select pruebas.t_como('11111111-1111-1111-1111-111111111111');
update public.businesses set telefono = '+50477777777' where id = (select id from n);
reset role;
select pruebas.t_ok((select estado = 'pendiente' and motivo_estado is null from public.businesses where id = (select id from n)), 'suspendido + edición: vuelve a pendiente');

-- 13. Rechazado: el dueño agrega foto -> vuelve a pendiente
set role authenticated; select pruebas.t_como('22222222-2222-2222-2222-222222222222');
update public.businesses set estado = 'rechazado', motivo_estado = 'Agrega fotos reales del local.' where id = (select id from n);
select pruebas.t_como('11111111-1111-1111-1111-111111111111');
insert into public.business_images (business_id, storage_path) select id, id::text || '/' || gen_random_uuid() || '.webp' from n;
reset role;
select pruebas.t_ok((select estado = 'pendiente' and motivo_estado is null and cambios_por_revisar = '{}' from public.businesses where id = (select id from n)), 'rechazado + foto: vuelve a pendiente');

-- 14. Reaprobar conserva la fecha de la primera aprobación
create temp table ap as select aprobado_en a from public.businesses where id = (select id from n);
set role authenticated; select pruebas.t_como('22222222-2222-2222-2222-222222222222');
update public.businesses set estado = 'aprobado' where id = (select id from n);
reset role;
select pruebas.t_ok((select aprobado_en = (select a from ap) from public.businesses where id = (select id from n)), 'reaprobar conserva aprobado_en');

-- 15. Foto subida por el admin o desde el SQL editor no marca
insert into public.business_images (business_id, storage_path) select id, id::text || '/' || gen_random_uuid() || '.webp' from n;
select pruebas.t_ok((select cambios_por_revisar = '{}' from public.businesses where id = (select id from n)), 'foto desde SQL editor: no marca');

-- 16. El dueño sigue sin poder cambiar estado
set role authenticated; select pruebas.t_como('11111111-1111-1111-1111-111111111111');
do $$ begin
  update public.businesses set estado = 'suspendido' where id = (select id from n);
  raise exception 'FALLA: el dueño pudo cambiar el estado';
exception when insufficient_privilege then raise notice 'OK  el dueño no puede cambiar el estado (42501)';
end $$;
reset role;
