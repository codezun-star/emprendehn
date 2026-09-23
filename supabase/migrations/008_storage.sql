-- =============================================================================
-- 008 · Storage: bucket de imágenes de negocios
-- -----------------------------------------------------------------------------
-- · Bucket "business-images" PÚBLICO para lectura: las fotos se sirven por CDN
--   y Google Imágenes puede indexarlas. Las rutas llevan UUID (no adivinables).
-- · Límite 5 MB por archivo; solo JPEG, PNG y WebP.
-- · Estructura de rutas: {business_id}/{uuid}.webp
-- · Políticas en storage.objects: solo el dueño del negocio (primera carpeta
--   de la ruta) puede subir/borrar; el admin puede borrar cualquier archivo.
-- Requiere: 006
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'business-images',
  'business-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public             = excluded.public,
  file_size_limit    = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- ¿El usuario actual es dueño del negocio cuya carpeta encabeza la ruta?
create or replace function public.puede_gestionar_archivo_negocio(p_ruta text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  carpeta text := split_part(p_ruta, '/', 1);
begin
  if carpeta !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return false;
  end if;
  return exists (
    select 1 from public.businesses
    where id = carpeta::uuid and owner_id = (select auth.uid())
  );
end;
$$;

drop policy if exists "business-images: dueño lista" on storage.objects;
create policy "business-images: dueño lista"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'business-images'
    and (public.puede_gestionar_archivo_negocio(name) or (select public.is_admin()))
  );

drop policy if exists "business-images: dueño sube" on storage.objects;
create policy "business-images: dueño sube"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'business-images'
    and public.puede_gestionar_archivo_negocio(name)
  );

drop policy if exists "business-images: dueño o admin elimina" on storage.objects;
create policy "business-images: dueño o admin elimina"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'business-images'
    and (public.puede_gestionar_archivo_negocio(name) or (select public.is_admin()))
  );
