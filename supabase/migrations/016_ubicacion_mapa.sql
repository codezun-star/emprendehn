-- =============================================================================
-- 016 · Ubicación exacta en el mapa
-- -----------------------------------------------------------------------------
-- En Honduras muchos negocios comparten nombre: buscar en Google Maps por
-- "nombre + ciudad" lleva a otro lugar. Ahora cada negocio puede guardar:
-- · latitud / longitud: el pin exacto (lo fija el dueño en el mapa, con su
--   ubicación actual o pegando su enlace de Google Maps). Deben estar dentro
--   de Honduras (incluye Islas de la Bahía e Islas del Cisne).
-- · enlace_mapa: su enlace de Google Maps (solo dominios de Google), para abrir
--   su ficha con fotos y reseñas de Google.
-- En un negocio publicado, cambiar la ubicación marca 'ubicacion' en
-- cambios_por_revisar (trigger guardián; reemplaza la versión de 015).
-- Idempotente. Requiere: 006, 010, 015
-- =============================================================================

alter table public.businesses
  add column if not exists latitud     double precision,
  add column if not exists longitud    double precision,
  add column if not exists enlace_mapa text;

comment on column public.businesses.latitud is 'Latitud del pin del negocio (WGS84). Null = sin ubicación exacta';
comment on column public.businesses.longitud is 'Longitud del pin del negocio (WGS84)';
comment on column public.businesses.enlace_mapa is 'Enlace de Google Maps del negocio (ficha o pin compartido), opcional';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'businesses_coordenadas_completas') then
    alter table public.businesses add constraint businesses_coordenadas_completas
      check ((latitud is null) = (longitud is null));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'businesses_coordenadas_en_honduras') then
    alter table public.businesses add constraint businesses_coordenadas_en_honduras
      check (latitud is null or (latitud between 12.9 and 17.5 and longitud between -89.4 and -83.0));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'businesses_enlace_mapa_google') then
    alter table public.businesses add constraint businesses_enlace_mapa_google
      check (enlace_mapa is null or (
        char_length(enlace_mapa) <= 500
        and enlace_mapa ~ '^https://(maps\.app\.goo\.gl/|goo\.gl/maps/|(www\.)?google\.(com(\.[a-z]{2})?|co\.[a-z]{2}|[a-z]{2})/maps|maps\.google\.(com(\.[a-z]{2})?|co\.[a-z]{2}|[a-z]{2})/)'
      ));
  end if;
end
$$;

-- -----------------------------------------------------------------------------
-- Trigger guardián (igual al de 015 + 'ubicacion' como cambio a revisar)
-- -----------------------------------------------------------------------------
create or replace function public.businesses_proteger_campos()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  privilegiado boolean := public.es_contexto_privilegiado();
  max_negocios_por_cuenta constant int := 3;
  cambios text[];
begin
  if tg_op = 'INSERT' then
    if not privilegiado then
      new.owner_id                  := auth.uid();
      new.estado                    := 'pendiente';
      new.plan                      := 'gratis';
      new.motivo_estado             := null;
      new.aprobado_en               := null;
      new.slug                      := null;  -- siempre generado a partir del nombre
      new.cambios_por_revisar       := '{}';
      new.cambios_por_revisar_desde := null;
      new.calificacion_promedio     := null;
      new.total_resenas             := 0;

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
    if new.owner_id                  is distinct from old.owner_id
    or new.estado                    is distinct from old.estado
    or new.plan                      is distinct from old.plan
    or new.motivo_estado             is distinct from old.motivo_estado
    or new.aprobado_en               is distinct from old.aprobado_en
    or new.slug                      is distinct from old.slug
    or new.cambios_por_revisar       is distinct from old.cambios_por_revisar
    or new.cambios_por_revisar_desde is distinct from old.cambios_por_revisar_desde
    or new.calificacion_promedio     is distinct from old.calificacion_promedio
    or new.total_resenas             is distinct from old.total_resenas then
      raise exception 'Solo un administrador puede cambiar estado, plan, slug o dueño del negocio.'
        using errcode = '42501';
    end if;

    if old.estado in ('rechazado', 'suspendido') then
      -- Su dueño lo corrigió: vuelve a revisión.
      new.estado        := 'pendiente';
      new.motivo_estado := null;
    elsif old.estado = 'aprobado' then
      -- Publicado: el cambio ya es visible; lo sensible queda para revisión posterior.
      cambios := array_remove(array[
        case when new.nombre         is distinct from old.nombre         then 'nombre' end,
        case when new.descripcion    is distinct from old.descripcion    then 'descripcion' end,
        case when new.category_id    is distinct from old.category_id    then 'categoria' end,
        case when new.municipio_id   is distinct from old.municipio_id   then 'ciudad' end,
        case when new.logo_path      is distinct from old.logo_path
              and new.logo_path is not null                              then 'logo' end,
        case when new.redes_sociales is distinct from old.redes_sociales then 'redes' end,
        case when new.latitud     is distinct from old.latitud
               or new.longitud    is distinct from old.longitud
               or new.enlace_mapa is distinct from old.enlace_mapa        then 'ubicacion' end
      ], null);
      if cardinality(cambios) > 0 then
        new.cambios_por_revisar := array(
          select distinct c from unnest(old.cambios_por_revisar || cambios) as c order by c
        );
        new.cambios_por_revisar_desde := coalesce(old.cambios_por_revisar_desde, now());
      end if;
    end if;
  else
    if new.estado = 'aprobado' and old.estado is distinct from 'aprobado' then
      new.aprobado_en   := coalesce(old.aprobado_en, now());
      new.motivo_estado := null;
    end if;
    -- Una decisión de moderación cuenta como revisión de los cambios.
    if new.estado is distinct from old.estado then
      new.cambios_por_revisar       := '{}';
      new.cambios_por_revisar_desde := null;
    end if;
    if new.slug is distinct from old.slug then
      new.slug := public.slugify(new.slug);
    end if;
  end if;
  return new;
end;
$$;
