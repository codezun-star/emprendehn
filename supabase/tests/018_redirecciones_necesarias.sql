-- Pruebas de la migración 018 (redirecciones solo de negocios publicados; reserva de 12 meses).
\set ON_ERROR_STOP 1
-- La prueba de 017 vuelve a aplicar 017 (con sus funciones anteriores): restaurar las de 018.
\i supabase/migrations/018_redirecciones_necesarias.sql

insert into auth.users (id, email) values
  ('f2222222-2222-2222-2222-222222222222', 'uno18@x.com'),
  ('f3333333-3333-3333-3333-333333333333', 'dos18@x.com'),
  ('f4444444-4444-4444-4444-444444444444', 'tres18@x.com');
create temp table ciudades18 as
  select (select id from public.municipios where slug = 'la-ceiba') as ceiba,
         (select id from public.municipios where slug = 'tela') as tela;
grant select on ciudades18 to authenticated;
create function pg_temp.nuevo(p_dueno uuid, p_nombre text, p_estado public.business_status) returns uuid language sql as $$
  insert into public.businesses (owner_id, nombre, slug, descripcion, category_id, municipio_id, telefono, estado)
  values (p_dueno, p_nombre, '', repeat('Descripción de prueba. ', 3), (select id from public.categories limit 1),
          (select ceiba from ciudades18), '+50499999999', p_estado)
  returning id
$$;
create function pg_temp.slug_de(p uuid) returns text language sql as $$ select slug from public.businesses where id = p $$;

-- 1. Negocio que nunca se publicó: cambia de ciudad sin dejar redirección
create temp table pend as select pg_temp.nuevo('f2222222-2222-2222-2222-222222222222', 'Pulpería Pendiente', 'pendiente') as id;
grant select on pend to authenticated;
set role authenticated; select pruebas.t_como('f2222222-2222-2222-2222-222222222222');
update public.businesses set municipio_id = (select tela from ciudades18) where id = (select id from pend);
reset role;
select pruebas.t_ok(pg_temp.slug_de((select id from pend)) = 'pulperia-pendiente-tela', 'nunca publicado: la URL cambia de ciudad');
select pruebas.t_ok(not exists (select 1 from public.business_slug_redirects where slug = 'pulperia-pendiente-la-ceiba'),
  'nunca publicado: no guarda redirección (nadie conocía esa URL)');

-- 2. Publicado alguna vez (aunque ahora esté suspendido): sí guarda la redirección
create temp table susp as select pg_temp.nuevo('f2222222-2222-2222-2222-222222222222', 'Pulpería Suspendida', 'aprobado') as id;
grant select on susp to authenticated;
update public.businesses set estado = 'suspendido', motivo_estado = 'Prueba de suspensión.' where id = (select id from susp);
set role authenticated; select pruebas.t_como('f2222222-2222-2222-2222-222222222222');
update public.businesses set municipio_id = (select tela from ciudades18) where id = (select id from susp);
reset role;
select pruebas.t_ok(exists (select 1 from public.business_slug_redirects
  where slug = 'pulperia-suspendida-la-ceiba' and business_id = (select id from susp)),
  'publicado alguna vez: la URL anterior sigue redirigiendo');

-- 3. Reserva de 12 meses para la URL vieja
create temp table a as select pg_temp.nuevo('f2222222-2222-2222-2222-222222222222', 'Pulpería La Esquina', 'aprobado') as id;
grant select on a to authenticated;
set role authenticated; select pruebas.t_como('f2222222-2222-2222-2222-222222222222');
update public.businesses set municipio_id = (select tela from ciudades18) where id = (select id from a);
reset role;
create temp table b as select pg_temp.nuevo('f3333333-3333-3333-3333-333333333333', 'Pulpería La Esquina', 'aprobado') as id;
select pruebas.t_ok(pg_temp.slug_de((select id from b)) = 'pulperia-la-esquina-la-ceiba-2',
  'redirección reciente: el negocio nuevo con el mismo nombre recibe -2');

update public.business_slug_redirects set created_at = now() - interval '13 months' where slug = 'pulperia-la-esquina-la-ceiba';
create temp table c as select pg_temp.nuevo('f4444444-4444-4444-4444-444444444444', 'Pulpería La Esquina', 'aprobado') as id;
select pruebas.t_ok(pg_temp.slug_de((select id from c)) = 'pulperia-la-esquina-la-ceiba',
  'redirección de más de 12 meses: otro negocio puede usar la URL limpia');
select pruebas.t_ok(not exists (select 1 from public.business_slug_redirects where slug = 'pulperia-la-esquina-la-ceiba'),
  'al tomarla, la redirección vieja se elimina');
set role anon;
select pruebas.t_ok(public.slug_actual('pulperia-la-esquina-la-ceiba') is null, 'la URL ya no redirige: ahora es del negocio nuevo');
reset role;

-- 4. Una redirección vencida que nadie tomó sigue funcionando
update public.business_slug_redirects set created_at = now() - interval '3 years' where slug = 'pulperia-suspendida-la-ceiba';
update public.businesses set estado = 'aprobado', motivo_estado = null where id = (select id from susp);
set role anon;
select pruebas.t_ok(public.slug_actual('pulperia-suspendida-la-ceiba') = 'pulperia-suspendida-tela',
  'redirección vencida pero libre: sigue llevando al negocio');
reset role;

-- 5. La migración borra las redirecciones de negocios nunca publicados
insert into public.business_slug_redirects (slug, business_id) values ('url-que-nadie-vio', (select id from pend));
\i supabase/migrations/018_redirecciones_necesarias.sql
select pruebas.t_ok(not exists (select 1 from public.business_slug_redirects where slug = 'url-que-nadie-vio'),
  'limpieza: se borran redirecciones de negocios nunca publicados');
select pruebas.t_ok(exists (select 1 from public.business_slug_redirects where slug = 'pulperia-suspendida-la-ceiba'),
  'limpieza: las de negocios publicados se conservan');
