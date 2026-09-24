-- Pruebas de la migración 015 (reseñas y calificaciones).
\set ON_ERROR_STOP 1

insert into auth.users (id, email, raw_user_meta_data) values
  ('c1111111-1111-1111-1111-111111111111', 'dueno15@x.com', '{"nombre_completo":"Carlos Dueño"}'),
  ('c2222222-2222-2222-2222-222222222222', 'cliente@x.com', '{"nombre_completo":"María José López"}'),
  ('c3333333-3333-3333-3333-333333333333', 'otro15@x.com', '{}'),
  ('c4444444-4444-4444-4444-444444444444', 'admin15@x.com', '{}');
update public.profiles set rol = 'admin' where id = 'c4444444-4444-4444-4444-444444444444';
insert into public.businesses (owner_id, nombre, slug, descripcion, category_id, municipio_id, telefono, estado)
select 'c1111111-1111-1111-1111-111111111111', x.nombre, '', repeat('Descripción de prueba. ', 3),
       (select id from public.categories limit 1), (select id from public.municipios limit 1), '+50499999999', x.estado
from (values ('Café Carlos', 'aprobado'::public.business_status), ('Taller Carlos', 'pendiente')) as x(nombre, estado);
create temp table neg as select id, estado from public.businesses where owner_id = 'c1111111-1111-1111-1111-111111111111';
grant select on neg to anon, authenticated;
create temp view cafe as select id from neg where estado = 'aprobado';
grant select on cafe to anon, authenticated;

-- 1. Un cliente reseña; se guarda "María L." y se actualiza el promedio
set role authenticated; select pruebas.t_como('c2222222-2222-2222-2222-222222222222');
insert into public.business_reviews (business_id, calificacion, comentario) select id, 5, '  Excelente café  ' from cafe;
reset role;
select pruebas.t_ok((select autor_nombre = 'María J.' and comentario = 'Excelente café' and user_id = 'c2222222-2222-2222-2222-222222222222'
  from public.business_reviews where business_id = (select id from cafe)), 'reseña creada: autor "María J." y comentario recortado');
select pruebas.t_ok((select total_resenas = 1 and calificacion_promedio = 5.0 from public.businesses where id = (select id from cafe)),
  'promedio y total actualizados (5.0, 1)');

-- 2. Reglas al crear
set role authenticated; select pruebas.t_como('c2222222-2222-2222-2222-222222222222');
do $$ begin
  insert into public.business_reviews (business_id, calificacion) select id, 4 from cafe;
  raise exception 'FALLA: dos reseñas del mismo usuario';
exception when unique_violation then raise notice 'OK  una sola reseña por usuario y negocio';
end $$;
do $$ begin
  insert into public.business_reviews (business_id, calificacion) select id, 4 from neg where estado = 'pendiente';
  raise exception 'FALLA: reseñó un negocio no publicado';
exception when raise_exception then
  if sqlerrm like 'FALLA%' then raise; end if; raise notice 'OK  no se reseñan negocios no publicados';
end $$;
do $$ begin
  insert into public.business_reviews (business_id, calificacion) select id, 9 from cafe;
  raise exception 'FALLA: aceptó 9 estrellas';
exception when check_violation or unique_violation then raise notice 'OK  la calificación va de 1 a 5';
end $$;
select pruebas.t_como('c1111111-1111-1111-1111-111111111111');
do $$ begin
  insert into public.business_reviews (business_id, calificacion) select id, 5 from cafe;
  raise exception 'FALLA: el dueño reseñó su propio negocio';
exception when raise_exception then
  if sqlerrm like 'FALLA%' then raise; end if; raise notice 'OK  el dueño no reseña su propio negocio';
end $$;
select pruebas.t_como('c3333333-3333-3333-3333-333333333333');
do $$ begin
  insert into public.business_reviews (business_id, calificacion, user_id)
  select id, 2, 'c2222222-2222-2222-2222-222222222222' from cafe;
  raise exception 'FALLA: se pudo indicar el user_id';
exception when insufficient_privilege then raise notice 'OK  no se puede indicar el user_id (no se suplanta a nadie)';
end $$;
insert into public.business_reviews (business_id, calificacion, comentario) select id, 2, 'Lento' from cafe;
reset role;
select pruebas.t_ok((select count(*) = 1 from public.business_reviews where user_id = 'c3333333-3333-3333-3333-333333333333'),
  'user_id sale de la sesión');
select pruebas.t_ok((select autor_nombre = 'otro15' from public.business_reviews where user_id = 'c3333333-3333-3333-3333-333333333333'),
  'sin nombre en el perfil: se usa la parte local del correo');
select pruebas.t_ok((select total_resenas = 2 and calificacion_promedio = 3.5 from public.businesses where id = (select id from cafe)),
  'promedio con dos reseñas: 3.5');

-- 3. Quién edita qué
set role authenticated; select pruebas.t_como('c2222222-2222-2222-2222-222222222222');
update public.business_reviews set calificacion = 4 where user_id = 'c2222222-2222-2222-2222-222222222222';
do $$ begin
  update public.business_reviews set respuesta = 'Hola' where user_id = 'c2222222-2222-2222-2222-222222222222';
  raise exception 'FALLA: el autor respondió como dueño';
exception when insufficient_privilege then raise notice 'OK  el autor no puede escribir la respuesta del dueño';
end $$;
update public.business_reviews set calificacion = 1 where user_id = 'c3333333-3333-3333-3333-333333333333';
select pruebas.t_como('c1111111-1111-1111-1111-111111111111');
update public.business_reviews set respuesta = '¡Gracias por venir!' where user_id = 'c2222222-2222-2222-2222-222222222222';
update public.business_reviews set reportada = true where user_id = 'c3333333-3333-3333-3333-333333333333';
do $$ begin
  update public.business_reviews set calificacion = 5 where user_id = 'c3333333-3333-3333-3333-333333333333';
  raise exception 'FALLA: el dueño cambió la calificación';
exception when insufficient_privilege then raise notice 'OK  el dueño no puede cambiar calificaciones';
end $$;
do $$ begin
  update public.business_reviews set estado = 'oculta' where user_id = 'c3333333-3333-3333-3333-333333333333';
  raise exception 'FALLA: el dueño ocultó una reseña';
exception when insufficient_privilege then raise notice 'OK  el dueño no puede ocultar reseñas';
end $$;
do $$ begin
  update public.businesses set calificacion_promedio = 5, total_resenas = 99 where owner_id = 'c1111111-1111-1111-1111-111111111111';
  raise exception 'FALLA: el dueño infló su calificación';
exception when insufficient_privilege then raise notice 'OK  el dueño no puede tocar su calificación';
end $$;
reset role;
select pruebas.t_ok((select calificacion = 4 from public.business_reviews where user_id = 'c2222222-2222-2222-2222-222222222222'),
  'el autor edita su calificación');
select pruebas.t_ok((select calificacion = 2 from public.business_reviews where user_id = 'c3333333-3333-3333-3333-333333333333'),
  'un usuario no edita reseñas ajenas (RLS: 0 filas)');
select pruebas.t_ok((select respuesta = '¡Gracias por venir!' and respondida_en is not null
  from public.business_reviews where user_id = 'c2222222-2222-2222-2222-222222222222'), 'el dueño responde (con fecha)');
select pruebas.t_ok((select reportada from public.business_reviews where user_id = 'c3333333-3333-3333-3333-333333333333'),
  'el dueño reporta una reseña');

-- 4. El admin oculta: deja de contar y de verse en público
set role authenticated; select pruebas.t_como('c4444444-4444-4444-4444-444444444444');
update public.business_reviews set estado = 'oculta', reportada = false where user_id = 'c3333333-3333-3333-3333-333333333333';
reset role;
select pruebas.t_ok((select total_resenas = 1 and calificacion_promedio = 4.0 from public.businesses where id = (select id from cafe)),
  'reseña oculta: no cuenta en el promedio');
set role anon; select pruebas.t_como(null);
select pruebas.t_ok((select count(*) = 1 from public.business_reviews), 'en público solo se ven las publicadas');
reset role;
set role authenticated; select pruebas.t_como('c3333333-3333-3333-3333-333333333333');
select pruebas.t_ok((select count(*) = 2 from public.business_reviews where business_id = (select id from cafe)),
  'el autor sigue viendo su reseña oculta');
reset role;

-- 5. Borrar: el autor borra la suya; eliminar la cuenta borra sus reseñas
set role authenticated; select pruebas.t_como('c2222222-2222-2222-2222-222222222222');
delete from public.business_reviews where user_id = 'c2222222-2222-2222-2222-222222222222';
reset role;
select pruebas.t_ok((select total_resenas = 0 and calificacion_promedio is null from public.businesses where id = (select id from cafe)),
  'sin reseñas publicadas: total 0 y promedio null');
delete from auth.users where id = 'c3333333-3333-3333-3333-333333333333';
select pruebas.t_ok(not exists (select 1 from public.business_reviews where user_id = 'c3333333-3333-3333-3333-333333333333'),
  'al eliminar la cuenta se borran sus reseñas');

-- 6. buscar_negocios devuelve la calificación
set role authenticated; select pruebas.t_como('c2222222-2222-2222-2222-222222222222');
insert into public.business_reviews (business_id, calificacion) select id, 3 from cafe;
reset role;
set role anon;
select pruebas.t_ok((select calificacion_promedio = 3.0 and total_resenas = 1 from public.buscar_negocios(p_texto => 'Café Carlos') limit 1),
  'buscar_negocios incluye promedio y total');
reset role;

-- 7. Límite diario (10 por usuario cada 24 h)
insert into public.businesses (owner_id, nombre, slug, descripcion, category_id, municipio_id, telefono, estado)
select 'c1111111-1111-1111-1111-111111111111', 'Negocio límite ' || g, '', repeat('Descripción de prueba. ', 3),
       (select id from public.categories limit 1), (select id from public.municipios limit 1), '+50499999999', 'aprobado'
from generate_series(1, 10) g;
set role authenticated; select pruebas.t_como('c2222222-2222-2222-2222-222222222222');
insert into public.business_reviews (business_id, calificacion)
select id, 4 from public.businesses where nombre like 'Negocio límite %' and nombre <> 'Negocio límite 10';
do $$ begin
  insert into public.business_reviews (business_id, calificacion)
  select id, 4 from public.businesses where nombre = 'Negocio límite 10';
  raise exception 'FALLA: se permitió la reseña 11 del día';
exception when raise_exception then
  if sqlerrm like 'FALLA%' then raise; end if; raise notice 'OK  límite de 10 reseñas al día';
end $$;
reset role;
