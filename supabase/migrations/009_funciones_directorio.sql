-- =============================================================================
-- 009 · Funciones de consulta del directorio (RPC)
-- -----------------------------------------------------------------------------
-- · construir_tsquery(texto): convierte lo que escribe el usuario en una
--   consulta full-text segura con prefijos ("pupu" encuentra "pupusería").
-- · buscar_negocios(...): búsqueda + filtros por categoría (incluye
--   subcategorías) y ciudad, ordenada por relevancia y prioridad del plan
--   (o por más recientes con p_orden = 'recientes').
--   También busca en el nombre de la categoría y de la ciudad
--   ("panaderías tegucigalpa" funciona).
-- · resumen_directorio(...): conteo de negocios aprobados por
--   categoría (padre e hija) y ciudad. Alimenta los enlaces internos
--   "Panaderías en San Pedro Sula (12)" y el sitemap.
-- Todas son SECURITY INVOKER: respetan RLS y además filtran estado = 'aprobado'.
-- Requiere: 006, 007
-- =============================================================================

create or replace function public.construir_tsquery(p_texto text)
returns tsquery
language sql
stable
set search_path = ''
as $$
  select case
    when palabras is null then null
    else to_tsquery('public.es_unaccent', palabras)
  end
  from (
    select string_agg(palabra || ':*', ' & ') as palabras
    from (
      select palabra
      from regexp_split_to_table(
        lower(extensions.unaccent('extensions.unaccent'::regdictionary, coalesce(p_texto, ''))),
        '[^a-z0-9]+'
      ) as palabra
      where palabra <> ''
      limit 8
    ) p
  ) s;
$$;

create or replace function public.buscar_negocios(
  p_texto          text default null,
  p_categoria      text default null,
  p_ciudad         text default null,
  p_limite         int  default 24,
  p_desplazamiento int  default 0,
  p_orden          text default 'relevancia'  -- 'relevancia' | 'recientes'
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

comment on function public.buscar_negocios(text, text, text, int, int, text) is
  'Busca negocios aprobados por texto, categoría (slug, incluye subcategorías) y ciudad (slug de municipio).';

create or replace function public.resumen_directorio(p_categoria text default null)
returns table (
  categoria_slug   text,
  municipio_slug   text,
  municipio_nombre text,
  total            bigint,
  actualizado      timestamptz
)
language sql
stable
set search_path = ''
as $$
  select
    cat.slug,
    m.slug,
    m.nombre,
    count(*),
    max(b.updated_at)
  from public.businesses b
  join public.categories c       on c.id = b.category_id
  left join public.categories cp on cp.id = c.parent_id
  join public.municipios m       on m.id = b.municipio_id
  cross join lateral (values (c.slug), (cp.slug)) as cat(slug)
  where b.estado = 'aprobado'
    and cat.slug is not null
    and (p_categoria is null or cat.slug = p_categoria)
  group by cat.slug, m.slug, m.nombre;
$$;

comment on function public.resumen_directorio(text) is
  'Negocios aprobados por categoría (padre e hija) y ciudad. Para enlaces internos y sitemap.';
