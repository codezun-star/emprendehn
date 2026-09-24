-- =============================================================================
-- 010 · Revisión posterior de cambios y reenvío a revisión
-- -----------------------------------------------------------------------------
-- Política de moderación después de publicar:
-- · Negocio APROBADO: los cambios de su dueño se publican al instante (no pierde
--   visibilidad). Si cambia algo sensible (nombre, descripción, categoría,
--   ciudad, logo, redes o agrega fotos), queda marcado en cambios_por_revisar
--   para que el admin lo revise después ("Cambios por revisar" en /admin).
--   Teléfono, WhatsApp, correo, horario y dirección no se marcan.
-- · Negocio RECHAZADO o SUSPENDIDO: si su dueño lo edita o agrega una foto,
--   vuelve a 'pendiente' (antes solo pasaba con rechazados y al editar datos).
-- · Cualquier cambio de estado hecho por el admin cuenta como revisión y
--   limpia las marcas. El admin también puede marcarlas como revisadas.
-- Idempotente: se puede ejecutar más de una vez.
-- Requiere: 006, 007
-- =============================================================================

alter table public.businesses
  add column if not exists cambios_por_revisar text[] not null default '{}',
  add column if not exists cambios_por_revisar_desde timestamptz;

comment on column public.businesses.cambios_por_revisar is
  'Campos sensibles que el dueño cambió en un negocio aprobado y el admin aún no revisa: nombre, descripcion, categoria, ciudad, logo, redes, fotos (solo admin)';
comment on column public.businesses.cambios_por_revisar_desde is
  'Momento del primer cambio sin revisar (orden de la cola de revisión). Null = nada pendiente (solo admin)';

create index if not exists businesses_cambios_por_revisar_idx
  on public.businesses (cambios_por_revisar_desde)
  where cambios_por_revisar_desde is not null;

-- -----------------------------------------------------------------------------
-- Trigger guardián (reemplaza la versión de 006)
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
    or new.cambios_por_revisar_desde is distinct from old.cambios_por_revisar_desde then
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
        case when new.redes_sociales is distinct from old.redes_sociales then 'redes' end
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

-- -----------------------------------------------------------------------------
-- Fotos nuevas del dueño: marcan el negocio aprobado para revisión, o
-- reenvían a revisión un negocio rechazado o suspendido.
-- SECURITY DEFINER para poder actualizar esas columnas restringidas; el
-- guardián lo ve como contexto privilegiado.
-- -----------------------------------------------------------------------------
create or replace function public.business_images_despues_de_insertar()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Solo las fotos que sube el dueño desde la app (no el admin ni el SQL editor).
  if auth.uid() is null or public.is_admin() then
    return new;
  end if;

  update public.businesses b
  set cambios_por_revisar       = array(
        select distinct c from unnest(b.cambios_por_revisar || '{fotos}'::text[]) as c order by c
      ),
      cambios_por_revisar_desde = coalesce(b.cambios_por_revisar_desde, now())
  where b.id = new.business_id and b.estado = 'aprobado';

  update public.businesses b
  set estado = 'pendiente', motivo_estado = null
  where b.id = new.business_id and b.estado in ('rechazado', 'suspendido');

  return new;
end;
$$;

drop trigger if exists business_images_20_despues_de_insertar on public.business_images;
create trigger business_images_20_despues_de_insertar
  after insert on public.business_images
  for each row execute function public.business_images_despues_de_insertar();
