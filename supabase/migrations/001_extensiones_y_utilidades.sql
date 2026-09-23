-- =============================================================================
-- 001 · Extensiones y funciones utilitarias
-- -----------------------------------------------------------------------------
-- · unaccent: para slugs y búsqueda sin acentos ("panaderia" encuentra "panadería")
-- · public.es_unaccent: configuración de búsqueda full-text en español sin acentos
-- · public.set_updated_at(): trigger genérico para mantener updated_at
-- · public.slugify(): convierte texto a slug URL-friendly
-- Idempotente: se puede volver a ejecutar sin romper nada.
-- =============================================================================

create extension if not exists unaccent with schema extensions;

-- Configuración de búsqueda: diccionario español (stemming) + quitar acentos.
do $$
begin
  if not exists (
    select 1 from pg_catalog.pg_ts_config
    where cfgname = 'es_unaccent' and cfgnamespace = 'public'::regnamespace
  ) then
    create text search configuration public.es_unaccent (copy = pg_catalog.spanish);
    alter text search configuration public.es_unaccent
      alter mapping for hword, hword_part, word
      with extensions.unaccent, pg_catalog.spanish_stem;
  end if;
end
$$;

-- Trigger genérico: actualiza updated_at en cada UPDATE.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- "Pupusería Doña Chepa & Hijos" -> "pupuseria-dona-chepa-hijos"
create or replace function public.slugify(texto text)
returns text
language sql
immutable
strict
parallel safe
set search_path = ''
as $$
  select trim(both '-' from regexp_replace(
    lower(extensions.unaccent('extensions.unaccent'::regdictionary, texto)),
    '[^a-z0-9]+', '-', 'g'
  ));
$$;

comment on function public.slugify(text) is
  'Convierte un texto a slug: minúsculas, sin acentos, solo [a-z0-9] separados por guiones.';
