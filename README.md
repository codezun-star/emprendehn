# EmprendeHN

Directorio electrónico de emprendedores y negocios de Honduras (**emprendehn.com**).
Los emprendedores que no tienen presupuesto para una página web crean gratis el perfil
de su negocio dentro de la plataforma, bajo un dominio con autoridad compartida y
optimizado para SEO, como Yelp o TripAdvisor.

> Plan de arquitectura y esquema de datos: [`docs/arquitectura.md`](docs/arquitectura.md)

## Stack

| Pieza | Versión | Notas |
|---|---|---|
| Next.js (App Router, Turbopack) | 16.3.x | SSR/ISR para SEO. En Next 16, `middleware.ts` se llama `proxy.ts` |
| React | 19.2.x | |
| TypeScript | 5.9.x | La que usa la plantilla oficial de Next 16 |
| Tailwind CSS | 4.3.x | Tokens de color en `src/app/globals.css` (`@theme`) |
| Supabase (`supabase-js` + `@supabase/ssr`) | 2.116 / 0.12 | Postgres, Auth, Storage |
| Zod | 4.5.x | Mismo esquema en cliente y servidor |
| react-hook-form | 7.87.x | Con `@hookform/resolvers` 5 |

Paleta (clases de Tailwind): `brand-dark` #0F3D5E · `brand` #1B6FA8 · `brand-light` #F2F6F8 ·
`accent` #FF7A3D · `ink` #1A1A1A. Sobre fondo `accent` se usa texto `ink`: el blanco no
cumple el contraste mínimo de WCAG AA.

## Puesta en marcha

### 1. Dependencias y variables de entorno

```bash
npm install
cp .env.example .env.local   # completar URL y publishable key de Supabase
```

| Variable | Valor |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://<project-ref>.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_…` (la anon key legacy también funciona) |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` en desarrollo y `https://emprendehn.com` en producción |

No se necesita la service role key: todo, incluido el panel de admin, pasa por RLS.

### 2. Migraciones (las aplicas tú en el SQL Editor de Supabase)

Ejecuta los archivos de `supabase/migrations/` **en orden**. Todos se pueden volver a
ejecutar sin romper nada.

| # | Archivo | Qué hace |
|---|---|---|
| 001 | `extensiones_y_utilidades` | `unaccent`, búsqueda en español sin acentos (`es_unaccent`), `slugify()`, `set_updated_at()` |
| 002 | `profiles_y_roles` | Enum `user_role`, `profiles` (se crea con un trigger al registrarse), `is_admin()`, RLS |
| 003 | `ubicaciones` | 18 departamentos + 298 municipios (la "ciudad" de las URLs), RLS |
| 004 | `categories` | Categorías de 2 niveles, `schema_type` de schema.org, seed de 13 principales y 59 subcategorías |
| 005 | `plans` | Planes `gratis`/`basico`/`premium` con `max_imagenes` y `prioridad` |
| 006 | `businesses` | Negocios, búsqueda full-text, índices, trigger de slug único, trigger guardián de campos de admin, RLS |
| 007 | `business_images` | Galería, límite de fotos por plan (trigger), RLS |
| 008 | `storage` | Bucket público `business-images` (5 MB, JPEG/PNG/WebP) y políticas de Storage |
| 009 | `funciones_directorio` | RPC `buscar_negocios` y `resumen_directorio` |

### 3. Configuración de Supabase Auth (dashboard)

1. **Authentication → URL Configuration**
   - *Site URL*: `http://localhost:3000` mientras desarrollas y `https://emprendehn.com` en producción.
     Los enlaces de los correos usan esta URL.
   - *Redirect URLs*: `http://localhost:3000/**` y `https://emprendehn.com/**`.
2. **Authentication → Sign In / Providers → Email**: deja activado *Confirm email*.
3. **Authentication → Emails → Templates**: pega las plantillas en español.
   - *Confirm signup* → `supabase/templates/confirmacion.html` (asunto: `Confirma tu cuenta en EmprendeHN`)
   - *Reset password* → `supabase/templates/recuperacion.html` (asunto: `Restablece tu contraseña de EmprendeHN`)

   Los enlaces apuntan a `/auth/confirm?token_hash=…`, que es el flujo recomendado para SSR.
4. **SMTP (antes de lanzar)**: el SMTP de Supabase permite muy pocos correos por hora.
   Configura Resend en *Authentication → Emails → SMTP Settings*: host `smtp.resend.com`,
   puerto `465`, usuario `resend` y tu API key de Resend como contraseña.
5. *(Recomendado)* **Attack Protection**: activa CAPTCHA (Turnstile o hCaptcha) para frenar
   registros automatizados.

### 4. Primer administrador

Regístrate en `/registro`, confirma el correo y ejecuta en el SQL Editor:

```sql
update public.profiles set rol = 'admin' where email = 'tu-correo@ejemplo.com';
```

El rol nunca se toma de los datos del registro, así que un usuario no puede darse admin
a sí mismo.

### 5. Desarrollo

```bash
npm run dev        # http://localhost:3000
npm run lint
npm run typecheck
npm run build
```

## Estructura

```
src/
  app/
    (publico)/            inicio, /categorias, /categoria/[c], /categoria/[c]/[ciudad], /negocio/[slug], /buscar
    (auth)/               /ingresar, /registro, /recuperar-contrasena, /nueva-contrasena
    auth/confirm|callback enlaces de correo (verifyOtp) y OAuth (listo para Google)
    panel/                panel del emprendedor (crear/editar, horario, logo y fotos, vista previa)
    admin/                moderación de negocios y categorías
    sitemap.ts robots.ts opengraph-image.tsx icon.svg
  components/             ui/, directorio/, panel/, admin/, auth/, layout/, seo/
  lib/
    supabase/             server.ts (cookies) · client.ts (navegador) · publico.ts (sin cookies, ISR) · proxy.ts
    consultas/            lecturas (directorio público, panel, admin)
    acciones/             server actions (auth, negocios, galería, admin)
    validaciones/         esquemas Zod compartidos cliente/servidor
    seo.ts horario.ts telefono.ts revalidacion.ts …
  proxy.ts                refresca la sesión y protege /panel y /admin
  types/database.types.ts tipos del esquema
supabase/migrations/      SQL numerado (aplicación manual)
supabase/templates/       plantillas de correo de Auth
```

## Decisiones técnicas

- **Tres clientes de Supabase.** Las páginas públicas usan un cliente anónimo *sin cookies*
  (`lib/supabase/publico.ts`). Así Next puede prerenderizarlas y cachearlas; leer cookies
  las volvería dinámicas.
- **ISR con revalidación on-demand.** `/negocio/[slug]` y `/categoria/…` se generan en la
  primera visita y quedan en caché (`generateStaticParams` devuelve `[]`). Cuando el dueño
  edita, sube fotos o el admin cambia el estado, las server actions llaman a
  `revalidatePath` para la página del negocio, sus listados (categoría, categoría padre y
  cada una con su ciudad), el inicio y el sitemap (`lib/revalidacion.ts`). Como red de
  seguridad, los negocios se revalidan cada 24 h y los listados cada hora.
  **Los cambios hechos directo por SQL no disparan la revalidación**: se verán cuando
  expire ese tiempo.
- **Slugs.** Los genera un trigger en la base de datos: `pupuseria-dona-chepa`; si ya
  existe, `…-san-pedro-sula`; si aún existe, `…-san-pedro-sula-2`. Un advisory lock evita
  condiciones de carrera. El slug no cambia al editar el nombre (URL estable); solo el
  admin puede cambiarlo.
- **Seguridad en capas.** `proxy.ts` redirige, layouts y server actions vuelven a
  verificar el usuario y el rol, y RLS decide al final. Como RLS es por fila, un trigger
  guardián impide que un no-admin cambie `estado`, `plan`, `slug`, `owner_id` o
  `motivo_estado`. Los grants por columna limitan lo que un usuario puede editar de su
  perfil y de sus fotos.
- **Moderación.** Todo negocio nuevo queda `pendiente`. Si el dueño edita un negocio
  aprobado, los cambios se publican al instante. Si el negocio está `rechazado`, al
  editarlo vuelve solo a `pendiente`. Máximo 3 negocios por cuenta (anti-spam).
- **Imágenes.** El navegador las redimensiona (máx. 1600 px), las convierte a WebP y les
  quita los metadatos EXIF, incluida la ubicación GPS. Luego las sube directo a Storage;
  las políticas de Storage solo permiten escribir en la carpeta de tus negocios. Se
  muestran con `next/image` usando pocos tamaños, para no gastar la cuota de optimización
  de Vercel.
- **SEO.** `generateMetadata` único por página, canonical y Open Graph con la foto de
  portada. JSON-LD `LocalBusiness` con el subtipo de la categoría (`Bakery`,
  `BeautySalon`…), incluyendo `openingHoursSpecification`, `sameAs` y `BreadcrumbList`.
  El sitemap solo incluye páginas con contenido; las combinaciones categoría + ciudad sin
  negocios llevan `noindex`, y `/buscar` se excluye en `robots.txt`.
- **Formularios:** react-hook-form + Zod 4. El mismo esquema valida en el navegador y
  otra vez en la server action.

## Despliegue en Vercel

1. Importa el repositorio y define las 3 variables de entorno. Usa
   `NEXT_PUBLIC_SITE_URL=https://emprendehn.com` en *Production*.
2. Agrega el dominio `emprendehn.com` y actualiza *Site URL* y *Redirect URLs* en Supabase.
3. En los deploys de *Preview*, `robots.txt` bloquea la indexación (no compiten con el
   dominio real en Google).

## Cómo se validó

Las migraciones y la app se probaron contra un Supabase **local y desechable** (Supabase
CLI + Docker en el entorno de desarrollo), nunca contra el proyecto real:

- Pruebas de RLS y triggers con usuarios `anon`, dueño, otro dueño y admin: permisos,
  slugs con colisión, límites de negocios y fotos, reenvío a revisión.
- Prueba E2E con Playwright contra el build de producción: registro con confirmación por
  correo, creación del negocio, fotos y logo en Storage, moderación, páginas públicas,
  metadata y JSON-LD, revalidación on-demand, búsqueda, recuperación de contraseña,
  categorías y vista móvil.

## Fuera del alcance del MVP (siguiente fase)

Pagos y suscripciones (`subscriptions`), destacados pagados por categoría/ciudad
(`featured_placements`), dominio personalizado por negocio (`business_domains`), reseñas,
catálogo de productos, notificaciones por correo (ver `src/lib/email.ts`) y blog. El
esquema ya los contempla: ver `docs/arquitectura.md` §3.6.
