-- =============================================================================
-- 011 · Reportes de negocios y eliminación de la propia cuenta
-- -----------------------------------------------------------------------------
-- · business_reports: cualquier visitante puede reportar un negocio publicado.
--   Solo se crean con la función reportar_negocio (límites contra abuso:
--   3 por negocio y 30 en total por hora). Solo el admin los ve y resuelve.
-- · eliminar_mi_cuenta(): el usuario borra su cuenta; en cascada se borran su
--   perfil, sus negocios, sus fotos (filas) y sus reportes recibidos. Los
--   archivos de Storage los borra antes la app (la API de Storage no permite
--   borrarlos desde SQL). Un admin no puede borrarse a sí mismo.
-- Idempotente. Requiere: 006
-- =============================================================================

create table if not exists public.business_reports (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  motivo      text not null check (motivo in (
                'informacion_falsa', 'no_existe', 'estafa', 'contenido_indebido', 'duplicado', 'otro'
              )),
  detalle     text check (char_length(detalle) <= 1000),
  contacto    text check (char_length(contacto) <= 254),
  estado      text not null default 'abierto' check (estado in ('abierto', 'resuelto')),
  created_at  timestamptz not null default now(),
  resuelto_en timestamptz
);

comment on table public.business_reports is 'Reportes de visitantes sobre negocios publicados (solo admin los lee).';

create index if not exists business_reports_estado_idx on public.business_reports (estado, created_at desc);
create index if not exists business_reports_negocio_idx on public.business_reports (business_id, created_at desc);

alter table public.business_reports enable row level security;

drop policy if exists "business_reports: admin lee" on public.business_reports;
create policy "business_reports: admin lee"
  on public.business_reports for select to authenticated
  using ((select public.is_admin()));

drop policy if exists "business_reports: admin resuelve" on public.business_reports;
create policy "business_reports: admin resuelve"
  on public.business_reports for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

drop policy if exists "business_reports: admin elimina" on public.business_reports;
create policy "business_reports: admin elimina"
  on public.business_reports for delete to authenticated
  using ((select public.is_admin()));

-- Nadie inserta directo: solo a través de reportar_negocio().
revoke all on public.business_reports from anon, authenticated;
grant select, delete on public.business_reports to authenticated;
grant update (estado, resuelto_en) on public.business_reports to authenticated;

-- -----------------------------------------------------------------------------
-- Crear un reporte. Devuelve true si es el primer reporte abierto de ese
-- negocio (la app avisa al admin solo en ese caso, para no llenarle el correo).
-- -----------------------------------------------------------------------------
create or replace function public.reportar_negocio(
  p_business_id uuid,
  p_motivo      text,
  p_detalle     text default null,
  p_contacto    text default null
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  abiertos int;
begin
  if not exists (select 1 from public.businesses where id = p_business_id and estado = 'aprobado') then
    raise exception 'Negocio no encontrado.' using errcode = 'P0002';
  end if;

  perform pg_advisory_xact_lock(hashtext('business_reports'));
  if (select count(*) from public.business_reports
      where business_id = p_business_id and created_at > now() - interval '1 hour') >= 3
  or (select count(*) from public.business_reports
      where created_at > now() - interval '1 hour') >= 30 then
    raise exception 'Recibimos muchos reportes en poco tiempo. Inténtalo más tarde.'
      using errcode = 'P0001', hint = 'limite_reportes';
  end if;

  select count(*) into abiertos
  from public.business_reports
  where business_id = p_business_id and estado = 'abierto';

  insert into public.business_reports (business_id, motivo, detalle, contacto)
  values (p_business_id, p_motivo, nullif(trim(p_detalle), ''), nullif(trim(p_contacto), ''));

  return abiertos = 0;
end;
$$;

revoke all on function public.reportar_negocio(uuid, text, text, text) from public;
grant execute on function public.reportar_negocio(uuid, text, text, text) to anon, authenticated;

-- -----------------------------------------------------------------------------
-- Eliminar la cuenta propia
-- -----------------------------------------------------------------------------
-- ¿Se puede eliminar? (la app lo consulta ANTES de borrar los archivos).
create or replace function public.puedo_eliminar_mi_cuenta()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null
     and not public.is_admin()
     and has_table_privilege('auth.users', 'DELETE');
$$;

create or replace function public.eliminar_mi_cuenta()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'No has iniciado sesión.' using errcode = '42501';
  end if;
  if public.is_admin() then
    raise exception 'Un administrador no puede eliminar su propia cuenta desde el panel.'
      using errcode = 'P0001', hint = 'cuenta_admin';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.puedo_eliminar_mi_cuenta() from public, anon;
revoke all on function public.eliminar_mi_cuenta() from public, anon;
grant execute on function public.puedo_eliminar_mi_cuenta() to authenticated;
grant execute on function public.eliminar_mi_cuenta() to authenticated;
