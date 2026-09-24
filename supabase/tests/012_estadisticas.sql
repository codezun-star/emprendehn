-- Pruebas de la migración 012 (estadísticas por negocio).
\set ON_ERROR_STOP 1

insert into auth.users (id, email) values
  ('66666666-6666-6666-6666-666666666666', 'luis@x.com'),
  ('77777777-7777-7777-7777-777777777777', 'otro@x.com'),
  ('88888888-8888-8888-8888-888888888888', 'admin12@x.com');
update public.profiles set rol = 'admin' where email = 'admin12@x.com';
insert into public.businesses (owner_id, nombre, slug, descripcion, category_id, municipio_id, telefono, estado)
select '66666666-6666-6666-6666-666666666666', x.nombre, '', repeat('Descripción de prueba. ', 3),
       (select id from public.categories limit 1), (select id from public.municipios limit 1), '+50499999999', x.estado
from (values ('Ferretería Luis', 'aprobado'::public.business_status), ('Barbería Luis', 'pendiente')) as x(nombre, estado);
create temp table neg as select id, estado from public.businesses where owner_id = '66666666-6666-6666-6666-666666666666';
grant select on neg to anon, authenticated;

-- 1. Un visitante suma eventos
set role anon; select pruebas.t_como(null);
select public.registrar_evento((select id from neg where estado = 'aprobado'), 'visita');
select public.registrar_evento((select id from neg where estado = 'aprobado'), 'visita');
select public.registrar_evento((select id from neg where estado = 'aprobado'), 'whatsapp');
select public.registrar_evento((select id from neg where estado = 'aprobado'), 'llamada');
select public.registrar_evento((select id from neg where estado = 'pendiente'), 'visita');
do $$ begin
  perform public.registrar_evento((select id from neg where estado = 'aprobado'), 'inventado');
  raise exception 'FALLA: aceptó un evento desconocido';
exception when invalid_parameter_value then raise notice 'OK  evento desconocido: rechazado';
end $$;
do $$ begin
  perform 1 from public.business_stats_daily;
  raise exception 'FALLA: anon leyó estadísticas';
exception when insufficient_privilege then raise notice 'OK  anon no lee estadísticas';
end $$;
reset role;

select pruebas.t_ok((
  select visitas = 2 and whatsapp = 1 and llamadas = 1 and mapa = 0 and redes = 0
     and dia = (now() at time zone 'America/Tegucigalpa')::date
  from public.business_stats_daily where business_id = (select id from neg where estado = 'aprobado')
), 'se suman visitas y clics en una fila por día (hora de Honduras)');
select pruebas.t_ok(not exists (
  select 1 from public.business_stats_daily where business_id = (select id from neg where estado = 'pendiente')
), 'un negocio no publicado no suma');

-- 2. Quién puede leer
set role authenticated; select pruebas.t_como('66666666-6666-6666-6666-666666666666');
select pruebas.t_ok((select count(*) = 1 from public.business_stats_daily), 'el dueño ve sus estadísticas');
do $$ begin
  update public.business_stats_daily set visitas = 1000;
  raise exception 'FALLA: el dueño modificó sus estadísticas';
exception when insufficient_privilege then raise notice 'OK  el dueño no puede inflar sus números';
end $$;
select pruebas.t_como('77777777-7777-7777-7777-777777777777');
select pruebas.t_ok((select count(*) = 0 from public.business_stats_daily), 'otro usuario no ve estadísticas ajenas');
select pruebas.t_como('88888888-8888-8888-8888-888888888888');
select pruebas.t_ok((select count(*) >= 1 from public.business_stats_daily), 'el admin ve todas');
reset role;
