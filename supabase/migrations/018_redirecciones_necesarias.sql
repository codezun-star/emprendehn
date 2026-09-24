-- =============================================================================
-- 018 · Redirecciones de URL: solo las necesarias
-- -----------------------------------------------------------------------------
-- · No se guardan redirecciones de negocios que nunca se publicaron
--   (aprobado_en null): nadie vio, compartió ni indexó esas URLs.
-- · Una URL vieja queda reservada para su negocio durante 12 meses. Pasado ese
--   tiempo (Google ya actualizó sus resultados), otro negocio puede usarla; si
--   nadie la toma, sigue redirigiendo al negocio para siempre.
-- · Limpieza: se borran las redirecciones ya guardadas de negocios que nunca
--   se publicaron.
-- Idempotente. Requiere: 014, 017
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Primer slug libre (reemplaza el de 017): las redirecciones de otro negocio
-- solo bloquean el slug durante 12 meses.
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
     or exists (
       select 1 from public.business_slug_redirects
       where slug = candidato
         and business_id is distinct from p_negocio
         and created_at > now() - interval '12 months'
     ) loop
    candidato := p_base || '-' || n;
    n := n + 1;
  end loop;
  return candidato;
end;
$$;

revoke all on function public.slug_negocio_libre(text, uuid) from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- Registro de slugs viejos (reemplaza el de 017): solo de negocios que
-- alguna vez estuvieron publicados. Al tomar un slug (propio o una redirección
-- vencida de otro negocio) esa redirección se elimina, como antes.
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
    if old.aprobado_en is not null then
      insert into public.business_slug_redirects (slug, business_id)
      values (old.slug, new.id)
      on conflict (slug) do update set business_id = excluded.business_id, created_at = now();
    end if;
  end if;
  -- El slug vigente nunca debe quedar como redirección.
  delete from public.business_slug_redirects where slug = new.slug;
  return null;
end;
$$;

-- El trigger de 017 (after insert or update) sigue apuntando a esta función.

-- -----------------------------------------------------------------------------
-- Limpieza: redirecciones de negocios que nunca se publicaron.
-- -----------------------------------------------------------------------------
delete from public.business_slug_redirects r
using public.businesses b
where b.id = r.business_id and b.aprobado_en is null;
