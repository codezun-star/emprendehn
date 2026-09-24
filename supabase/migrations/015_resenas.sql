-- =============================================================================
-- 015 · Reseñas y calificaciones
-- -----------------------------------------------------------------------------
-- · business_reviews: una reseña (1–5 estrellas + comentario opcional) por
--   usuario y negocio publicado. Se publica al instante (moderación posterior):
--   el admin puede ocultarla. El dueño del negocio puede responderla una vez
--   (editable) y reportarla al admin. Nadie reseña su propio negocio.
-- · El nombre público se guarda al crear la reseña: primer nombre + inicial.
-- · Límite: 10 reseñas por usuario cada 24 horas.
-- · businesses.calificacion_promedio / total_resenas: se recalculan por trigger
--   (solo reseñas publicadas) y quedan protegidas por el trigger guardián.
-- · buscar_negocios devuelve también la calificación (reemplaza la de 013).
-- Idempotente. Requiere: 006, 010, 013
-- =============================================================================

alter table public.businesses
  add column if not exists calificacion_promedio numeric(2, 1),
  add column if not exists total_resenas int not null default 0;

comment on column public.businesses.calificacion_promedio is 'Promedio de reseñas publicadas (1.0–5.0), null si no hay (lo calcula un trigger)';
comment on column public.businesses.total_resenas is 'Número de reseñas publicadas (lo calcula un trigger)';

create table if not exists public.business_reviews (
  id            uuid primary key default gen_random_uuid(),
  business_id   uuid not null references public.businesses (id) on delete cascade,
  user_id       uuid not null references public.profiles (id) on delete cascade,
  autor_nombre  text not null default '' check (char_length(autor_nombre) <= 60),
  calificacion  smallint not null check (calificacion between 1 and 5),
  comentario    text check (char_length(comentario) <= 1000),
  estado        text not null default 'publicada' check (estado in ('publicada', 'oculta')),
  respuesta     text check (char_length(respuesta) <= 1000),
  respondida_en timestamptz,
  reportada     boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (business_id, user_id)
);

comment on table public.business_reviews is 'Reseñas de usuarios sobre negocios publicados.';

create index if not exists business_reviews_negocio_idx on public.business_reviews (business_id, created_at desc);
create index if not exists business_reviews_reportadas_idx on public.business_reviews (created_at desc) where reportada;
create index if not exists business_reviews_usuario_idx on public.business_reviews (user_id, created_at desc);

drop trigger if exists business_reviews_30_set_updated_at on public.business_reviews;
create trigger business_reviews_30_set_updated_at
  before update on public.business_reviews
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Guardián de reseñas: qué puede cambiar cada quien
-- -----------------------------------------------------------------------------
-- SECURITY INVOKER a propósito: es_contexto_privilegiado() debe ver el rol real.
-- Lo que lee (su perfil, sus reseñas, el negocio) ya se lo permite RLS.
create or replace function public.business_reviews_proteger()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  privilegiado boolean := public.es_contexto_privilegiado();
  uid uuid := auth.uid();
  nombre text;
  es_autor boolean;
  es_dueno boolean;
begin
  if tg_op = 'INSERT' then
    -- Con sesión (incluido el admin) se aplican las reglas; el SQL Editor no tiene sesión.
    if uid is not null then
      new.user_id       := uid;
      new.estado        := 'publicada';
      new.respuesta     := null;
      new.respondida_en := null;
      new.reportada     := false;

      if not exists (select 1 from public.businesses where id = new.business_id and estado = 'aprobado') then
        raise exception 'Este negocio no está publicado.' using errcode = 'P0001', hint = 'resena_no_publicado';
      end if;
      if exists (select 1 from public.businesses where id = new.business_id and owner_id = uid) then
        raise exception 'No puedes reseñar tu propio negocio.' using errcode = 'P0001', hint = 'resena_propia';
      end if;
      if (select count(*) from public.business_reviews
          where user_id = uid and created_at > now() - interval '24 hours') >= 10 then
        raise exception 'Alcanzaste el límite de reseñas por hoy. Inténtalo mañana.'
          using errcode = 'P0001', hint = 'limite_resenas';
      end if;
    end if;

    -- "Marta H." a partir del nombre del perfil (o del correo si no hay nombre).
    select coalesce(nullif(trim(p.nombre_completo), ''), split_part(p.email, '@', 1)) into nombre
    from public.profiles p where p.id = new.user_id;
    nombre := coalesce(nombre, 'Usuario');
    new.autor_nombre := left(
      split_part(nombre, ' ', 1)
      || case when split_part(nombre, ' ', 2) <> '' then ' ' || upper(left(split_part(nombre, ' ', 2), 1)) || '.' else '' end,
      60
    );
    new.comentario := nullif(trim(new.comentario), '');
    return new;
  end if;

  -- UPDATE
  new.comentario := nullif(trim(new.comentario), '');
  new.respuesta  := nullif(trim(new.respuesta), '');
  if new.respuesta is distinct from old.respuesta then
    new.respondida_en := case when new.respuesta is null then null else now() end;
  else
    new.respondida_en := old.respondida_en;
  end if;

  if privilegiado then
    return new;
  end if;

  es_autor := old.user_id = uid;
  es_dueno := public.es_dueno_negocio(old.business_id);

  if new.business_id  is distinct from old.business_id
  or new.user_id      is distinct from old.user_id
  or new.autor_nombre is distinct from old.autor_nombre
  or new.estado       is distinct from old.estado
  or new.created_at   is distinct from old.created_at
  or ((new.calificacion is distinct from old.calificacion or new.comentario is distinct from old.comentario) and not es_autor)
  or (new.respuesta is distinct from old.respuesta and not es_dueno)
  or (new.reportada is distinct from old.reportada and not (es_dueno and new.reportada)) then
    raise exception 'No tienes permiso para cambiar eso en esta reseña.' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists business_reviews_10_proteger on public.business_reviews;
create trigger business_reviews_10_proteger
  before insert or update on public.business_reviews
  for each row execute function public.business_reviews_proteger();

-- -----------------------------------------------------------------------------
-- Promedio y total en businesses
-- -----------------------------------------------------------------------------
create or replace function public.business_reviews_recalcular()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  negocio uuid;
begin
  for negocio in
    select distinct x from unnest(array[
      case when tg_op in ('UPDATE', 'DELETE') then old.business_id end,
      case when tg_op in ('INSERT', 'UPDATE') then new.business_id end
    ]) as x where x is not null
  loop
    update public.businesses b
    set total_resenas = r.total,
        calificacion_promedio = r.promedio
    from (
      select count(*)::int as total, round(avg(calificacion)::numeric, 1) as promedio
      from public.business_reviews
      where business_id = negocio and estado = 'publicada'
    ) r
    where b.id = negocio
      and (b.total_resenas is distinct from r.total or b.calificacion_promedio is distinct from r.promedio);
  end loop;
  return null;
end;
$$;

drop trigger if exists business_reviews_20_recalcular on public.business_reviews;
create trigger business_reviews_20_recalcular
  after insert or update or delete on public.business_reviews
  for each row execute function public.business_reviews_recalcular();

-- -----------------------------------------------------------------------------
-- Trigger guardián de businesses (reemplaza el de 010): el dueño tampoco puede
-- tocar la calificación. Igual al de 010 salvo las dos columnas nuevas.
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
-- RLS
-- -----------------------------------------------------------------------------
alter table public.business_reviews enable row level security;

-- Públicas: reseñas publicadas de negocios visibles. Además cada quien ve las
-- suyas, el dueño las de sus negocios y el admin todas.
drop policy if exists "business_reviews: lectura" on public.business_reviews;
create policy "business_reviews: lectura"
  on public.business_reviews for select to anon, authenticated
  using (
    (estado = 'publicada' and exists (
      select 1 from public.businesses b where b.id = business_id and b.estado = 'aprobado'
    ))
    or user_id = (select auth.uid())
    or public.es_dueno_negocio(business_id)
    or (select public.is_admin())
  );

drop policy if exists "business_reviews: usuario crea" on public.business_reviews;
create policy "business_reviews: usuario crea"
  on public.business_reviews for insert to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists "business_reviews: autor, dueño o admin edita" on public.business_reviews;
create policy "business_reviews: autor, dueño o admin edita"
  on public.business_reviews for update to authenticated
  using (user_id = (select auth.uid()) or public.es_dueno_negocio(business_id) or (select public.is_admin()))
  with check (user_id = (select auth.uid()) or public.es_dueno_negocio(business_id) or (select public.is_admin()));

drop policy if exists "business_reviews: autor o admin elimina" on public.business_reviews;
create policy "business_reviews: autor o admin elimina"
  on public.business_reviews for delete to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));

revoke all on public.business_reviews from anon, authenticated;
grant select on public.business_reviews to anon, authenticated;
grant insert (business_id, calificacion, comentario) on public.business_reviews to authenticated;
grant update (calificacion, comentario, respuesta, reportada, estado) on public.business_reviews to authenticated;
grant delete on public.business_reviews to authenticated;

-- -----------------------------------------------------------------------------
-- buscar_negocios con calificación (reemplaza la versión de 013: cambia el tipo
-- de retorno, así que se elimina y se vuelve a crear).
-- -----------------------------------------------------------------------------
drop function if exists public.buscar_negocios(text, text, text, int, int, text, boolean);

create or replace function public.buscar_negocios(
  p_texto          text default null,
  p_categoria      text default null,
  p_ciudad         text default null,
  p_limite         int  default 24,
  p_desplazamiento int  default 0,
  p_orden          text default 'relevancia', -- 'relevancia' | 'recientes'
  p_abierto        boolean default false      -- true: solo los abiertos ahora (hora de Honduras)
)
returns table (
  id                    uuid,
  nombre                text,
  slug                  text,
  descripcion           text,
  localidad             text,
  plan                  text,
  categoria_nombre      text,
  categoria_slug        text,
  municipio_nombre      text,
  municipio_slug        text,
  departamento_nombre   text,
  portada_path          text,
  logo_path             text,
  calificacion_promedio numeric,
  total_resenas         int,
  total                 bigint
)
language sql
stable
set search_path = ''
as $$
  with q as (
    select public.construir_tsquery(p_texto) as tsq
  ),
  base as (
    select
      b.id, b.nombre, b.slug, b.descripcion, b.localidad, b.plan, b.logo_path, b.aprobado_en,
      b.calificacion_promedio, b.total_resenas,
      c.nombre as categoria_nombre, c.slug as categoria_slug,
      m.nombre as municipio_nombre, m.slug as municipio_slug,
      d.nombre as departamento_nombre,
      pl.prioridad,
      b.search_vector || to_tsvector(
        'public.es_unaccent',
        c.nombre || ' ' || coalesce(cp.nombre, '') || ' ' || m.nombre || ' ' || d.nombre
      ) as documento
    from public.businesses b
    join public.categories c        on c.id = b.category_id
    left join public.categories cp  on cp.id = c.parent_id
    join public.municipios m        on m.id = b.municipio_id
    join public.departamentos d     on d.id = m.departamento_id
    join public.plans pl            on pl.code = b.plan
    where b.estado = 'aprobado'
      and (p_categoria is null or c.slug = p_categoria or cp.slug = p_categoria)
      and (p_ciudad is null or m.slug = p_ciudad)
      and (not coalesce(p_abierto, false) or public.esta_abierto(b.horario))
  ),
  filtrados as (
    select base.*,
      case when q.tsq is null then 0 else ts_rank(base.documento, q.tsq) end as rango
    from base
    cross join q
    where q.tsq is null or base.documento @@ q.tsq
  )
  select
    f.id, f.nombre, f.slug, f.descripcion, f.localidad, f.plan,
    f.categoria_nombre, f.categoria_slug,
    f.municipio_nombre, f.municipio_slug, f.departamento_nombre,
    (
      select i.storage_path from public.business_images i
      where i.business_id = f.id
      order by i.orden, i.created_at
      limit 1
    ) as portada_path,
    f.logo_path,
    f.calificacion_promedio,
    f.total_resenas,
    count(*) over () as total
  from filtrados f
  order by
    case when p_orden = 'recientes' then f.aprobado_en end desc nulls last,
    f.rango desc,
    f.prioridad desc,
    f.nombre
  limit least(greatest(coalesce(p_limite, 24), 1), 100)
  offset greatest(coalesce(p_desplazamiento, 0), 0);
$$;

comment on function public.buscar_negocios(text, text, text, int, int, text, boolean) is
  'Busca negocios aprobados por texto, categoría (slug, incluye subcategorías), ciudad (slug de municipio) y, opcionalmente, solo los abiertos ahora. Incluye la calificación.';
