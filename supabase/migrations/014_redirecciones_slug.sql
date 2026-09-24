-- =============================================================================
-- 014 · Redirecciones 301 cuando cambia la URL (slug) de un negocio
-- -----------------------------------------------------------------------------
-- · business_slug_redirects: cada slug viejo apunta al negocio. La página
--   /negocio/[slug] redirige (308 permanente) al slug actual y así no se pierde
--   el posicionamiento en Google ni los enlaces compartidos.
-- · Trigger: al cambiar businesses.slug guarda el viejo; si un negocio toma un
--   slug que estaba reservado como redirección, la redirección se elimina.
-- · El generador de slugs (006) ahora también evita los slugs reservados.
-- · slug_actual(slug): slug vigente de un negocio publicado a partir de uno viejo.
-- Solo el admin cambia slugs (trigger guardián de 006). Idempotente. Requiere: 006
-- =============================================================================

create table if not exists public.business_slug_redirects (
  slug        text primary key check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  business_id uuid not null references public.businesses (id) on delete cascade,
  created_at  timestamptz not null default now()
);

comment on table public.business_slug_redirects is 'Slugs anteriores de cada negocio, para redirigir a la URL vigente.';

create index if not exists business_slug_redirects_negocio_idx on public.business_slug_redirects (business_id);

alter table public.business_slug_redirects enable row level security;

drop policy if exists "business_slug_redirects: admin lee" on public.business_slug_redirects;
create policy "business_slug_redirects: admin lee"
  on public.business_slug_redirects for select to authenticated
  using ((select public.is_admin()));

revoke all on public.business_slug_redirects from anon, authenticated;
grant select on public.business_slug_redirects to authenticated;

-- -----------------------------------------------------------------------------
-- Guardar el slug viejo al cambiarlo
-- -----------------------------------------------------------------------------
create or replace function public.businesses_registrar_slug_viejo()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and new.slug is distinct from old.slug then
    insert into public.business_slug_redirects (slug, business_id)
    values (old.slug, new.id)
    on conflict (slug) do update set business_id = excluded.business_id, created_at = now();
  end if;
  -- El slug vigente nunca debe quedar como redirección (p. ej. si vuelve al anterior).
  delete from public.business_slug_redirects where slug = new.slug;
  return null;
end;
$$;

drop trigger if exists businesses_40_registrar_slug_viejo on public.businesses;
create trigger businesses_40_registrar_slug_viejo
  after insert or update of slug on public.businesses
  for each row execute function public.businesses_registrar_slug_viejo();

-- -----------------------------------------------------------------------------
-- Generador de slugs (reemplaza la versión de 006): también evita slugs
-- reservados como redirección de otro negocio.
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
  if exists (select 1 from public.businesses where slug = candidato)
  or exists (select 1 from public.business_slug_redirects where slug = candidato) then
    select m.slug into ciudad from public.municipios m where m.id = new.municipio_id;
    candidato := base || '-' || coalesce(ciudad, 'hn');
    while exists (select 1 from public.businesses where slug = candidato)
       or exists (select 1 from public.business_slug_redirects where slug = candidato) loop
      candidato := base || '-' || coalesce(ciudad, 'hn') || '-' || n;
      n := n + 1;
    end loop;
  end if;

  new.slug := candidato;
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- Resolver un slug viejo (solo hacia negocios publicados)
-- -----------------------------------------------------------------------------
create or replace function public.slug_actual(p_slug text)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select b.slug
  from public.business_slug_redirects r
  join public.businesses b on b.id = r.business_id
  where r.slug = p_slug and b.estado = 'aprobado';
$$;

revoke all on function public.slug_actual(text) from public;
grant execute on function public.slug_actual(text) to anon, authenticated;
