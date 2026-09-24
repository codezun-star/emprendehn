-- Pruebas de la migración 016 (ubicación exacta en el mapa).
\set ON_ERROR_STOP 1

insert into auth.users (id, email) values ('e1111111-1111-1111-1111-111111111111', 'mapa@x.com');
insert into public.businesses (owner_id, nombre, slug, descripcion, category_id, municipio_id, telefono, estado)
select 'e1111111-1111-1111-1111-111111111111', x.nombre, '', repeat('Descripción de prueba. ', 3),
       (select id from public.categories limit 1), (select id from public.municipios limit 1), '+50499999999', x.estado
from (values ('Pulpería del Mapa', 'aprobado'::public.business_status), ('Taller del Mapa', 'pendiente')) as x(nombre, estado);
create temp table neg as select id, estado from public.businesses where owner_id = 'e1111111-1111-1111-1111-111111111111';
grant select on neg to authenticated;

set role authenticated; select pruebas.t_como('e1111111-1111-1111-1111-111111111111');

-- 1. Coordenadas válidas en Tegucigalpa y enlace de Google Maps
update public.businesses set latitud = 14.0818, longitud = -87.2068, enlace_mapa = 'https://maps.app.goo.gl/AbCdEf123'
where id = (select id from neg where estado = 'aprobado');
update public.businesses set latitud = 15.7597, longitud = -86.7822 where id = (select id from neg where estado = 'pendiente');
reset role;
select pruebas.t_ok((select latitud = 14.0818 and enlace_mapa like 'https://maps.app.goo.gl/%'
  from public.businesses where id = (select id from neg where estado = 'aprobado')), 'se guardan el pin y el enlace de Google Maps');
select pruebas.t_ok((select 'ubicacion' = any(cambios_por_revisar) from public.businesses where id = (select id from neg where estado = 'aprobado')),
  'negocio publicado: mover el pin queda en "Cambios por revisar"');
select pruebas.t_ok((select cambios_por_revisar = '{}' from public.businesses where id = (select id from neg where estado = 'pendiente')),
  'negocio pendiente: no marca cambios');

-- 2. Restricciones
set role authenticated; select pruebas.t_como('e1111111-1111-1111-1111-111111111111');
do $$ begin
  update public.businesses set latitud = 40.4, longitud = -3.7 where id = (select id from neg where estado = 'pendiente');
  raise exception 'FALLA: aceptó coordenadas fuera de Honduras';
exception when check_violation then raise notice 'OK  coordenadas fuera de Honduras: rechazadas';
end $$;
do $$ begin
  update public.businesses set latitud = 14.1, longitud = null where id = (select id from neg where estado = 'pendiente');
  raise exception 'FALLA: aceptó latitud sin longitud';
exception when check_violation then raise notice 'OK  latitud y longitud van juntas';
end $$;
do $$ begin
  update public.businesses set enlace_mapa = 'https://sitio-malicioso.com/maps' where id = (select id from neg where estado = 'pendiente');
  raise exception 'FALLA: aceptó un enlace que no es de Google Maps';
exception when check_violation then raise notice 'OK  enlace_mapa solo acepta Google Maps';
end $$;
do $$ begin
  update public.businesses set enlace_mapa = 'https://google.com.evil.com/maps/x' where id = (select id from neg where estado = 'pendiente');
  raise exception 'FALLA: aceptó google.com.evil.com';
exception when check_violation then raise notice 'OK  rechaza dominios que solo empiezan como Google (google.com.evil.com)';
end $$;
update public.businesses set enlace_mapa = 'https://www.google.com/maps/place/Pulper%C3%ADa/@14.08,-87.20,17z'
where id = (select id from neg where estado = 'pendiente');
update public.businesses set enlace_mapa = null, latitud = null, longitud = null where id = (select id from neg where estado = 'pendiente');
reset role;
select pruebas.t_ok((select latitud is null and enlace_mapa is null from public.businesses where id = (select id from neg where estado = 'pendiente')),
  'se acepta google.com/maps y se puede quitar la ubicación');

-- 3. El guardián de 015 sigue vigente
set role authenticated; select pruebas.t_como('e1111111-1111-1111-1111-111111111111');
do $$ begin
  update public.businesses set total_resenas = 50 where id = (select id from neg where estado = 'aprobado');
  raise exception 'FALLA: el dueño cambió su total de reseñas';
exception when insufficient_privilege then raise notice 'OK  el dueño sigue sin poder tocar su calificación';
end $$;
reset role;
