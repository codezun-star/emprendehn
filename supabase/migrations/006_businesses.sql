-- =============================================================================
-- 006 · Negocios
-- -----------------------------------------------------------------------------
-- · Enum business_status (pendiente | aprobado | rechazado | suspendido)
-- · Tabla businesses con búsqueda full-text (columna generada search_vector)
-- · Trigger "guardián": solo el admin cambia estado, plan, motivo_estado,
--   aprobado_en, owner_id y slug. RLS es por fila; esto lo complementa por columna.
--   - INSERT de un no-admin: fuerza estado=pendiente, plan=gratis, owner=auth.uid()
--     y limita a 3 negocios por cuenta (anti-spam).
--   - UPDATE de un negocio "rechazado" por su dueño: vuelve a "pendiente"
--     (reenvío automático a revisión).
-- · Trigger de slug único (ver generar_slug_negocio)
-- · Índices parciales para listados por categoría + ciudad
-- · RLS: público ve aprobados; dueño ve/edita/elimina los suyos; admin todo
-- Requiere: 001–005
-- =============================================================================

do $$
begin
  if not exists (select 1 from pg_type where typname = 'business_status' and typnamespace = 'public'::regnamespace) then
    create type public.business_status as enum ('pendiente', 'aprobado', 'rechazado', 'suspendido');
  end if;
end
$$;

create table if not exists public.businesses (
  id             uuid primary key default gen_random_uuid(),
  owner_id       uuid not null references public.profiles (id) on delete cascade,
  nombre         text not null check (char_length(trim(nombre)) between 2 and 100),
  slug           text not null unique
                 check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 120),
  descripcion    text not null check (char_length(descripcion) between 30 and 3000),
  category_id    uuid not null references public.categories (id) on delete restrict,
  municipio_id   smallint not null references public.municipios (id) on delete restrict,
  localidad      text check (char_length(localidad) <= 100),
  direccion      text check (char_length(direccion) <= 300),
  telefono       text check (telefono ~ '^\+504[0-9]{8}$'),
  whatsapp       text check (whatsapp ~ '^\+504[0-9]{8}$'),
  email_contacto text check (char_length(email_contacto) <= 254 and email_contacto ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  redes_sociales jsonb not null default '{}'::jsonb check (jsonb_typeof(redes_sociales) = 'object'),
  horario        jsonb check (horario is null or jsonb_typeof(horario) = 'object'),
  logo_path      text,
  estado         public.business_status not null default 'pendiente',
  plan           text not null default 'gratis' references public.plans (code) on update cascade,
  motivo_estado  text check (char_length(motivo_estado) <= 500),
  aprobado_en    timestamptz,
  search_vector  tsvector generated always as (
                   setweight(to_tsvector('public.es_unaccent', coalesce(nombre, '')), 'A') ||
                   setweight(to_tsvector('public.es_unaccent', coalesce(descripcion, '')), 'B') ||
                   setweight(to_tsvector('public.es_unaccent', coalesce(localidad, '')), 'C')
                 ) stored,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint businesses_contacto_requerido check (telefono is not null or whatsapp is not null),
  constraint businesses_logo_en_su_carpeta check (logo_path is null or logo_path like id::text || '/%')
);

comment on table public.businesses is 'Perfil público de cada negocio/emprendimiento.';
comment on column public.businesses.horario is
  'Formato: {"lun":[{"abre":"08:00","cierra":"17:00"}], ..., "dom":[], "nota":"..."}. Día ausente o [] = cerrado.';
comment on column public.businesses.redes_sociales is
  'Formato: {"facebook":"https://…","instagram":"https://…","tiktok":"https://…","sitio_web":"https://…"}';

-- -----------------------------------------------------------------------------
-- Índices
-- -----------------------------------------------------------------------------
-- Listado categoría + ciudad (la consulta más importante del sitio)
create index if not exists businesses_aprobados_categoria_municipio_idx
  on public.businesses (category_id, municipio_id) where estado = 'aprobado';
-- Listado por ciudad
create index if not exists businesses_aprobados_municipio_idx
  on public.businesses (municipio_id) where estado = 'aprobado';
-- Recientes (inicio) / sitemap
create index if not exists businesses_aprobados_recientes_idx
  on public.businesses (aprobado_en desc) where estado = 'aprobado';
-- Búsqueda de texto
create index if not exists businesses_search_idx
  on public.businesses using gin (search_vector);
-- Panel del emprendedor
create index if not exists businesses_owner_idx on public.businesses (owner_id);
-- Panel de admin: filtro por estado
create index if not exists businesses_estado_idx on public.businesses (estado, created_at desc);

-- -----------------------------------------------------------------------------
-- ¿Quién está ejecutando? true para admin, SQL editor (postgres) y service_role.
-- -----------------------------------------------------------------------------
create or replace function public.es_contexto_privilegiado()
returns boolean
language sql
stable
set search_path = ''
as $$
  select current_user not in ('anon', 'authenticated') or public.is_admin();
$$;

-- -----------------------------------------------------------------------------
-- Trigger guardián de campos restringidos
-- -----------------------------------------------------------------------------
create or replace function public.businesses_proteger_campos()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  privilegiado boolean := public.es_contexto_privilegiado();
  max_negocios_por_cuenta constant int := 3;
begin
  if tg_op = 'INSERT' then
    if not privilegiado then
      new.owner_id      := auth.uid();
      new.estado        := 'pendiente';
      new.plan          := 'gratis';
      new.motivo_estado := null;
      new.aprobado_en   := null;
      new.slug          := null;  -- siempre generado a partir del nombre

      perform pg_advisory_xact_lock(hashtext('businesses_owner:' || new.owner_id::text));
      if (select count(*) from public.businesses where owner_id = new.owner_id) >= max_negocios_por_cuenta then
        raise exception 'Alcanzaste el máximo de % negocios por cuenta.', max_negocios_por_cuenta
          using errcode = 'P0001', hint = 'limite_negocios';
      end if;
    elsif new.estado = 'aprobado' then
      new.aprobado_en := coalesce(new.aprobado_en, now());
    end if;
    return new;
  end if;

  -- UPDATE
  if not privilegiado then
    if new.owner_id      is distinct from old.owner_id
    or new.estado        is distinct from old.estado
    or new.plan          is distinct from old.plan
    or new.motivo_estado is distinct from old.motivo_estado
    or new.aprobado_en   is distinct from old.aprobado_en
    or new.slug          is distinct from old.slug then
      raise exception 'Solo un administrador puede cambiar estado, plan, slug o dueño del negocio.'
        using errcode = '42501';
    end if;

    -- Un negocio rechazado que su dueño corrige vuelve a revisión.
    if old.estado = 'rechazado' then
      new.estado        := 'pendiente';
      new.motivo_estado := null;
    end if;
  else
    if new.estado = 'aprobado' and old.estado is distinct from 'aprobado' then
      new.aprobado_en   := coalesce(old.aprobado_en, now());
      new.motivo_estado := null;
    end if;
    if new.slug is distinct from old.slug then
      new.slug := public.slugify(new.slug);
    end if;
  end if;
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- Slug único a partir del nombre.
--   1. slugify(nombre)                        -> pupuseria-dona-chepa
--   2. si existe, agregar la ciudad           -> pupuseria-dona-chepa-choloma
--   3. si aún existe, numerar                 -> pupuseria-dona-chepa-choloma-2
-- SECURITY DEFINER: debe ver TODOS los slugs (también negocios pendientes de
-- otros usuarios que RLS le oculta al dueño). Un advisory lock por slug base
-- evita condiciones de carrera; el UNIQUE sigue como red de seguridad.
-- El slug NO cambia al editar el nombre (URL estable = mejor SEO).
-- -----------------------------------------------------------------------------
create or replace function public.businesses_generar_slug()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  base      text;
  ciudad    text;
  candidato text;
  n         int := 2;
begin
  if new.slug is not null and new.slug <> '' then
    -- Slug manual (solo posible para admin; el guardián lo anula para el resto)
    new.slug := public.slugify(new.slug);
    return new;
  end if;

  base := trim(both '-' from left(public.slugify(new.nombre), 80));
  if base = '' then
    base := 'negocio';
  end if;

  perform pg_advisory_xact_lock(hashtext('businesses_slug:' || base));

  candidato := base;
  if exists (select 1 from public.businesses where slug = candidato) then
    select m.slug into ciudad from public.municipios m where m.id = new.municipio_id;
    candidato := base || '-' || coalesce(ciudad, 'hn');
    while exists (select 1 from public.businesses where slug = candidato) loop
      candidato := base || '-' || coalesce(ciudad, 'hn') || '-' || n;
      n := n + 1;
    end loop;
  end if;

  new.slug := candidato;
  return new;
end;
$$;

-- Los triggers BEFORE se ejecutan en orden alfabético: primero el guardián.
drop trigger if exists businesses_10_proteger_campos on public.businesses;
create trigger businesses_10_proteger_campos
  before insert or update on public.businesses
  for each row execute function public.businesses_proteger_campos();

drop trigger if exists businesses_20_generar_slug on public.businesses;
create trigger businesses_20_generar_slug
  before insert on public.businesses
  for each row execute function public.businesses_generar_slug();

drop trigger if exists businesses_30_set_updated_at on public.businesses;
create trigger businesses_30_set_updated_at
  before update on public.businesses
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Helper: ¿el usuario actual es dueño de este negocio? (usado por imágenes y Storage)
-- -----------------------------------------------------------------------------
create or replace function public.es_dueno_negocio(p_business_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.businesses
    where id = p_business_id and owner_id = (select auth.uid())
  );
$$;

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------
alter table public.businesses enable row level security;

drop policy if exists "businesses: lectura" on public.businesses;
create policy "businesses: lectura"
  on public.businesses for select to anon, authenticated
  using (
    estado = 'aprobado'
    or owner_id = (select auth.uid())
    or (select public.is_admin())
  );

drop policy if exists "businesses: dueño crea" on public.businesses;
create policy "businesses: dueño crea"
  on public.businesses for insert to authenticated
  with check (owner_id = (select auth.uid()));

drop policy if exists "businesses: dueño o admin edita" on public.businesses;
create policy "businesses: dueño o admin edita"
  on public.businesses for update to authenticated
  using (owner_id = (select auth.uid()) or (select public.is_admin()))
  with check (owner_id = (select auth.uid()) or (select public.is_admin()));

drop policy if exists "businesses: dueño o admin elimina" on public.businesses;
create policy "businesses: dueño o admin elimina"
  on public.businesses for delete to authenticated
  using (owner_id = (select auth.uid()) or (select public.is_admin()));

revoke insert, update, delete on public.businesses from anon;
grant select on public.businesses to anon, authenticated;
grant insert, update, delete on public.businesses to authenticated;
