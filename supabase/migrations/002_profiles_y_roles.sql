-- =============================================================================
-- 002 · Perfiles de usuario y roles
-- -----------------------------------------------------------------------------
-- · Enum user_role (business_owner | admin)
-- · Tabla profiles 1:1 con auth.users, creada automáticamente por trigger
-- · public.is_admin(): helper usado por todas las políticas RLS
-- · RLS: cada usuario ve/edita su perfil (solo nombre y teléfono); el admin ve todos
--
-- IMPORTANTE: el rol NUNCA se toma de los metadatos del registro (el usuario
-- los controla). Para crear el primer admin, ejecutar en el SQL editor:
--   update public.profiles set rol = 'admin' where email = 'tu-correo@ejemplo.com';
-- Requiere: 001
-- =============================================================================

do $$
begin
  if not exists (select 1 from pg_type where typname = 'user_role' and typnamespace = 'public'::regnamespace) then
    create type public.user_role as enum ('business_owner', 'admin');
  end if;
end
$$;

create table if not exists public.profiles (
  id              uuid primary key references auth.users (id) on delete cascade,
  rol             public.user_role not null default 'business_owner',
  nombre_completo text check (char_length(nombre_completo) <= 120),
  email           text,
  telefono        text check (char_length(telefono) <= 20),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

comment on table public.profiles is 'Perfil de cada usuario (1:1 con auth.users). El rol solo lo cambia un admin vía SQL.';

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Helper de autorización. SECURITY DEFINER para poder leer profiles sin
-- recursión de RLS. Úsalo en políticas como (select public.is_admin()) para
-- que Postgres lo evalúe una sola vez por consulta.
-- -----------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and rol = 'admin'
  );
$$;

comment on function public.is_admin() is 'true si el usuario autenticado tiene rol admin.';

-- -----------------------------------------------------------------------------
-- Crear el perfil al registrarse (email/contraseña u OAuth de Google).
-- -----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, nombre_completo)
  values (
    new.id,
    new.email,
    nullif(left(trim(coalesce(
      new.raw_user_meta_data ->> 'nombre_completo',
      new.raw_user_meta_data ->> 'full_name',   -- Google OAuth
      new.raw_user_meta_data ->> 'name'
    )), 120), '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Mantener el email sincronizado si el usuario lo cambia.
create or replace function public.handle_user_email_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles set email = new.email where id = new.id;
  return new;
end;
$$;

drop trigger if exists on_auth_user_email_changed on auth.users;
create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row
  when (old.email is distinct from new.email)
  execute function public.handle_user_email_change();

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------
alter table public.profiles enable row level security;

drop policy if exists "profiles: ver propio o admin" on public.profiles;
create policy "profiles: ver propio o admin"
  on public.profiles for select
  to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()));

drop policy if exists "profiles: editar propio" on public.profiles;
create policy "profiles: editar propio"
  on public.profiles for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- Privilegios por columna: el usuario solo puede cambiar nombre y teléfono.
-- (rol y email quedan fuera de su alcance aunque la política permita la fila)
revoke all on public.profiles from anon;
revoke insert, update, delete on public.profiles from authenticated;
grant select on public.profiles to authenticated;
grant update (nombre_completo, telefono) on public.profiles to authenticated;
