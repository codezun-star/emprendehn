-- Pruebas de la migración 014 (redirecciones de slugs).
\set ON_ERROR_STOP 1

insert into auth.users (id, email) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'rosa@x.com');
insert into public.businesses (owner_id, nombre, slug, descripcion, category_id, municipio_id, telefono, estado)
select 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Tortillas Rosa', '', repeat('Descripción de prueba. ', 3),
       (select id from public.categories limit 1), (select id from public.municipios limit 1), '+50499999999', 'aprobado';
create temp table neg as select id from public.businesses where owner_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
grant select on neg to anon, authenticated;
-- Desde 017 la URL lleva la ciudad: tortillas-rosa-{ciudad}.
select m.slug as ciudad from public.businesses b join public.municipios m on m.id = b.municipio_id where b.id = (select id from neg) \gset
select pruebas.t_ok((select slug = 'tortillas-rosa-' || :'ciudad' from public.businesses where id = (select id from neg)), 'slug inicial generado');

-- 1. El admin cambia el slug: el viejo redirige
update public.businesses set slug = 'panaderia-rosa' where id = (select id from neg);
select pruebas.t_ok(exists (select 1 from public.business_slug_redirects where slug = 'tortillas-rosa-' || :'ciudad'), 'se guarda el slug viejo');
set role anon;
select pruebas.t_ok(public.slug_actual('tortillas-rosa-' || :'ciudad') = 'panaderia-rosa', 'slug_actual resuelve el viejo al vigente');
select pruebas.t_ok(public.slug_actual('no-existe') is null, 'slug desconocido: null');
do $$ begin
  perform 1 from public.business_slug_redirects;
  raise exception 'FALLA: anon leyó la tabla de redirecciones';
exception when insufficient_privilege then raise notice 'OK  anon no lee la tabla, solo usa slug_actual';
end $$;
reset role;

-- 2. Un negocio nuevo con el mismo nombre no puede quedarse con el slug reservado
insert into public.businesses (owner_id, nombre, slug, descripcion, category_id, municipio_id, telefono)
select 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Tortillas Rosa', '', repeat('Descripción de prueba. ', 3),
       (select id from public.categories limit 1), (select id from public.municipios limit 1), '+50499999999';
select pruebas.t_ok((select slug = 'tortillas-rosa-' || :'ciudad' || '-2'
  from public.businesses where owner_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' and id <> (select id from neg)),
  'un negocio nuevo evita el slug reservado');

-- 3. Volver al slug anterior: deja de ser redirección y el intermedio pasa a serlo
update public.businesses set slug = 'tortillas-rosa-' || :'ciudad' where id = (select id from neg);
select pruebas.t_ok(not exists (select 1 from public.business_slug_redirects where slug = 'tortillas-rosa-' || :'ciudad')
  and exists (select 1 from public.business_slug_redirects where slug = 'panaderia-rosa'),
  'volver al slug anterior: se libera y el intermedio redirige');

-- 4. Solo redirige a negocios publicados
update public.businesses set estado = 'suspendido', motivo_estado = 'Prueba de suspensión.' where id = (select id from neg);
set role anon;
select pruebas.t_ok(public.slug_actual('panaderia-rosa') is null, 'negocio suspendido: no redirige');
reset role;

-- 5. El dueño sigue sin poder cambiar el slug
set role authenticated; select pruebas.t_como('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
do $$ begin
  update public.businesses set slug = 'otro-slug' where id = (select id from neg);
  raise exception 'FALLA: el dueño cambió el slug';
exception when insufficient_privilege then raise notice 'OK  el dueño no puede cambiar el slug';
end $$;
reset role;
