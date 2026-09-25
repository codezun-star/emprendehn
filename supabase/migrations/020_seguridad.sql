-- =============================================================================
-- 020 · Seguridad: permisos mínimos, admin con verificación en dos pasos,
--       validaciones en la base y registro de actividad del admin
-- -----------------------------------------------------------------------------
-- · Supabase da por defecto TRUNCATE, REFERENCES y TRIGGER sobre las tablas a
--   anon y authenticated. La app no los usa y TRUNCATE ignora RLS: se quitan
--   (también para las tablas que se creen después).
-- · is_admin() exige, además del rol, una sesión verificada con el código de la
--   app de autenticación (aal2) hace menos de 12 horas. Con solo la contraseña
--   (aunque se la roben) no hay ningún poder de admin: ni en la web ni llamando
--   directo a la API. Antes de aplicar esta migración, el admin debe activar la
--   verificación en dos pasos en /dos-pasos (ver docs/seguridad.md).
-- · Validaciones que antes solo hacía la app (alguien con sesión puede escribir
--   directo a la API): redes sociales solo con enlaces http(s), y rutas de
--   fotos, logo y archivos con el formato que genera la app.
-- · admin_auditoria: qué cambió el admin, cuándo y quién (y cualquier cambio de
--   rol, venga de donde venga). Solo el admin la lee; nadie la edita.
-- Idempotente. Requiere: 002, 006, 007, 008, 011, 015
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Permisos mínimos
-- -----------------------------------------------------------------------------
revoke truncate, references, trigger on all tables in schema public from anon, authenticated;
alter default privileges in schema public revoke truncate, references, trigger on tables from anon, authenticated;

-- -----------------------------------------------------------------------------
-- 2. Admin = rol admin + segundo factor verificado hace menos de 12 horas
-- -----------------------------------------------------------------------------
-- auth.jwt() trae las claims del token que emitió Supabase Auth:
--   aal: 'aal1' (solo contraseña/Google) o 'aal2' (además, código TOTP)
--   amr: [{"method": "totp", "timestamp": 1790000000}, {"method": "password", …}]
-- La app pide el código de nuevo a las 12 h; la base da 10 minutos de margen.
-- Si algún día amr llegara en formato RFC 8176 (["totp", "password"], sin fecha),
-- se acepta igual con aal2: se pierde el vencimiento de 12 h, no el segundo factor.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  with jwt as (select auth.jwt() as c)
  select coalesce((select c ->> 'aal' from jwt), '') = 'aal2'
    and exists (
      select 1
      from jwt, jsonb_array_elements(
        case when jsonb_typeof(jwt.c -> 'amr') = 'array' then jwt.c -> 'amr' else '[]'::jsonb end
      ) as m
      where (m ->> 'method' = 'totp'
             and case when m ->> 'timestamp' ~ '^[0-9]{1,12}(\.[0-9]+)?$'
                      then (m ->> 'timestamp')::numeric else 0 end
                 > extract(epoch from now()) - (12 * 3600 + 600))
         or (jsonb_typeof(m) = 'string' and m #>> '{}' = 'totp')
    )
    and exists (
      select 1 from public.profiles
      where id = (select auth.uid()) and rol = 'admin'
    );
$$;

comment on function public.is_admin() is
  'true si el usuario tiene rol admin Y verificó el segundo factor (TOTP) hace menos de 12 h.';

-- El rol a secas (sin exigir el segundo factor): para PROHIBIR cosas a una
-- cuenta admin aunque todavía no haya ingresado su código. Una cuenta de admin
-- no se elimina desde el panel: con solo la contraseña robada tampoco.
create or replace function public.tiene_rol_admin()
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

create or replace function public.puedo_eliminar_mi_cuenta()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null
     and not public.tiene_rol_admin()
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
  if public.tiene_rol_admin() then
    raise exception 'Un administrador no puede eliminar su propia cuenta desde el panel.'
      using errcode = 'P0001', hint = 'cuenta_admin';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;

-- -----------------------------------------------------------------------------
-- 3. Validaciones en la base
-- -----------------------------------------------------------------------------
-- Redes: solo las claves que usa la app y enlaces http(s) sin espacios ni
-- comillas (nada de javascript:, data:, etc.).
create or replace function public.redes_sociales_validas(p_redes jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select jsonb_typeof(p_redes) = 'object'
    and not exists (
      select 1
      from jsonb_each(p_redes) as r(clave, valor)
      where r.clave not in ('facebook', 'instagram', 'tiktok', 'sitio_web')
         or jsonb_typeof(r.valor) <> 'string'
         or char_length(r.valor #>> '{}') > 500
         or (r.valor #>> '{}') !~ '^https?://[^\s/"<>\\][^\s"<>\\]*$'
    );
$$;

-- Se agregan sin revisar lo existente (not valid) y luego se validan aparte:
-- si hubiera datos viejos fuera de formato, la migración no falla y la regla
-- igual aplica a todo lo nuevo.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'businesses_redes_validas') then
    alter table public.businesses add constraint businesses_redes_validas
      check (public.redes_sociales_validas(redes_sociales)) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'businesses_logo_ruta_valida') then
    alter table public.businesses add constraint businesses_logo_ruta_valida
      check (logo_path is null or logo_path ~
        '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/logo-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(webp|jpg)$')
      not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'business_images_ruta_valida') then
    alter table public.business_images add constraint business_images_ruta_valida
      check (storage_path ~
        '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(webp|jpg)$')
      not valid;
  end if;
end
$$;

do $$
declare
  restriccion record;
begin
  for restriccion in
    select c.conname, c.conrelid::regclass as tabla
    from pg_constraint c
    where c.conname in ('businesses_redes_validas', 'businesses_logo_ruta_valida', 'business_images_ruta_valida')
      and not c.convalidated
  loop
    begin
      execute format('alter table %s validate constraint %I', restriccion.tabla, restriccion.conname);
    exception when check_violation then
      raise warning '%: hay filas antiguas fuera de formato; la regla aplica a los cambios nuevos.', restriccion.conname;
    end;
  end loop;
end
$$;

-- Storage: además de la carpeta del negocio propio, el nombre del archivo debe
-- tener el formato de la app ({negocio}/{uuid}.webp o {negocio}/logo-{uuid}.jpg).
drop policy if exists "business-images: dueño sube" on storage.objects;
create policy "business-images: dueño sube"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'business-images'
    and name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/(logo-)?[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(webp|jpg)$'
    and public.puede_gestionar_archivo_negocio(name)
  );

-- -----------------------------------------------------------------------------
-- 4. Registro de actividad del admin
-- -----------------------------------------------------------------------------
create table if not exists public.admin_auditoria (
  id          bigint generated always as identity primary key,
  created_at  timestamptz not null default now(),
  actor_id    uuid,  -- sin FK: el registro se conserva aunque se elimine la cuenta
  actor_email text,
  accion      text not null check (accion in ('crear', 'editar', 'eliminar')),
  tabla       text not null,
  registro_id text,
  registro    text,  -- nombre legible (negocio, categoría, correo…)
  cambios     jsonb not null default '{}'::jsonb  -- {"columna": [antes, después]}
);

comment on table public.admin_auditoria is
  'Cambios hechos con sesión de admin (y todo cambio de rol). La escriben solo triggers; solo el admin la lee.';

create index if not exists admin_auditoria_fecha_idx on public.admin_auditoria (created_at desc);

alter table public.admin_auditoria enable row level security;
revoke all on public.admin_auditoria from anon, authenticated;
grant select on public.admin_auditoria to authenticated;

drop policy if exists "admin_auditoria: admin lee" on public.admin_auditoria;
create policy "admin_auditoria: admin lee"
  on public.admin_auditoria for select to authenticated
  using ((select public.is_admin()));

create or replace function public.auditar_admin()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  antes   jsonb := case when tg_op <> 'INSERT' then to_jsonb(old) end;
  despues jsonb := case when tg_op <> 'DELETE' then to_jsonb(new) end;
  fila    jsonb := coalesce(despues, antes);
  cambios jsonb := '{}'::jsonb;
  clave   text;
  -- Columnas que calcula la base (no son decisiones del admin).
  ignorar constant text[] := array[
    'updated_at', 'documento_busqueda', 'search_vector', 'calificacion_promedio', 'total_resenas'
  ];
begin
  if tg_table_name = 'profiles' then
    -- Cambios de rol: siempre (también desde el SQL Editor, sin sesión).
    if coalesce(antes ->> 'rol', '') = coalesce(despues ->> 'rol', '')
       or (tg_op = 'INSERT' and despues ->> 'rol' <> 'admin')
       or (tg_op = 'DELETE' and antes ->> 'rol' <> 'admin') then
      return null;
    end if;
  elsif pg_trigger_depth() > 1 or not public.is_admin() then
    -- Solo acciones directas de una sesión de admin (no las de otros triggers).
    return null;
  elsif tg_op = 'DELETE' and antes ? 'business_id'
        and not exists (select 1 from public.businesses where id = (antes ->> 'business_id')::uuid) then
    -- Fotos, reseñas y reportes que se borran junto con su negocio (cascada):
    -- ya queda el registro del negocio eliminado.
    return null;
  end if;

  for clave in select jsonb_object_keys(coalesce(despues, antes)) loop
    if not (clave = any (ignorar))
       and (antes -> clave) is distinct from (despues -> clave)
       and not (tg_op <> 'UPDATE' and jsonb_typeof(fila -> clave) = 'null') then
      cambios := cambios || jsonb_build_object(clave, jsonb_build_array(antes -> clave, despues -> clave));
    end if;
  end loop;
  if tg_op = 'UPDATE' and cambios = '{}'::jsonb then
    return null;
  end if;

  insert into public.admin_auditoria (actor_id, actor_email, accion, tabla, registro_id, registro, cambios)
  values (
    auth.uid(),
    auth.jwt() ->> 'email',
    case tg_op when 'INSERT' then 'crear' when 'UPDATE' then 'editar' else 'eliminar' end,
    tg_table_name,
    coalesce(fila ->> 'id', fila ->> 'code'),
    left(coalesce(fila ->> 'nombre', fila ->> 'autor_nombre', fila ->> 'email', fila ->> 'motivo', fila ->> 'code'), 200),
    cambios
  );
  return null;
end;
$$;

revoke all on function public.auditar_admin() from public, anon, authenticated;

do $$
declare
  tabla text;
begin
  foreach tabla in array array[
    'businesses', 'business_images', 'business_reviews', 'business_reports',
    'categories', 'municipios', 'plans', 'profiles'
  ] loop
    execute format('drop trigger if exists %I on public.%I', tabla || '_90_auditar_admin', tabla);
    execute format(
      'create trigger %I after insert or update or delete on public.%I
         for each row execute function public.auditar_admin()',
      tabla || '_90_auditar_admin', tabla
    );
  end loop;
end
$$;
