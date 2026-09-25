-- Pruebas de la migración 011 (reportes de negocios y eliminación de la propia cuenta).
-- Se ejecutan con scripts/probar-migraciones.sh sobre un Postgres limpio.
\set ON_ERROR_STOP 1

insert into auth.users (id, email, raw_user_meta_data) values
  ('33333333-3333-3333-3333-333333333333', 'duena@x.com', '{"nombre_completo":"Ana"}'),
  ('44444444-4444-4444-4444-444444444444', 'jefe@x.com', '{}');
update public.profiles set rol = 'admin' where email = 'jefe@x.com';

-- Un negocio publicado (con foto) y uno pendiente, ambos de Ana.
insert into public.businesses (owner_id, nombre, slug, descripcion, category_id, municipio_id, telefono, estado)
select '33333333-3333-3333-3333-333333333333', x.nombre, '', repeat('Descripción de prueba. ', 3),
       (select id from public.categories limit 1), (select id from public.municipios limit 1), '+50499999999', x.estado
from (values ('Pulpería Ana', 'aprobado'::public.business_status), ('Taller Ana', 'pendiente')) as x(nombre, estado);
create temp table neg as
  select id, estado from public.businesses where owner_id = '33333333-3333-3333-3333-333333333333';
grant select on neg to anon, authenticated;
insert into public.business_images (business_id, storage_path)
select id, id::text || '/' || gen_random_uuid() || '.webp' from neg where estado = 'aprobado';

-- 1. Un visitante (anon) reporta: el primero avisa, el segundo no
set role anon; select pruebas.t_como(null);
select pruebas.t_ok(public.reportar_negocio((select id from neg where estado = 'aprobado'), 'no_existe', ' Cerró hace meses ', null),
  'anon reporta: primer reporte abierto -> true');
select pruebas.t_ok(not public.reportar_negocio((select id from neg where estado = 'aprobado'), 'otro', 'Otro detalle', 'a@b.com'),
  'segundo reporte abierto -> false (no vuelve a avisar)');
reset role;
select pruebas.t_ok((select detalle = 'Cerró hace meses' and estado = 'abierto' from public.business_reports order by created_at limit 1),
  'detalle recortado y estado abierto');

-- 2. Límite: 3 por negocio y hora
set role anon;
select public.reportar_negocio((select id from neg where estado = 'aprobado'), 'estafa');
do $$ begin
  perform public.reportar_negocio((select id from neg where estado = 'aprobado'), 'estafa');
  raise exception 'FALLA: se permitió un 4.º reporte en la misma hora';
exception when raise_exception then
  if sqlerrm like 'FALLA%' then raise; end if;
  raise notice 'OK  4.º reporte en una hora: bloqueado (%)', sqlerrm;
end $$;

-- 3. No se pueden reportar negocios no publicados
do $$ begin
  perform public.reportar_negocio((select id from neg where estado = 'pendiente'), 'estafa');
  raise exception 'FALLA: se reportó un negocio pendiente';
exception when no_data_found then raise notice 'OK  negocio no publicado: no se puede reportar (P0002)';
end $$;

-- 4. Nadie inserta ni lee reportes directamente, salvo el admin
do $$ begin
  insert into public.business_reports (business_id, motivo) values ((select id from neg where estado = 'aprobado'), 'otro');
  raise exception 'FALLA: anon insertó directo';
exception when insufficient_privilege then raise notice 'OK  anon no inserta directo';
end $$;
do $$ begin
  perform 1 from public.business_reports;
  raise exception 'FALLA: anon leyó reportes';
exception when insufficient_privilege then raise notice 'OK  anon no lee reportes';
end $$;
reset role;
set role authenticated; select pruebas.t_como('33333333-3333-3333-3333-333333333333');
select pruebas.t_ok((select count(*) = 0 from public.business_reports), 'la dueña no ve los reportes de su negocio');
select pruebas.t_como('44444444-4444-4444-4444-444444444444');
select pruebas.t_ok((select count(*) = 3 from public.business_reports), 'el admin ve los 3 reportes');
update public.business_reports set estado = 'resuelto', resuelto_en = now()
where id = (select id from public.business_reports order by created_at limit 1);
select pruebas.t_ok((select count(*) = 1 from public.business_reports where estado = 'resuelto'), 'el admin resuelve un reporte');
do $$ begin
  update public.business_reports set motivo = 'otro';
  raise exception 'FALLA: el admin cambió el motivo';
exception when insufficient_privilege then raise notice 'OK  solo estado y resuelto_en son editables';
end $$;
reset role;

-- 5. Eliminar la propia cuenta
set role anon;
do $$ begin
  perform public.eliminar_mi_cuenta();
  raise exception 'FALLA: anon ejecutó eliminar_mi_cuenta';
exception when insufficient_privilege then raise notice 'OK  anon no puede eliminar cuentas';
end $$;
reset role;

set role authenticated; select pruebas.t_como('44444444-4444-4444-4444-444444444444');
select pruebas.t_ok(not public.puedo_eliminar_mi_cuenta(), 'admin: puedo_eliminar_mi_cuenta = false');
do $$ begin
  perform public.eliminar_mi_cuenta();
  raise exception 'FALLA: un admin se eliminó a sí mismo';
exception when raise_exception then
  if sqlerrm like 'FALLA%' then raise; end if;
  raise notice 'OK  un admin no puede eliminarse';
end $$;

select pruebas.t_como('33333333-3333-3333-3333-333333333333');
select pruebas.t_ok(public.puedo_eliminar_mi_cuenta(), 'dueña: puedo_eliminar_mi_cuenta = true');
select public.eliminar_mi_cuenta();
reset role;
select pruebas.t_ok(
  not exists (select 1 from auth.users where id = '33333333-3333-3333-3333-333333333333')
  and not exists (select 1 from public.profiles where id = '33333333-3333-3333-3333-333333333333')
  and not exists (select 1 from public.businesses where owner_id = '33333333-3333-3333-3333-333333333333')
  and not exists (select 1 from public.business_images where business_id in (select id from neg))
  and not exists (select 1 from public.business_reports where business_id in (select id from neg)),
  'eliminar cuenta: se borran usuario, perfil, negocios, fotos y reportes');
select pruebas.t_ok(exists (select 1 from auth.users where id = '44444444-4444-4444-4444-444444444444'),
  'las demás cuentas siguen intactas');
