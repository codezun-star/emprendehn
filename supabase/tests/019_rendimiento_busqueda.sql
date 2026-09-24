-- Pruebas de la migración 019 (documento de búsqueda guardado y buscar_negocios con índice).
\set ON_ERROR_STOP 1

insert into auth.users (id, email) values ('f5555555-5555-5555-5555-555555555555', 'busca19@x.com');
create temp table ref19 as select
  (select id from public.categories where slug = 'panaderias') as panaderias,
  (select parent_id from public.categories where slug = 'panaderias') as padre,
  (select slug from public.categories where id = (select parent_id from public.categories where slug = 'panaderias')) as padre_slug,
  (select id from public.municipios where slug = 'la-ceiba') as ceiba,
  (select id from public.municipios where slug = 'tela') as tela;
grant select on ref19 to anon, authenticated;

insert into public.businesses (owner_id, nombre, slug, descripcion, category_id, municipio_id, localidad, telefono, estado, horario)
values
  ('f5555555-5555-5555-5555-555555555555', 'Pan Dorado Diecinueve', '', 'Pan de coco y rosquillas horneadas cada mañana, con café de palo para acompañar.',
   (select panaderias from ref19), (select ceiba from ref19), 'Barrio Ingles', '+50499999999', 'aprobado',
   '{"lun":[{"abre":"00:00","cierra":"23:59"}],"mar":[{"abre":"00:00","cierra":"23:59"}],"mie":[{"abre":"00:00","cierra":"23:59"}],"jue":[{"abre":"00:00","cierra":"23:59"}],"vie":[{"abre":"00:00","cierra":"23:59"}],"sab":[{"abre":"00:00","cierra":"23:59"}],"dom":[{"abre":"00:00","cierra":"23:59"}]}'),
  ('f5555555-5555-5555-5555-555555555555', 'Horno Diecinueve', '', 'Semitas, quesadillas y pan dulce de temporada para toda la familia hondureña.',
   (select panaderias from ref19), (select tela from ref19), null, '+50499999999', 'aprobado', null),
  ('f5555555-5555-5555-5555-555555555555', 'Diecinueve Pendiente', '', 'Todavía en revisión: este negocio no debe aparecer en ninguna búsqueda pública.',
   (select panaderias from ref19), (select ceiba from ref19), null, '+50499999999', 'pendiente', null);
create temp table n19 as select id, nombre from public.businesses where owner_id = 'f5555555-5555-5555-5555-555555555555';
grant select on n19 to anon, authenticated;

-- 1. El documento se llena solo e incluye categoría, ciudad y departamento
select pruebas.t_ok((select bool_and(documento_busqueda is not null) from public.businesses where id in (select id from n19)),
  'documento de búsqueda al crear');
set role anon;
select pruebas.t_ok((select count(*) = 1 from public.buscar_negocios('rosquillas diecinueve')), 'busca por la descripción');
select pruebas.t_ok((select count(*) = 1 from public.buscar_negocios('diecinueve ceiba')), 'busca por nombre + ciudad (texto de dos fuentes)');
select pruebas.t_ok((select count(*) = 2 from public.buscar_negocios('panaderias diecinueve')), 'busca por la categoría');
select pruebas.t_ok((select count(*) = 1 from public.buscar_negocios('diecinueve atlantida ingles')), 'busca por departamento y barrio');
select pruebas.t_ok((select count(*) = 1 from public.buscar_negocios('pan dora')), 'coincide por prefijo (pan dora → Pan Dorado)');
select pruebas.t_ok((select count(*) = 0 from public.buscar_negocios('pendiente diecinueve')), 'no devuelve negocios sin publicar');
reset role;

-- 2. Filtros: categoría padre incluye las hijas; ciudad; slugs inexistentes
set role anon;
select pruebas.t_ok((select count(*) = 2 from public.buscar_negocios('diecinueve', (select padre_slug from ref19))),
  'la categoría padre incluye a sus hijas');
select pruebas.t_ok((select count(*) = 1 from public.buscar_negocios('diecinueve', 'panaderias', 'tela')), 'filtro por ciudad');
select pruebas.t_ok((select count(*) = 0 from public.buscar_negocios(null, 'no-existe')), 'categoría inexistente: nada');
select pruebas.t_ok((select count(*) = 0 from public.buscar_negocios(null, null, 'no-existe')), 'ciudad inexistente: nada');
select pruebas.t_ok((select count(*) = 1 from public.buscar_negocios('diecinueve', p_abierto => true)), 'abierto ahora (24 horas)');
select pruebas.t_ok((select total = 2 from public.buscar_negocios('diecinueve', p_limite => 1) limit 1), 'total cuenta todas las páginas');
select pruebas.t_ok((select count(*) = 1 from public.buscar_negocios('diecinueve', p_limite => 1, p_desplazamiento => 1)), 'desplazamiento');
select pruebas.t_ok((select nombre = 'Pan Dorado Diecinueve' from public.buscar_negocios('dorado diecinueve') limit 1)
  and (select categoria_slug = 'panaderias' and municipio_slug = 'la-ceiba' and departamento_nombre = 'Atlántida'
       from public.buscar_negocios('dorado diecinueve') limit 1), 'devuelve nombres de categoría, ciudad y departamento');
-- Texto con comillas y símbolos: se limpia (no rompe la consulta dinámica)
select pruebas.t_ok((select count(*) = 0 from public.buscar_negocios($$'); drop table public.businesses; --$$)), 'texto malicioso: sin error ni efecto');
select pruebas.t_ok((select count(*) = 0 from public.buscar_negocios(null, $$x' or '1'='1$$)), 'slug malicioso: sin error ni efecto');
reset role;
select pruebas.t_ok(to_regclass('public.businesses') is not null, 'la tabla sigue ahí');

-- 3. Se actualiza al editar y no se puede escribir a mano
set role authenticated; select pruebas.t_como('f5555555-5555-5555-5555-555555555555');
update public.businesses set descripcion = 'Ahora también hacemos marquesote y torta de elote por encargo, todos los días.' where nombre = 'Horno Diecinueve';
update public.businesses set documento_busqueda = to_tsvector('simple', 'gratis barato mejor') where nombre = 'Pan Dorado Diecinueve';
reset role;
set role anon;
select pruebas.t_ok((select count(*) = 1 from public.buscar_negocios('marquesote diecinueve')), 'editar la descripción actualiza la búsqueda');
select pruebas.t_ok((select count(*) = 0 from public.buscar_negocios('gratis barato mejor')), 'el dueño no puede meter palabras a mano en el documento');
reset role;

-- 4. Renombrar la categoría actualiza la búsqueda de sus negocios
update public.categories set nombre = 'Panaderías y reposterías' where id = (select panaderias from ref19);
set role anon;
select pruebas.t_ok((select count(*) = 2 from public.buscar_negocios('reposterias diecinueve')), 'renombrar la categoría actualiza el documento');
reset role;
update public.categories set nombre = 'Panaderías' where id = (select panaderias from ref19);

-- 5. Recientes: ordena por fecha de publicación
update public.businesses set aprobado_en = now() + interval '1 day' where nombre = 'Horno Diecinueve';
set role anon;
select pruebas.t_ok((select nombre = 'Horno Diecinueve' from public.buscar_negocios(null, null, null, 1, 0, 'recientes')),
  'recientes: el publicado más tarde primero');
reset role;
