-- Pruebas de la migración 013 ("Abierto ahora"). Honduras = UTC-6 sin horario de verano.
-- 2026-09-21 fue lunes.
\set ON_ERROR_STOP 1

select pruebas.t_ok(public.esta_abierto('{"lun":[{"abre":"08:00","cierra":"17:00"}]}', '2026-09-21 10:00-06'), 'lunes 10:00 dentro de 08:00–17:00: abierto');
select pruebas.t_ok(not public.esta_abierto('{"lun":[{"abre":"08:00","cierra":"17:00"}]}', '2026-09-21 17:00-06'), 'lunes 17:00 (hora de cierre): cerrado');
select pruebas.t_ok(not public.esta_abierto('{"lun":[{"abre":"08:00","cierra":"17:00"}]}', '2026-09-22 10:00-06'), 'martes sin turnos: cerrado');
select pruebas.t_ok(public.esta_abierto('{"lun":[{"abre":"08:00","cierra":"17:00"}]}', '2026-09-21 16:00+00'), 'usa la hora de Honduras (16:00 UTC = 10:00 HN)');
select pruebas.t_ok(public.esta_abierto('{"lun":[{"abre":"08:00","cierra":"12:00"},{"abre":"14:00","cierra":"18:00"}]}', '2026-09-21 15:00-06'), 'turno partido: 15:00 abierto');
select pruebas.t_ok(not public.esta_abierto('{"lun":[{"abre":"08:00","cierra":"12:00"},{"abre":"14:00","cierra":"18:00"}]}', '2026-09-21 13:00-06'), 'turno partido: 13:00 cerrado');
select pruebas.t_ok(public.esta_abierto('{"vie":[{"abre":"18:00","cierra":"02:00"}]}', '2026-09-25 23:00-06'), 'viernes 23:00 en turno 18:00–02:00: abierto');
select pruebas.t_ok(public.esta_abierto('{"vie":[{"abre":"18:00","cierra":"02:00"}]}', '2026-09-26 01:30-06'), 'sábado 01:30, sigue el turno del viernes: abierto');
select pruebas.t_ok(not public.esta_abierto('{"vie":[{"abre":"18:00","cierra":"02:00"}]}', '2026-09-26 02:30-06'), 'sábado 02:30: cerrado');
select pruebas.t_ok(public.esta_abierto('{"dom":[{"abre":"20:00","cierra":"01:00"}]}', '2026-09-21 00:30-06'), 'lunes 00:30, sigue el turno del domingo: abierto');
select pruebas.t_ok(not public.esta_abierto(null, '2026-09-21 10:00-06'), 'sin horario: cerrado');
select pruebas.t_ok(not public.esta_abierto('{"lun":[{"abre":"8am","cierra":"5pm"}]}', '2026-09-21 10:00-06'), 'formato inválido: se ignora');
select pruebas.t_ok(not public.esta_abierto('{"lun":"08:00-17:00"}', '2026-09-21 10:00-06'), 'día que no es lista: se ignora');

-- buscar_negocios con p_abierto
insert into auth.users (id, email) values ('99999999-9999-9999-9999-999999999999', 'horarios@x.com');
insert into public.businesses (owner_id, nombre, slug, descripcion, category_id, municipio_id, telefono, estado, horario)
select '99999999-9999-9999-9999-999999999999', x.nombre, '', repeat('Descripción de prueba. ', 3),
       (select id from public.categories limit 1), (select id from public.municipios limit 1), '+50499999999', 'aprobado', x.horario::jsonb
from (values
  ('Siempre Abierto', (select jsonb_object_agg(d, '[{"abre":"00:00","cierra":"23:59"},{"abre":"23:59","cierra":"00:00"}]'::jsonb)
                       from unnest(array['lun','mar','mie','jue','vie','sab','dom']) d)::text),
  ('Nunca Abierto', null)
) as x(nombre, horario);

set role anon;
select pruebas.t_ok((select count(*) = 1 and bool_and(nombre = 'Siempre Abierto')
  from public.buscar_negocios(p_texto => 'abierto', p_abierto => true)), 'buscar con p_abierto: solo los abiertos ahora');
select pruebas.t_ok((select count(*) = 2 from public.buscar_negocios(p_texto => 'abierto')), 'buscar sin p_abierto: todos');
reset role;
