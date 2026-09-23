-- =============================================================================
-- 005 · Planes (gratis / basico / premium)
-- -----------------------------------------------------------------------------
-- El plan es una tabla (no un enum) para que los límites y beneficios sean
-- datos editables: subir el límite de fotos del plan premium es un UPDATE,
-- no un cambio de código.
-- En el MVP los tres planes tienen el mismo límite bajo de imágenes.
-- · prioridad: orden en listados (mayor primero); en el MVP todos compiten igual
--   salvo que el admin asigne un plan superior.
-- Requiere: 001, 002
-- =============================================================================

create table if not exists public.plans (
  code               text primary key check (code ~ '^[a-z_]+$'),
  nombre             text not null,
  descripcion        text,
  max_imagenes       smallint not null default 5 check (max_imagenes between 0 and 50),
  prioridad          smallint not null default 0,
  precio_mensual_lps numeric(10, 2) check (precio_mensual_lps >= 0),
  activo             boolean not null default true,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

comment on table public.plans is 'Planes de suscripción. businesses.plan referencia code.';

drop trigger if exists plans_set_updated_at on public.plans;
create trigger plans_set_updated_at
  before update on public.plans
  for each row execute function public.set_updated_at();

insert into public.plans (code, nombre, descripcion, max_imagenes, prioridad, precio_mensual_lps) values
  ('gratis',  'Gratis',  'Perfil completo en el directorio.',                         5, 0,  0),
  ('basico',  'Básico',  'Más visibilidad en tu categoría (próximamente).',           5, 10, null),
  ('premium', 'Premium', 'Posición destacada y beneficios adicionales (próximamente).', 5, 20, null)
on conflict (code) do nothing;

alter table public.plans enable row level security;

drop policy if exists "plans: lectura pública" on public.plans;
create policy "plans: lectura pública"
  on public.plans for select to anon, authenticated using (true);

drop policy if exists "plans: admin edita" on public.plans;
create policy "plans: admin edita"
  on public.plans for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

revoke insert, update, delete on public.plans from anon;
revoke insert, delete on public.plans from authenticated;
grant select on public.plans to anon, authenticated;
grant update on public.plans to authenticated;
