-- =============================================================================
-- 007 · Galería de imágenes por negocio
-- -----------------------------------------------------------------------------
-- · Cada fila apunta a un archivo en Storage: business-images/{business_id}/{uuid}.webp
--   (un CHECK garantiza que la ruta esté dentro de la carpeta del negocio)
-- · Límite de imágenes según plans.max_imagenes, aplicado por trigger con
--   bloqueo de la fila del negocio (sin condiciones de carrera)
-- · orden: la imagen con menor orden es la portada
-- · RLS: se ven si el negocio es visible; solo el dueño agrega/edita;
--   dueño o admin eliminan
-- Requiere: 006
-- =============================================================================

create table if not exists public.business_images (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references public.businesses (id) on delete cascade,
  storage_path text not null unique,
  alt_text     text check (char_length(alt_text) <= 200),
  orden        smallint not null default 0,
  ancho        int check (ancho > 0),
  alto         int check (alto > 0),
  created_at   timestamptz not null default now(),
  constraint business_images_en_su_carpeta check (storage_path like business_id::text || '/%')
);

create index if not exists business_images_business_orden_idx
  on public.business_images (business_id, orden);

comment on table public.business_images is 'Galería de fotos del negocio (Supabase Storage, bucket business-images).';

-- -----------------------------------------------------------------------------
-- Límite por plan + orden al final de la galería
-- -----------------------------------------------------------------------------
create or replace function public.business_images_antes_de_insertar()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  limite int;
  actuales int;
begin
  -- Bloquea el negocio para serializar subidas simultáneas.
  select p.max_imagenes into limite
  from public.businesses b
  join public.plans p on p.code = b.plan
  where b.id = new.business_id
  for update of b;

  if limite is null then
    raise exception 'Negocio no encontrado.' using errcode = '23503';
  end if;

  select count(*), coalesce(max(orden) + 1, 0)
    into actuales, new.orden
  from public.business_images
  where business_id = new.business_id;

  if actuales >= limite then
    raise exception 'Tu plan permite un máximo de % imágenes.', limite
      using errcode = 'P0001', hint = 'limite_imagenes';
  end if;

  return new;
end;
$$;

drop trigger if exists business_images_10_antes_de_insertar on public.business_images;
create trigger business_images_10_antes_de_insertar
  before insert on public.business_images
  for each row execute function public.business_images_antes_de_insertar();

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------
alter table public.business_images enable row level security;

-- Hereda la visibilidad del negocio (RLS de businesses aplica dentro del EXISTS).
drop policy if exists "business_images: lectura" on public.business_images;
create policy "business_images: lectura"
  on public.business_images for select to anon, authenticated
  using (exists (select 1 from public.businesses b where b.id = business_id));

drop policy if exists "business_images: dueño agrega" on public.business_images;
create policy "business_images: dueño agrega"
  on public.business_images for insert to authenticated
  with check (public.es_dueno_negocio(business_id));

drop policy if exists "business_images: dueño edita" on public.business_images;
create policy "business_images: dueño edita"
  on public.business_images for update to authenticated
  using (public.es_dueno_negocio(business_id))
  with check (public.es_dueno_negocio(business_id));

drop policy if exists "business_images: dueño o admin elimina" on public.business_images;
create policy "business_images: dueño o admin elimina"
  on public.business_images for delete to authenticated
  using (public.es_dueno_negocio(business_id) or (select public.is_admin()));

revoke insert, update, delete on public.business_images from anon;
revoke update on public.business_images from authenticated;
grant select on public.business_images to anon, authenticated;
grant insert, delete on public.business_images to authenticated;
-- Solo texto alternativo y orden son editables.
grant update (alt_text, orden) on public.business_images to authenticated;
