-- =============================================================================
-- 013 · Filtro "Abierto ahora" en la búsqueda
-- -----------------------------------------------------------------------------
-- · esta_abierto(horario, momento): misma regla que el indicador "Abierto ahora"
--   de la página del negocio (components/directorio/estado-abierto.tsx), en hora
--   de Honduras e incluyendo turnos que cruzan la medianoche (18:00–02:00).
-- · buscar_negocios gana el parámetro p_abierto (reemplaza la versión de 009).
-- Idempotente. Requiere: 009
-- =============================================================================

create or replace function public.esta_abierto(
  p_horario jsonb,
  p_momento timestamptz default now()
)
returns boolean
language sql
stable
set search_path = ''
as $$
  with ahora as (
    select
      to_char(p_momento at time zone 'America/Tegucigalpa', 'HH24:MI') as hora,
      extract(isodow from p_momento at time zone 'America/Tegucigalpa')::int as dia -- 1 = lunes
  ),
  dias as (
    select
      hora,
      (array['lun', 'mar', 'mie', 'jue', 'vie', 'sab', 'dom'])[dia] as hoy,
      (array['lun', 'mar', 'mie', 'jue', 'vie', 'sab', 'dom'])[((dia + 5) % 7) + 1] as ayer
    from ahora
  ),
  turnos as (
    select d.hora, 'hoy' as cual, t ->> 'abre' as abre, t ->> 'cierra' as cierra
    from dias d
    cross join lateral jsonb_array_elements(
      case when jsonb_typeof(p_horario -> d.hoy) = 'array' then p_horario -> d.hoy else '[]'::jsonb end
    ) as t
    union all
    select d.hora, 'ayer', t ->> 'abre', t ->> 'cierra'
    from dias d
    cross join lateral jsonb_array_elements(
      case when jsonb_typeof(p_horario -> d.ayer) = 'array' then p_horario -> d.ayer else '[]'::jsonb end
    ) as t
  )
  select coalesce(bool_or(
    case
      -- Turno de hoy (si cierra "antes" de abrir, cruza la medianoche).
      when cual = 'hoy' then
        case when cierra > abre then hora >= abre and hora < cierra else hora >= abre end
      -- Turno de ayer que sigue abierto después de medianoche.
      else cierra < abre and hora < cierra
    end
  ), false)
  from turnos
  where abre ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' and cierra ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$';
$$;

comment on function public.esta_abierto(jsonb, timestamptz) is
  'true si el horario (formato de businesses.horario) está abierto en ese momento, en hora de Honduras.';

-- La firma cambia (nuevo parámetro): se elimina la versión de 009 (y la propia,
-- por si 015 ya le cambió el tipo de retorno y esta migración se vuelve a aplicar).
drop function if exists public.buscar_negocios(text, text, text, int, int, text);
drop function if exists public.buscar_negocios(text, text, text, int, int, text, boolean);

create or replace function public.buscar_negocios(
  p_texto          text default null,
  p_categoria      text default null,
  p_ciudad         text default null,
  p_limite         int  default 24,
  p_desplazamiento int  default 0,
  p_orden          text default 'relevancia', -- 'relevancia' | 'recientes'
  p_abierto        boolean default false      -- true: solo los abiertos ahora (hora de Honduras)
)
returns table (
  id                  uuid,
  nombre              text,
  slug                text,
  descripcion         text,
  localidad           text,
  plan                text,
  categoria_nombre    text,
  categoria_slug      text,
  municipio_nombre    text,
  municipio_slug      text,
  departamento_nombre text,
  portada_path        text,
  logo_path           text,
  total               bigint
)
language sql
stable
set search_path = ''
as $$
  with q as (
    select public.construir_tsquery(p_texto) as tsq
  ),
  base as (
    select
      b.id, b.nombre, b.slug, b.descripcion, b.localidad, b.plan, b.logo_path, b.aprobado_en,
      c.nombre as categoria_nombre, c.slug as categoria_slug,
      m.nombre as municipio_nombre, m.slug as municipio_slug,
      d.nombre as departamento_nombre,
      pl.prioridad,
      b.search_vector || to_tsvector(
        'public.es_unaccent',
        c.nombre || ' ' || coalesce(cp.nombre, '') || ' ' || m.nombre || ' ' || d.nombre
      ) as documento
    from public.businesses b
    join public.categories c        on c.id = b.category_id
    left join public.categories cp  on cp.id = c.parent_id
    join public.municipios m        on m.id = b.municipio_id
    join public.departamentos d     on d.id = m.departamento_id
    join public.plans pl            on pl.code = b.plan
    where b.estado = 'aprobado'
      and (p_categoria is null or c.slug = p_categoria or cp.slug = p_categoria)
      and (p_ciudad is null or m.slug = p_ciudad)
      and (not coalesce(p_abierto, false) or public.esta_abierto(b.horario))
  ),
  filtrados as (
    select base.*,
      case when q.tsq is null then 0 else ts_rank(base.documento, q.tsq) end as rango
    from base
    cross join q
    where q.tsq is null or base.documento @@ q.tsq
  )
  select
    f.id, f.nombre, f.slug, f.descripcion, f.localidad, f.plan,
    f.categoria_nombre, f.categoria_slug,
    f.municipio_nombre, f.municipio_slug, f.departamento_nombre,
    (
      select i.storage_path from public.business_images i
      where i.business_id = f.id
      order by i.orden, i.created_at
      limit 1
    ) as portada_path,
    f.logo_path,
    count(*) over () as total
  from filtrados f
  order by
    case when p_orden = 'recientes' then f.aprobado_en end desc nulls last,
    f.rango desc,
    f.prioridad desc,
    f.nombre
  limit least(greatest(coalesce(p_limite, 24), 1), 100)
  offset greatest(coalesce(p_desplazamiento, 0), 0);
$$;

comment on function public.buscar_negocios(text, text, text, int, int, text, boolean) is
  'Busca negocios aprobados por texto, categoría (slug, incluye subcategorías), ciudad (slug de municipio) y, opcionalmente, solo los abiertos ahora.';
