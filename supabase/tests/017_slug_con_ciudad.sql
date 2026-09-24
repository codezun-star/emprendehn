-- Pruebas de la migración 017 (ciudad en la URL del negocio).
\set ON_ERROR_STOP 1

insert into auth.users (id, email) values ('f1111111-1111-1111-1111-111111111111', 'marta17@x.com');
create temp table ciudades as
  select (select id from public.municipios where slug = 'la-ceiba') as ceiba,
         (select id from public.municipios where slug = 'tela') as tela;
grant select on ciudades to anon, authenticated;

insert into public.businesses (owner_id, nombre, slug, descripcion, category_id, municipio_id, telefono, estado)
select 'f1111111-1111-1111-1111-111111111111', 'Baleadas Doña Marta', '', repeat('Descripción de prueba. ', 3),
       (select id from public.categories limit 1), (select ceiba from ciudades), '+50499999999', 'aprobado';
create temp table n1 as select id from public.businesses where owner_id = 'f1111111-1111-1111-1111-111111111111';
grant select on n1 to anon, authenticated;
create function pg_temp.slug_de(p uuid) returns text language sql as $$ select slug from public.businesses where id = p $$;

-- 1. Negocio nuevo: nombre + ciudad
select pruebas.t_ok(pg_temp.slug_de((select id from n1)) = 'baleadas-dona-marta-la-ceiba', 'negocio nuevo: nombre-ciudad');

-- 2. Mismo nombre en la misma ciudad: -2
insert into public.businesses (owner_id, nombre, slug, descripcion, category_id, municipio_id, telefono, estado)
select 'f1111111-1111-1111-1111-111111111111', 'Baleadas Doña Marta', '', repeat('Descripción de prueba. ', 3),
       (select id from public.categories limit 1), (select ceiba from ciudades), '+50499999999', 'aprobado';
create temp table n2 as select id from public.businesses where owner_id = 'f1111111-1111-1111-1111-111111111111' and id <> (select id from n1);
grant select on n2 to anon, authenticated;
select pruebas.t_ok(pg_temp.slug_de((select id from n2)) = 'baleadas-dona-marta-la-ceiba-2', 'mismo nombre y ciudad: -2');

-- 3. El dueño cambia de ciudad: cambia la URL y la anterior redirige
set role authenticated; select pruebas.t_como('f1111111-1111-1111-1111-111111111111');
update public.businesses set municipio_id = (select tela from ciudades) where id = (select id from n1);
reset role;
select pruebas.t_ok(pg_temp.slug_de((select id from n1)) = 'baleadas-dona-marta-tela', 'cambio de ciudad: la URL pasa a la nueva ciudad');
select pruebas.t_ok(exists (select 1 from public.business_slug_redirects
  where slug = 'baleadas-dona-marta-la-ceiba' and business_id = (select id from n1)), 'la URL anterior queda como redirección (aunque la cambió un trigger)');
set role anon;
select pruebas.t_ok(public.slug_actual('baleadas-dona-marta-la-ceiba') = 'baleadas-dona-marta-tela', 'slug_actual lleva de la URL vieja a la nueva');
reset role;

-- 4. Un negocio nuevo no toma la URL que quedó como redirección
insert into public.businesses (owner_id, nombre, slug, descripcion, category_id, municipio_id, telefono)
select 'f1111111-1111-1111-1111-111111111111', 'Baleadas Doña Marta', '', repeat('Descripción de prueba. ', 3),
       (select id from public.categories limit 1), (select ceiba from ciudades), '+50499999999';
select pruebas.t_ok((select slug = 'baleadas-dona-marta-la-ceiba-3' from public.businesses
  where owner_id = 'f1111111-1111-1111-1111-111111111111' and id not in (select id from n1 union select id from n2)),
  'negocio nuevo: salta la URL reservada y la ocupada (-3)');

-- 5. Editar el nombre no cambia la URL
set role authenticated; select pruebas.t_como('f1111111-1111-1111-1111-111111111111');
update public.businesses set nombre = 'Baleadas y Más Doña Marta' where id = (select id from n1);
reset role;
select pruebas.t_ok(pg_temp.slug_de((select id from n1)) = 'baleadas-dona-marta-tela', 'editar el nombre no cambia la URL');

-- 6. Volver a la ciudad anterior recupera la URL anterior
set role authenticated; select pruebas.t_como('f1111111-1111-1111-1111-111111111111');
update public.businesses set municipio_id = (select ceiba from ciudades) where id = (select id from n1);
reset role;
select pruebas.t_ok(pg_temp.slug_de((select id from n1)) = 'baleadas-dona-marta-la-ceiba', 'volver a la ciudad anterior recupera su URL');
select pruebas.t_ok(not exists (select 1 from public.business_slug_redirects where slug = 'baleadas-dona-marta-la-ceiba')
  and exists (select 1 from public.business_slug_redirects where slug = 'baleadas-dona-marta-tela'),
  'la URL vigente deja de ser redirección y la de Tela pasa a serlo');

-- 7. Con -N: se quita la ciudad y el número; evita la redirección ajena
set role authenticated; select pruebas.t_como('f1111111-1111-1111-1111-111111111111');
update public.businesses set municipio_id = (select tela from ciudades) where id = (select id from n2);
reset role;
select pruebas.t_ok(pg_temp.slug_de((select id from n2)) = 'baleadas-dona-marta-tela-2',
  'cambio de ciudad con -N: baleadas-dona-marta-tela-2 (la -tela es redirección de otro negocio)');

-- 8. Slug manual del admin sin ciudad: al cambiar de ciudad se conserva y se le agrega la nueva
update public.businesses set slug = 'marta-baleadas' where id = (select id from n2);
set role authenticated; select pruebas.t_como('f1111111-1111-1111-1111-111111111111');
update public.businesses set municipio_id = (select ceiba from ciudades) where id = (select id from n2);
reset role;
select pruebas.t_ok(pg_temp.slug_de((select id from n2)) = 'marta-baleadas-la-ceiba', 'slug manual del admin: conserva su base y cambia la ciudad');

-- 9. El dueño sigue sin poder cambiar el slug directamente
set role authenticated; select pruebas.t_como('f1111111-1111-1111-1111-111111111111');
do $$ begin
  update public.businesses set slug = 'otro' where id = (select id from n1);
  raise exception 'FALLA: el dueño cambió el slug';
exception when insufficient_privilege then raise notice 'OK  el dueño sigue sin poder cambiar el slug a mano';
end $$;
reset role;

-- 10. Negocios existentes: la migración agrega la ciudad una sola vez
update public.businesses set slug = 'pupuseria-vieja' where id = (select id from n1);
\i supabase/migrations/017_slug_con_ciudad.sql
select pruebas.t_ok(pg_temp.slug_de((select id from n1)) = 'pupuseria-vieja-la-ceiba', 'migración: URL anterior + ciudad');
select pruebas.t_ok(exists (select 1 from public.business_slug_redirects where slug = 'pupuseria-vieja'), 'migración: la URL anterior redirige');
select pruebas.t_ok(pg_temp.slug_de((select id from n2)) = 'marta-baleadas-la-ceiba', 'migración: no toca las que ya terminan en su ciudad');
\i supabase/migrations/017_slug_con_ciudad.sql
select pruebas.t_ok(pg_temp.slug_de((select id from n1)) = 'pupuseria-vieja-la-ceiba', 'migración idempotente: no agrega la ciudad dos veces');
