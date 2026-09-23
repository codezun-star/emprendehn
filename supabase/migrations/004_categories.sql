-- =============================================================================
-- 004 · Categorías de negocio (dos niveles: categoría > subcategoría)
-- -----------------------------------------------------------------------------
-- · Slug único GLOBAL -> /categoria/panaderias funciona para padres e hijas
-- · schema_type: tipo schema.org para el JSON-LD (Bakery, BeautySalon, Plumber…)
-- · descripcion: texto introductorio de la página de categoría (contenido SEO)
-- · icono: nombre de ícono (lucide) para las categorías principales
-- · Máximo 2 niveles, validado por trigger
-- · RLS: lectura pública de las activas; escritura solo admin
-- · Seed inicial editable desde /admin/categorias
-- Requiere: 001, 002
-- =============================================================================

create table if not exists public.categories (
  id          uuid primary key default gen_random_uuid(),
  parent_id   uuid references public.categories (id) on delete restrict,
  nombre      text not null check (char_length(trim(nombre)) between 2 and 80),
  slug        text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 80),
  descripcion text check (char_length(descripcion) <= 1000),
  schema_type text not null default 'LocalBusiness' check (schema_type ~ '^[A-Z][A-Za-z]+$'),
  icono       text check (icono ~ '^[a-z0-9-]+$'),
  orden       smallint not null default 0,
  destacada   boolean not null default false,
  activa      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint categories_no_self_parent check (parent_id is distinct from id)
);

create index if not exists categories_parent_idx on public.categories (parent_id);

comment on table public.categories is 'Categorías (parent_id null) y subcategorías de negocio.';

-- -----------------------------------------------------------------------------
-- Trigger: slug automático + máximo dos niveles
-- -----------------------------------------------------------------------------
create or replace function public.categories_validar()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.slug is null or new.slug = '' then
    new.slug := public.slugify(new.nombre);
  else
    new.slug := public.slugify(new.slug);
  end if;

  if new.parent_id is not null then
    if exists (select 1 from public.categories where id = new.parent_id and parent_id is not null) then
      raise exception 'Solo se permiten dos niveles: la categoría padre no puede ser una subcategoría.'
        using errcode = '23514';
    end if;
    if tg_op = 'UPDATE' and exists (select 1 from public.categories where parent_id = new.id) then
      raise exception 'Esta categoría tiene subcategorías; no puede convertirse en subcategoría.'
        using errcode = '23514';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists categories_10_validar on public.categories;
create trigger categories_10_validar
  before insert or update on public.categories
  for each row execute function public.categories_validar();

drop trigger if exists categories_20_set_updated_at on public.categories;
create trigger categories_20_set_updated_at
  before update on public.categories
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------
alter table public.categories enable row level security;

drop policy if exists "categories: lectura" on public.categories;
create policy "categories: lectura"
  on public.categories for select to anon, authenticated
  using (activa or (select public.is_admin()));

drop policy if exists "categories: admin inserta" on public.categories;
create policy "categories: admin inserta"
  on public.categories for insert to authenticated
  with check ((select public.is_admin()));

drop policy if exists "categories: admin edita" on public.categories;
create policy "categories: admin edita"
  on public.categories for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

drop policy if exists "categories: admin elimina" on public.categories;
create policy "categories: admin elimina"
  on public.categories for delete to authenticated
  using ((select public.is_admin()));

revoke insert, update, delete on public.categories from anon;
grant select on public.categories to anon, authenticated;
grant insert, update, delete on public.categories to authenticated;

-- -----------------------------------------------------------------------------
-- Seed inicial
-- -----------------------------------------------------------------------------
insert into public.categories (nombre, slug, schema_type, icono, orden, destacada, descripcion) values
  ('Comida y bebidas',          'comida-y-bebidas',        'FoodEstablishment',           'utensils',       1,  true,  'Restaurantes, comida típica, panaderías, cafeterías y más negocios de comida en Honduras.'),
  ('Belleza y cuidado personal','belleza',                 'HealthAndBeautyBusiness',     'sparkles',       2,  true,  'Salones de belleza, barberías, uñas, spa y maquillaje cerca de ti.'),
  ('Servicios para el hogar',   'hogar',                   'HomeAndConstructionBusiness', 'house',          3,  true,  'Plomeros, electricistas, carpinteros, técnicos de aire acondicionado y más servicios para tu casa.'),
  ('Tiendas y comercio',        'tiendas',                 'Store',                       'store',          4,  true,  'Pulperías, ferreterías, ropa, celulares, artesanías y tiendas locales.'),
  ('Salud',                     'salud',                   'MedicalBusiness',             'heart-pulse',    5,  true,  'Clínicas, dentistas, farmacias, ópticas y profesionales de la salud.'),
  ('Automotriz',                'automotriz',              'AutomotiveBusiness',          'car',            6,  true,  'Talleres mecánicos, lavado de autos, repuestos y llanteras.'),
  ('Servicios profesionales',   'servicios-profesionales', 'ProfessionalService',         'briefcase',      7,  true,  'Abogados, contadores, diseñadores, fotógrafos y bienes raíces.'),
  ('Mascotas',                  'mascotas',                'LocalBusiness',               'paw-print',      8,  false, 'Veterinarias, tiendas y estética para mascotas.'),
  ('Educación y clases',        'educacion',               'LocalBusiness',               'graduation-cap', 9,  false, 'Tutorías, academias de idiomas y clases de música y arte.'),
  ('Eventos y fiestas',         'eventos',                 'LocalBusiness',               'party-popper',   10, true,  'Decoración, alquiler de mobiliario, música y todo para tus eventos.'),
  ('Tecnología',                'tecnologia',              'LocalBusiness',               'laptop',         11, false, 'Reparación de celulares y computadoras, desarrollo web y servicios digitales.'),
  ('Turismo y hospedaje',       'turismo',                 'LodgingBusiness',             'bed',            12, false, 'Hoteles, hostales, tours y guías turísticos en Honduras.'),
  ('Transporte y envíos',       'transporte',              'LocalBusiness',               'truck',          13, false, 'Mudanzas, fletes, envíos y mandados.')
on conflict (slug) do nothing;

with hijas (padre, nombre, slug, schema_type, orden) as (
  values
  ('comida-y-bebidas', 'Restaurantes',                      'restaurantes',            'Restaurant',          1),
  ('comida-y-bebidas', 'Comida típica',                     'comida-tipica',           'Restaurant',          2),
  ('comida-y-bebidas', 'Panaderías',                        'panaderias',              'Bakery',              3),
  ('comida-y-bebidas', 'Repostería y pasteles',             'reposteria',              'Bakery',              4),
  ('comida-y-bebidas', 'Cafeterías',                        'cafeterias',              'CafeOrCoffeeShop',    5),
  ('comida-y-bebidas', 'Comida rápida',                     'comida-rapida',           'FastFoodRestaurant',  6),
  ('comida-y-bebidas', 'Comida por encargo y catering',     'catering',                'FoodEstablishment',   7),
  ('belleza',          'Salones de belleza',                'salones-de-belleza',      'BeautySalon',         1),
  ('belleza',          'Barberías',                         'barberias',               'HairSalon',           2),
  ('belleza',          'Uñas y pestañas',                   'unas-y-pestanas',         'NailSalon',           3),
  ('belleza',          'Spa y masajes',                     'spa-y-masajes',           'DaySpa',              4),
  ('belleza',          'Maquillaje',                        'maquillaje',              'HealthAndBeautyBusiness', 5),
  ('hogar',            'Plomeros',                          'plomeros',                'Plumber',             1),
  ('hogar',            'Electricistas',                     'electricistas',           'Electrician',         2),
  ('hogar',            'Carpintería',                       'carpinteria',             'GeneralContractor',   3),
  ('hogar',            'Construcción y albañilería',        'construccion',            'GeneralContractor',   4),
  ('hogar',            'Aire acondicionado y refrigeración','aire-acondicionado',      'HVACBusiness',        5),
  ('hogar',            'Pintores',                          'pintores',                'HousePainter',        6),
  ('hogar',            'Cerrajería',                        'cerrajeria',              'Locksmith',           7),
  ('hogar',            'Limpieza y fumigación',             'limpieza',                'ProfessionalService', 8),
  ('tiendas',          'Pulperías y abarroterías',          'pulperias',               'ConvenienceStore',    1),
  ('tiendas',          'Ropa y calzado',                    'ropa-y-calzado',          'ClothingStore',       2),
  ('tiendas',          'Ferreterías',                       'ferreterias',             'HardwareStore',       3),
  ('tiendas',          'Celulares y accesorios',            'celulares',               'MobilePhoneStore',    4),
  ('tiendas',          'Artesanías y regalos',              'artesanias',              'Store',               5),
  ('tiendas',          'Floristerías',                      'floristerias',            'Florist',             6),
  ('tiendas',          'Muebles',                           'muebles',                 'FurnitureStore',      7),
  ('tiendas',          'Librerías y papelerías',            'librerias',               'BookStore',           8),
  ('salud',            'Clínicas y médicos',                'clinicas',                'MedicalClinic',       1),
  ('salud',            'Dentistas',                         'dentistas',               'Dentist',             2),
  ('salud',            'Farmacias',                         'farmacias',               'Pharmacy',            3),
  ('salud',            'Ópticas',                           'opticas',                 'Optician',            4),
  ('salud',            'Psicología y terapias',             'psicologia',              'MedicalBusiness',     5),
  ('automotriz',       'Talleres mecánicos',                'talleres-mecanicos',      'AutoRepair',          1),
  ('automotriz',       'Lavado de autos',                   'lavado-de-autos',         'AutoWash',            2),
  ('automotriz',       'Repuestos',                         'repuestos',               'AutoPartsStore',      3),
  ('automotriz',       'Llanteras',                         'llanteras',               'TireShop',            4),
  ('servicios-profesionales', 'Abogados y notarios',        'abogados',                'Attorney',            1),
  ('servicios-profesionales', 'Contadores',                 'contadores',              'AccountingService',   2),
  ('servicios-profesionales', 'Diseño y publicidad',        'diseno-y-publicidad',     'ProfessionalService', 3),
  ('servicios-profesionales', 'Fotografía y video',         'fotografia',              'ProfessionalService', 4),
  ('servicios-profesionales', 'Bienes raíces',              'bienes-raices',           'RealEstateAgent',     5),
  ('mascotas',         'Veterinarias',                      'veterinarias',            'LocalBusiness',       1),
  ('mascotas',         'Tiendas de mascotas',               'tiendas-de-mascotas',     'PetStore',            2),
  ('mascotas',         'Estética de mascotas',              'estetica-de-mascotas',    'LocalBusiness',       3),
  ('educacion',        'Tutorías y reforzamiento',          'tutorias',                'LocalBusiness',       1),
  ('educacion',        'Academias de idiomas',              'idiomas',                 'LocalBusiness',       2),
  ('educacion',        'Clases de música y arte',           'clases-de-musica-y-arte', 'LocalBusiness',       3),
  ('eventos',          'Decoración de eventos',             'decoracion-de-eventos',   'LocalBusiness',       1),
  ('eventos',          'Alquiler de mobiliario',            'alquiler-de-mobiliario',  'LocalBusiness',       2),
  ('eventos',          'Música y DJ',                       'musica-y-dj',             'EntertainmentBusiness', 3),
  ('eventos',          'Salones de eventos',                'salones-de-eventos',      'LocalBusiness',       4),
  ('tecnologia',       'Reparación de celulares y computadoras', 'reparacion-de-equipos', 'LocalBusiness',  1),
  ('tecnologia',       'Desarrollo web y software',         'desarrollo-web',          'ProfessionalService', 2),
  ('tecnologia',       'Cibercafés e impresiones',          'cibercafes',              'InternetCafe',        3),
  ('turismo',          'Hoteles y hostales',                'hoteles',                 'Hotel',               1),
  ('turismo',          'Tours y guías',                     'tours',                   'TravelAgency',        2),
  ('transporte',       'Mudanzas y fletes',                 'mudanzas',                'MovingCompany',       1),
  ('transporte',       'Envíos y mandados',                 'envios',                  'LocalBusiness',       2)
)
insert into public.categories (parent_id, nombre, slug, schema_type, orden)
select p.id, h.nombre, h.slug, h.schema_type, h.orden
from hijas h
join public.categories p on p.slug = h.padre
on conflict (slug) do nothing;
