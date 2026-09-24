-- =============================================================================
-- 017 · La ciudad en la URL de cada negocio
-- -----------------------------------------------------------------------------
-- · Negocios nuevos: /negocio/{nombre}-{ciudad} (p. ej. baleadas-dona-marta-la-ceiba).
--   Antes era solo el nombre y la ciudad aparecía únicamente si el nombre ya
--   estaba tomado. Si también está tomado: -2, -3…
-- · Si el negocio cambia de ciudad, en la URL cambia solo la ciudad (el nombre
--   se mantiene aunque lo editen: URL estable) y la anterior redirige (308) a la
--   nueva con las redirecciones de 014. Volver a la ciudad anterior recupera
--   la URL anterior.
-- · Los negocios existentes pasan una sola vez al formato nuevo; sus URLs de
--   antes quedan como redirección.
-- · Corrige 014: el slug viejo se registraba solo cuando el UPDATE nombraba la
--   columna slug; ahora también cuando la cambia un trigger.
-- Idempotente. Requiere: 006, 014
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Primer slug libre: base, base-2, base-3… Ocupado = lo usa otro negocio o es
-- una redirección de otro negocio (las redirecciones propias sí se recuperan).
-- Solo la usan los triggers (no se expone a la API).
-- -----------------------------------------------------------------------------
create or replace function public.slug_negocio_libre(p_base text, p_negocio uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  candidato text := p_base;
  n         int := 2;
begin
  perform pg_advisory_xact_lock(hashtext('businesses_slug:' || p_base));
  while exists (select 1 from public.businesses where slug = candidato and id is distinct from p_negocio)
     or exists (select 1 from public.business_slug_redirects where slug = candidato and business_id is distinct from p_negocio) loop
    candidato := p_base || '-' || n;
    n := n + 1;
  end loop;
  return candidato;
end;
$$;

revoke all on function public.slug_negocio_libre(text, uuid) from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- Generador de slugs (reemplaza el de 014): nombre + ciudad al crear, y cambio
-- de ciudad al editar.
-- -----------------------------------------------------------------------------
create or replace function public.businesses_generar_slug()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  base         text;
  ciudad_vieja text;
  ciudad_nueva text;
begin
  if tg_op = 'INSERT' then
    if new.slug is not null and new.slug <> '' then
      -- Slug manual (solo posible para admin; el guardián lo anula para el resto)
      new.slug := public.slugify(new.slug);
      return new;
    end if;
    base := trim(both '-' from left(public.slugify(new.nombre), 80));
    if base = '' then
      base := 'negocio';
    end if;
  else
    -- Solo si cambió la ciudad y nadie cambió el slug a mano en la misma operación.
    if new.municipio_id is not distinct from old.municipio_id or new.slug is distinct from old.slug then
      return new;
    end if;
    -- Quitar la ciudad anterior (y un posible -N) del final:
    -- baleadas-marta-la-ceiba-2 -> baleadas-marta. Si no la tiene (slug manual
    -- del admin), se conserva completo.
    select m.slug into ciudad_vieja from public.municipios m where m.id = old.municipio_id;
    base := regexp_replace(old.slug, '-' || coalesce(ciudad_vieja, '') || '(-[0-9]+)?$', '');
    base := trim(both '-' from left(base, 80));
  end if;

  select m.slug into ciudad_nueva from public.municipios m where m.id = new.municipio_id;
  new.slug := public.slug_negocio_libre(base || '-' || coalesce(ciudad_nueva, 'hn'), new.id);
  return new;
end;
$$;

drop trigger if exists businesses_20_generar_slug on public.businesses;
create trigger businesses_20_generar_slug
  before insert or update on public.businesses
  for each row execute function public.businesses_generar_slug();

-- -----------------------------------------------------------------------------
-- Registro de slugs viejos (reemplaza el de 014): se dispara en todo UPDATE,
-- no solo en los que nombran la columna slug.
-- -----------------------------------------------------------------------------
create or replace function public.businesses_registrar_slug_viejo()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' then
    if new.slug is not distinct from old.slug then
      return null;
    end if;
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
  after insert or update on public.businesses
  for each row execute function public.businesses_registrar_slug_viejo();

-- -----------------------------------------------------------------------------
-- Negocios existentes al formato nombre-ciudad (una sola vez: los que ya
-- terminan en su ciudad, con o sin -N, se dejan como están).
-- -----------------------------------------------------------------------------
do $$
declare
  r record;
begin
  for r in
    select b.id, b.slug, m.slug as ciudad
    from public.businesses b
    join public.municipios m on m.id = b.municipio_id
    where b.slug !~ ('-' || m.slug || '(-[0-9]+)?$')
    order by b.created_at
  loop
    update public.businesses
    set slug = public.slug_negocio_libre(trim(both '-' from left(r.slug, 80)) || '-' || r.ciudad, r.id)
    where id = r.id;
  end loop;
end
$$;
