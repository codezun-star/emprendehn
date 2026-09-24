-- =============================================================================
-- 019 · Rendimiento: búsqueda con índice y listados más livianos
-- -----------------------------------------------------------------------------
-- Medido con 30 000 negocios publicados (ver docs/arquitectura.md):
-- · buscar_negocios armaba el documento de búsqueda (negocio + categoría +
--   ciudad) de TODOS los negocios en cada llamada, sin poder usar el índice:
--   ~800 ms por búsqueda y ~500 ms para "recientes" o "todos".
-- · Ahora el documento se guarda en businesses.documento_busqueda (trigger)
--   con un índice GIN parcial (solo publicados), y la función filtra y ordena
--   solo con columnas de businesses; nombres de categoría/ciudad y portada se
--   buscan después, únicamente para las filas de la página.
-- · Índices para el admin: publicados por última actualización y reseñas
--   recientes (crecen con el sitio).
-- · Se quita el índice de search_vector (ya nadie lo consulta); la columna
--   generada queda por compatibilidad.
-- Idempotente. Requiere: 006, 009, 013, 015
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Documento de búsqueda (mismos pesos que antes: nombre A, descripción B,
-- barrio C; categoría, categoría padre, ciudad y departamento D)
-- -----------------------------------------------------------------------------
alter table public.businesses add column if not exists documento_busqueda tsvector;

comment on column public.businesses.documento_busqueda is
  'Texto de búsqueda: nombre, descripción, barrio, categoría (y su padre), ciudad y departamento. Lo mantiene un trigger; no se escribe a mano.';

create or replace function public.documento_negocio(
  p_nombre      text,
  p_descripcion text,
  p_localidad   text,
  p_categoria   uuid,
  p_municipio   smallint
)
returns tsvector
language sql
stable
set search_path = ''
as $$
  select
    setweight(to_tsvector('public.es_unaccent', coalesce(p_nombre, '')), 'A') ||
    setweight(to_tsvector('public.es_unaccent', coalesce(p_descripcion, '')), 'B') ||
    setweight(to_tsvector('public.es_unaccent', coalesce(p_localidad, '')), 'C') ||
    to_tsvector(
      'public.es_unaccent',
      concat_ws(' ', c.nombre, cp.nombre, m.nombre, d.nombre)
    )
  from (select 1) as uno
  left join public.categories c    on c.id = p_categoria
  left join public.categories cp   on cp.id = c.parent_id
  left join public.municipios m    on m.id = p_municipio
  left join public.departamentos d on d.id = m.departamento_id;
$$;

-- Se recalcula al crear, cuando cambia algo que lo compone y ante cualquier
-- intento de escribirlo directo (el valor enviado se descarta).
create or replace function public.businesses_documento_busqueda()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE'
     and new.nombre is not distinct from old.nombre
     and new.descripcion is not distinct from old.descripcion
     and new.localidad is not distinct from old.localidad
     and new.category_id is not distinct from old.category_id
     and new.municipio_id is not distinct from old.municipio_id
     and new.documento_busqueda is not distinct from old.documento_busqueda
     and new.documento_busqueda is not null then
    return new;
  end if;
  new.documento_busqueda := public.documento_negocio(
    new.nombre, new.descripcion, new.localidad, new.category_id, new.municipio_id
  );
  return new;
end;
$$;

-- Después del guardián (10) y del slug (20), antes de updated_at (30).
drop trigger if exists businesses_25_documento_busqueda on public.businesses;
create trigger businesses_25_documento_busqueda
  before insert or update on public.businesses
  for each row execute function public.businesses_documento_busqueda();

-- Si el admin renombra una categoría o la mueve de padre, actualizar el
-- documento de sus negocios (y los de sus subcategorías).
create or replace function public.categories_refrescar_documentos()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.businesses b
  set documento_busqueda = null
  where b.category_id = new.id
     or b.category_id in (select c.id from public.categories c where c.parent_id = new.id);
  return null;
end;
$$;

drop trigger if exists categories_30_refrescar_documentos on public.categories;
create trigger categories_30_refrescar_documentos
  after update of nombre, parent_id on public.categories
  for each row
  when (old.nombre is distinct from new.nombre or old.parent_id is distinct from new.parent_id)
  execute function public.categories_refrescar_documentos();

-- Llenar los que falten sin tocar updated_at (no son cambios del dueño).
alter table public.businesses disable trigger businesses_30_set_updated_at;
update public.businesses set documento_busqueda = null where documento_busqueda is null;
alter table public.businesses enable trigger businesses_30_set_updated_at;

create index if not exists businesses_documento_busqueda_idx
  on public.businesses using gin (documento_busqueda)
  where estado = 'aprobado';

drop index if exists public.businesses_search_idx;

-- -----------------------------------------------------------------------------
-- Índices del admin
-- -----------------------------------------------------------------------------
-- Listado por estado ordenado por última actualización (publicados, rechazados, suspendidos)
create index if not exists businesses_estado_actualizado_idx
  on public.businesses (estado, updated_at desc);
-- Reseñas recientes de todo el sitio
create index if not exists business_reviews_recientes_idx
  on public.business_reviews (created_at desc);

-- -----------------------------------------------------------------------------
-- buscar_negocios (reemplaza la de 015): misma firma y mismos resultados.
-- -----------------------------------------------------------------------------
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
  id                    uuid,
  nombre                text,
  slug                  text,
  descripcion           text,
  localidad             text,
  plan                  text,
  categoria_nombre      text,
  categoria_slug        text,
  municipio_nombre      text,
  municipio_slug        text,
  departamento_nombre   text,
  portada_path          text,
  logo_path             text,
  calificacion_promedio numeric,
  total_resenas         int,
  total                 bigint
)
language plpgsql
stable
set search_path = ''
as $$
declare
  tsq        tsquery := public.construir_tsquery(p_texto);
  categorias uuid[];
  municipio  smallint;
begin
  -- Filtros resueltos antes (tablas chicas): la categoría incluye sus hijas.
  if p_categoria is not null then
    select array_agg(c.id) into categorias
    from public.categories c
    where c.slug = p_categoria
       or c.parent_id = (select p.id from public.categories p where p.slug = p_categoria);
    if categorias is null then return; end if;
  end if;
  if p_ciudad is not null then
    select m.id into municipio from public.municipios m where m.slug = p_ciudad;
    if municipio is null then return; end if;
  end if;

  -- SQL dinámico con valores literales: el planificador ve los filtros reales
  -- y usa el índice que corresponde (GIN del texto, categoría/ciudad o recientes).
  return query execute format($q$
    with pagina as (
      select b.id, b.nombre, b.aprobado_en, %1$s as rango, pl.prioridad,
             count(*) over () as total
      from public.businesses b
      join public.plans pl on pl.code = b.plan
      where b.estado = 'aprobado' %2$s %3$s %4$s %5$s
      order by %6$s %1$s desc, pl.prioridad desc, b.nombre
      limit %7$s offset %8$s
    )
    select b.id, b.nombre, b.slug, b.descripcion, b.localidad, b.plan,
           c.nombre, c.slug, m.nombre, m.slug, d.nombre,
           (select i.storage_path from public.business_images i
             where i.business_id = b.id order by i.orden, i.created_at limit 1),
           b.logo_path, b.calificacion_promedio, b.total_resenas, p.total
    from pagina p
    join public.businesses b    on b.id = p.id
    join public.categories c    on c.id = b.category_id
    join public.municipios m    on m.id = b.municipio_id
    join public.departamentos d on d.id = m.departamento_id
    order by %9$s p.rango desc, p.prioridad desc, p.nombre
  $q$,
    case when tsq is null then '0::real' else format('ts_rank(b.documento_busqueda, %L::tsquery)', tsq) end,
    case when tsq is null then '' else format('and b.documento_busqueda @@ %L::tsquery', tsq) end,
    case when categorias is null then '' else format('and b.category_id = any(%L::uuid[])', categorias) end,
    case when municipio is null then '' else format('and b.municipio_id = %s', municipio) end,
    case when coalesce(p_abierto, false) then 'and public.esta_abierto(b.horario)' else '' end,
    case when p_orden = 'recientes' then 'b.aprobado_en desc nulls last,' else '' end,
    least(greatest(coalesce(p_limite, 24), 1), 100),
    greatest(coalesce(p_desplazamiento, 0), 0),
    case when p_orden = 'recientes' then 'p.aprobado_en desc nulls last,' else '' end
  );
end;
$$;
