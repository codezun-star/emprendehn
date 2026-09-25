-- =============================================================================
-- Entorno mínimo que imita a Supabase para probar las migraciones en un
-- Postgres limpio (CI y scripts/probar-migraciones.sh). NO se aplica en Supabase.
-- · roles anon / authenticated / service_role y privilegios por defecto
-- · auth.users, auth.uid() y auth.jwt() (claims del JWT: sub, aal, amr)
-- · storage.buckets / storage.objects / storage.foldername()
-- · helpers de prueba: t_ok(condición, mensaje) y t_como(uuid[, nivel, totp_hace])
-- =============================================================================
\set ON_ERROR_STOP 1

-- Los roles son globales al servidor: solo se crean si faltan.
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin bypassrls; end if;
end
$$;

create schema extensions;
create schema auth;
create schema storage;

create table auth.users (
  id uuid primary key default gen_random_uuid(),
  email text,
  raw_user_meta_data jsonb default '{}'
);
-- Como en Supabase: el "sub" del JWT (PostgREST lo deja en request.jwt.claims;
-- las pruebas SQL usan request.jwt.claim.sub con pruebas.t_como).
create function auth.uid() returns uuid language sql stable as $$
  select nullif(coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub'
  ), '')::uuid
$$;

-- Como en Supabase: todas las claims del JWT (aal, amr, email…).
create function auth.jwt() returns jsonb language sql stable as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim', true), ''),
    nullif(current_setting('request.jwt.claims', true), '')
  )::jsonb
$$;

create table storage.buckets (
  id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]
);
create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text, owner uuid);
alter table storage.objects enable row level security;
create function storage.foldername(name text) returns text[] language sql as $$ select string_to_array(name, '/') $$;

grant usage on schema public, auth, extensions, storage to anon, authenticated, service_role;
grant execute on function auth.uid(), auth.jwt() to anon, authenticated;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;

-- Helpers de prueba (esquema propio para no mezclarse con public)
create schema pruebas;
grant usage on schema pruebas to anon, authenticated;
create function pruebas.t_ok(cond boolean, msg text) returns void language plpgsql as $$
begin
  if cond is not true then raise exception 'FALLA: %', msg; end if;
  raise notice 'OK  %', msg;
end $$;
-- Sesión de prueba. Por defecto con el segundo factor recién verificado
-- (aal2 + código TOTP de hace 1 minuto), como un admin que entró al panel.
create function pruebas.t_como(uid uuid, nivel text default 'aal2', totp_hace interval default '1 minute')
returns void language plpgsql as $$
declare
  ahora bigint := extract(epoch from now())::bigint;
begin
  perform set_config('request.jwt.claim.sub', coalesce(uid::text, ''), false);
  perform set_config('request.jwt.claims', case when uid is null then '' else jsonb_build_object(
    'sub', uid,
    'role', 'authenticated',
    'aal', nivel,
    'amr', case when nivel = 'aal2'
      then jsonb_build_array(
        jsonb_build_object('method', 'totp', 'timestamp', ahora - extract(epoch from totp_hace)::bigint),
        jsonb_build_object('method', 'password', 'timestamp', ahora - 86400))
      else jsonb_build_array(jsonb_build_object('method', 'password', 'timestamp', ahora - 60)) end
  )::text end, false);
end $$;
grant execute on all functions in schema pruebas to anon, authenticated;
