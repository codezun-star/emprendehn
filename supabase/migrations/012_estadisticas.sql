-- =============================================================================
-- 012 · Estadísticas por negocio (visitas y clics de contacto)
-- -----------------------------------------------------------------------------
-- · business_stats_daily: contadores por negocio y por día (hora de Honduras).
--   Solo números agregados: no se guarda nada de quien visita.
-- · registrar_evento(negocio, evento): la única forma de sumar. La llama la app
--   (ruta /api/eventos) cuando alguien ve la página de un negocio publicado o
--   toca WhatsApp, Llamar, Google Maps o sus redes.
-- · RLS: el dueño ve las de sus negocios; el admin, todas.
-- Idempotente. Requiere: 006
-- =============================================================================

create table if not exists public.business_stats_daily (
  business_id uuid not null references public.businesses (id) on delete cascade,
  dia         date not null,
  visitas     int  not null default 0 check (visitas >= 0),
  whatsapp    int  not null default 0 check (whatsapp >= 0),
  llamadas    int  not null default 0 check (llamadas >= 0),
  mapa        int  not null default 0 check (mapa >= 0),
  redes       int  not null default 0 check (redes >= 0),
  primary key (business_id, dia)
);

comment on table public.business_stats_daily is
  'Visitas y clics de contacto por negocio y día (America/Tegucigalpa). Solo agregados.';

alter table public.business_stats_daily enable row level security;

drop policy if exists "business_stats_daily: dueño o admin lee" on public.business_stats_daily;
create policy "business_stats_daily: dueño o admin lee"
  on public.business_stats_daily for select to authenticated
  using (public.es_dueno_negocio(business_id) or (select public.is_admin()));

revoke all on public.business_stats_daily from anon, authenticated;
grant select on public.business_stats_daily to authenticated;

create or replace function public.registrar_evento(p_business_id uuid, p_evento text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  hoy date := (now() at time zone 'America/Tegucigalpa')::date;
begin
  if p_evento not in ('visita', 'whatsapp', 'llamada', 'mapa', 'redes') then
    raise exception 'Evento desconocido: %', p_evento using errcode = '22023';
  end if;
  -- Solo negocios publicados (no cuenta la vista previa del dueño ni la del admin).
  if not exists (select 1 from public.businesses where id = p_business_id and estado = 'aprobado') then
    return;
  end if;

  insert into public.business_stats_daily as s (business_id, dia, visitas, whatsapp, llamadas, mapa, redes)
  values (
    p_business_id, hoy,
    (p_evento = 'visita')::int, (p_evento = 'whatsapp')::int, (p_evento = 'llamada')::int,
    (p_evento = 'mapa')::int, (p_evento = 'redes')::int
  )
  on conflict (business_id, dia) do update set
    visitas  = s.visitas  + excluded.visitas,
    whatsapp = s.whatsapp + excluded.whatsapp,
    llamadas = s.llamadas + excluded.llamadas,
    mapa     = s.mapa     + excluded.mapa,
    redes    = s.redes    + excluded.redes;
end;
$$;

revoke all on function public.registrar_evento(uuid, text) from public;
grant execute on function public.registrar_evento(uuid, text) to anon, authenticated;
