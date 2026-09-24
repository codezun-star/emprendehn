# EmprendeHN — Plan de arquitectura y esquema de datos (MVP)

> Estado: **implementado (MVP)**. Plan aprobado; las decisiones pendientes se tomaron
> con la opción recomendada (ver §6). Las migraciones SQL están en `supabase/migrations/`
> y las aplica manualmente el dueño del proyecto. Instrucciones de puesta en marcha en el
> [README](../README.md).

---

## 1. Versiones de dependencias

Criterio: la última versión estable que ya tenga unas semanas y parches publicados. Nada
de canary, beta o releases de menos de ~3 semanas.

| Paquete | Versión propuesta | Motivo |
|---|---|---|
| `next` | **16.3.x** (16.3.6) | 16.3.0 salió el 3-ago-2026 y ya lleva 6 parches. |
| `react` / `react-dom` | **19.2.x** (19.2.8) | 19.3.0 salió hace solo 2 semanas (9-sep), así que espero. |
| `typescript` | **5.9.x** | TS 7 (el port nativo en Go) es `latest` desde julio, pero la plantilla oficial de `create-next-app@16.3.6` sigue fijando `^5`. Next usa la API JS de TypeScript para el type-check del build. |
| `tailwindcss` + `@tailwindcss/postcss` | **4.3.x** | Ver §1.1 (decisión pendiente). |
| `@supabase/supabase-js` | **2.x** (≈2.116) | Supabase publica minors casi cada semana. Fijo la versión con el lockfile. |
| `@supabase/ssr` | **0.12.x** | Paquete oficial para manejar la sesión con cookies en App Router (sigue en 0.x, pero es el recomendado). |
| `zod` | **4.5.x** | 4.6.0 salió el 9-sep y tuvo 5 parches en 4 días, así que espero a que se estabilice. |
| `react-hook-form` | **7.87.x** | |
| `@hookform/resolvers` | **5.x** | Soporta Zod 4. |

Node: 24 LTS (Next 16 requiere ≥ 20.9).

### 1.1 Decisión: Tailwind v4 vs v3 → **v4**

- **v4 (recomendado).** Es la versión estable actual, con un motor más rápido y sin
  `tailwind.config.js` por defecto: los tokens se declaran en CSS con `@theme`. Next 16 la
  usa por defecto. Con esto consigues **exactamente los mismos nombres de clase** que
  propusiste (`bg-brand-dark`, `text-brand`, `bg-brand-light`, `bg-accent`, `text-ink`):
  ```css
  /* src/app/globals.css */
  @import "tailwindcss";
  @theme {
    --color-brand-dark: #0F3D5E;
    --color-brand: #1B6FA8;      /* equivale al DEFAULT */
    --color-brand-light: #F2F6F8;
    --color-accent: #FF7A3D;
    --color-ink: #1A1A1A;
  }
  ```
  Los hex siguen centralizados en un solo lugar, solo que ese lugar es CSS y no JS.
  (Si lo prefieres, v4 también puede cargar un `tailwind.config.ts` con `@config`,
  pero es un modo de compatibilidad).
- **v3 (3.4.x LTS).** Usa `tailwind.config.ts` tal como lo describiste, pero está en modo
  mantenimiento y tendrías que migrar más adelante.

**Nota de accesibilidad sobre la paleta:** el texto blanco sobre `accent` (#FF7A3D) tiene
un contraste de 2.6:1 y **no pasa WCAG AA**. En los CTA naranjas usaré texto `ink`
(6.7:1). El blanco sobre `brand` (5.4:1) y sobre `brand-dark` (11.4:1) sí pasa.

---

## 2. Decisiones de arquitectura

### 2.1 Estructura de carpetas

```
src/
  app/
    (publico)/                    # layout con header/footer; páginas estáticas/ISR
      page.tsx                    # inicio: buscador + categorías destacadas
      buscar/page.tsx             # resultados ?q=&categoria=&ciudad= (dinámica, noindex)
      categorias/page.tsx         # índice de todas las categorías (enlazado interno)
      categoria/[categoria]/page.tsx
      categoria/[categoria]/pagina/[pagina]/page.tsx           # páginas 2, 3… (ISR)
      categoria/[categoria]/[ciudad]/page.tsx
      categoria/[categoria]/[ciudad]/pagina/[pagina]/page.tsx
    (negocio)/                    # layout vacío: la página del negocio trae su barra y su pie
      negocio/[slug]/page.tsx     # PaginaNegocio: portada, fotos, horario, mapa, reseñas, contacto
    (auth)/
      ingresar/page.tsx
      registro/page.tsx
      recuperar-contrasena/page.tsx
      nueva-contrasena/page.tsx
    auth/confirm/route.ts         # verifyOtp(token_hash): confirmación de email + recovery
    auth/callback/route.ts        # exchangeCodeForSession (queda listo para Google OAuth)
    panel/                        # emprendedor (requiere sesión)
      layout.tsx
      page.tsx                    # mis negocios + estado
      negocios/nuevo/page.tsx
      negocios/[id]/page.tsx      # editar datos + horario
      negocios/[id]/galeria/page.tsx
      negocios/[id]/estadisticas/page.tsx  # visitas y clics de contacto (últimos 30 días)
      negocios/[id]/resenas/page.tsx       # responder y reportar reseñas
      cuenta/page.tsx             # datos de la cuenta + eliminar cuenta
    admin/                        # requiere rol admin
      layout.tsx
      page.tsx                    # negocios, filtro por estado y "Cambios por revisar"
      negocios/[id]/page.tsx      # revisar / aprobar / rechazar / suspender
      categorias/page.tsx
      reportes/page.tsx           # reportes de visitantes (abiertos / resueltos)
      resenas/page.tsx            # reseñas reportadas por dueños y recientes (ocultar / mostrar)
    (publico)/privacidad, terminos, contacto, cuenta-eliminada
    api/eventos/route.ts          # recibe visitas y clics (sendBeacon) -> registrar_evento
    sitemap.ts
    robots.ts
    layout.tsx  globals.css  not-found.tsx
  components/
    ui/                           # botones, inputs, badges (Tailwind puro)
    negocio/  categoria/  forms/  layout/
  lib/
    supabase/
      server.ts                   # cliente con cookies (panel, admin, server actions)
      client.ts                   # cliente de navegador (subida de imágenes, estado de sesión en header)
      publico.ts                  # cliente SIN cookies para páginas públicas cacheables
      proxy.ts                    # helper updateSession para proxy.ts
    auth/                         # getUsuario(), requireUsuario(), requireAdmin()
    validaciones/                 # esquemas Zod compartidos cliente/servidor
    consultas/                    # acceso a datos: negocios.ts, categorias.ts, municipios.ts
    acciones/                     # server actions: negocio.ts, galeria.ts, admin.ts, auth.ts
    seo/                          # jsonld.ts, metadata.ts
    utils/                        # whatsapp.ts, telefono.ts, horario.ts
    correos/                      # correos propios vía API de Resend (enviar.ts, plantilla.ts, moderacion.ts)
  types/
    database.types.ts             # tipos del esquema (escritos a mano, regenerables con supabase gen types)
  proxy.ts                        # Next 16 renombró middleware.ts → proxy.ts
supabase/
  migrations/                     # 001_…sql, 002_…sql (las aplicas tú)
docs/
```

Por qué:
- **Route groups** `(publico)`, `(negocio)` y `(auth)`: cada grupo tiene su layout sin que
  el nombre aparezca en la URL. `(negocio)` no lleva el header/footer del directorio: la
  página de cada negocio se ve como un sitio propio para sus clientes.
- **URLs en español** (`/categoria`, `/negocio`, `/ingresar`), porque las palabras clave
  en la URL ayudan un poco al SEO local y son más claras para el usuario hondureño.
- **Tres clientes de Supabase.** El punto clave es `publico.ts`: si una página pública
  usa el cliente con cookies, `cookies()` vuelve la ruta dinámica y **se pierde el
  ISR/SSG**. Las páginas públicas usan un cliente anónimo sin cookies, y como el RLS solo
  deja ver negocios aprobados, la seguridad queda en la base de datos.
- **`proxy.ts` solo corre en `/panel`, `/admin`, `/auth` y las páginas de auth.** Las
  páginas públicas quedan 100 % estáticas. El botón "Mi panel / Ingresar" del header es
  un componente cliente pequeño que consulta la sesión en el navegador.
- **Defensa en profundidad:** el proxy redirige, los layouts y las server actions vuelven
  a verificar con `requireUsuario()`/`requireAdmin()`, y RLS es la última barrera.
  Nunca confiamos solo en el proxy.

### 2.2 Mutaciones

- **Server Actions** para crear y editar negocios, las acciones de admin y las
  categorías. Cada acción vuelve a validar con el mismo esquema Zod del formulario y
  luego llama a `revalidatePath`.
- **Imágenes: subida directa del navegador a Supabase Storage**, protegida por políticas
  RLS de Storage. Así se evita el límite de ~1 MB de las Server Actions y el de 4.5 MB de
  las funciones en Vercel. Antes de subir, el navegador redimensiona la imagen (máx.
  ~1600 px, WebP) para ahorrar datos móviles. Después, una server action registra la fila
  en `business_images` y revalida la página.

### 2.3 Formularios: react-hook-form + Zod 4

Coincido con tu sugerencia. El formulario del negocio tiene un editor de horario (7 días
con uno o varios turnos) y `useFieldArray` de RHF resuelve eso bien. El esquema Zod vive
en `lib/validaciones/` y se usa dos veces: en el cliente (UX inmediata) y en la server
action (seguridad). Uso la misma librería en todos los formularios, login incluido, para
mantener un solo patrón.

### 2.4 Generación de slugs únicos: en la base de datos

Un trigger `BEFORE INSERT` en `businesses` genera el slug. Así hay una sola fuente de
verdad, sin importar desde dónde se inserte (panel, admin o SQL).

1. `slugify(nombre)`: `unaccent` + minúsculas + todo lo que no sea `[a-z0-9]` se vuelve
   `-`, con un máximo de ~80 caracteres. Ejemplo: "Pupusería Doña Chepa" →
   `pupuseria-dona-chepa`.
2. Si hay colisión, primero se prueba **agregando la ciudad**
   (`pupuseria-dona-chepa-choloma`), que aporta una palabra clave útil para SEO en lugar
   de un número sin significado.
3. Si todavía choca: `-2`, `-3`, …
4. Para evitar condiciones de carrera, `pg_advisory_xact_lock(hashtext(slug_base))`
   serializa las inserciones con el mismo slug base, y el `UNIQUE` sigue como red de
   seguridad.
5. **El slug no cambia cuando se edita el nombre** (la URL es estable, lo cual es
   importante para SEO). Solo el admin puede cambiarlo. Más adelante: tabla de redirects 301.

### 2.5 Estrategia de ISR / revalidación

Uso el modelo clásico de ISR de Next (sin activar `cacheComponents`, el modelo nuevo de
Next 16). Es más simple, está bien probado y se puede migrar después.

| Ruta | Render | Revalidación |
|---|---|---|
| `/negocio/[slug]` | `generateStaticParams` → `[]` (se genera en la primera visita y queda en caché) | `revalidate = 86400` como red de seguridad + **on-demand** |
| `/categoria/[c]` y `/categoria/[c]/[ciudad]` | ISR | `revalidate = 3600` + on-demand |
| `/` | ISR | `revalidate = 3600` |
| `sitemap.xml` | ISR | `revalidate = 3600` |
| `/buscar` | dinámica | — (`noindex`) |
| `/panel`, `/admin` | dinámicas | — |

On-demand: las server actions llaman a `revalidatePath()` para `/negocio/{slug}` y para
las páginas de listado afectadas (categoría, categoría padre y cada una con su ciudad)
cuando:
- el dueño edita el negocio (si cambió de categoría o de ciudad, se revalidan las rutas
  viejas y las nuevas);
- se sube, elimina o reordena una imagen;
- el admin cambia el estado. Al suspender o rechazar, la página devuelve 404 desde la
  siguiente visita.

Uso `revalidatePath` en lugar de `revalidateTag` porque en Next 16 `revalidateTag` pide
un perfil de `cacheLife` y supabase-js no etiqueta sus `fetch` por defecto. Las rutas
explícitas son más fáciles de razonar.

**SEO: páginas vacías.** Una combinación categoría + ciudad sin negocios aprobados
responde con `noindex` y no entra al sitemap. Así evitamos el "thin content" que
penaliza Google.

### 2.6 Autenticación

- Email + contraseña con Supabase Auth y **confirmación de email activada**. El link del
  correo lleva a `/auth/confirm?token_hash=…&type=email`, que llama a `verifyOtp` (flujo
  recomendado para SSR).
- Recuperación: `resetPasswordForEmail` → `/auth/confirm?type=recovery` →
  `/nueva-contrasena` → `updateUser({ password })`.
- Google OAuth más adelante: `/auth/callback` ya queda creado. Solo habrá que activar el
  proveedor en el dashboard y agregar el botón.
- **Resend:** los correos de Auth (confirmación, recuperación) se conectan a Resend por
  **SMTP personalizado en el dashboard de Supabase**, sin código. Esto es importante para
  producción, porque el SMTP por defecto de Supabase tiene un límite de envío muy bajo.
  Los correos propios de la aplicación van por la API de Resend (`lib/correos/`, con
  `RESEND_API_KEY`). `moderarNegocio` avisa al dueño cuando su negocio pasa a `aprobado`,
  `rechazado` o `suspendido` (`lib/correos/moderacion.ts`). Si el envío falla, el cambio
  de estado no se deshace; el panel de admin muestra el resultado.
- **Avisos al admin** (`lib/correos/avisos-admin.ts`, a `CORREO_ADMIN` o al correo de
  contacto): negocio nuevo, negocio que vuelve a revisión, primer cambio sin revisar de
  un negocio publicado y primer reporte abierto de un negocio. Se envían con `after()`,
  así que no hacen esperar al usuario.
- **Estadísticas** (migración 012): la página pública del negocio monta
  `RastreoNegocio`, que envía con `sendBeacon` a `/api/eventos` una visita por sesión del
  navegador y cada clic en los enlaces con `data-evento` (WhatsApp, Llamar, Maps, redes).
  Solo se guardan totales por negocio y día; la ruta descarta bots por user-agent.
- **"Abierto ahora"** (migración 013): `esta_abierto()` repite en SQL la regla de
  `EstadoAbierto` (hora de Honduras, turnos que cruzan la medianoche) para filtrar en
  `/buscar?abierto=1`.
- **Reseñas** (migración 015): una por usuario y negocio publicado, visibles al instante
  (moderación posterior: el admin las oculta). Se muestran con primer nombre + inicial.
  El dueño responde y puede reportar; no puede reseñar su negocio ni tocar su promedio
  (`calificacion_promedio` y `total_resenas` los mantiene un trigger). La página del
  negocio es estática, así que el formulario consulta la sesión en el navegador; las
  reglas las aplica la base de datos. No se avisa al dueño por correo de cada reseña:
  leer su correo requeriría la secret key de Supabase en el servidor; en su panel ve
  cuántas tiene sin responder.
- **Página del negocio como sitio propio** (`components/negocio/`): portada a pantalla
  completa con la primera foto, barra con el logo y nombre del negocio (se vuelve blanca al
  bajar), datos rápidos, galería con visor, horario con el día de hoy resaltado, mapa,
  reseñas y contacto. EmprendeHN solo aparece en una franja discreta al pie ("Página creada
  con EmprendeHN", "Más {categoría} en {ciudad}", "Crea tu página gratis", reportar). Las
  migas ya no se ven, pero siguen en JSON-LD. El mismo componente se usa en la vista previa
  del panel y en la revisión del admin (`modo="vista-previa"`: sin barras fijas); el diseño
  depende del ancho del contenedor (`@container`), no de la ventana.
- **Ubicación exacta** (migración 016): buscar por nombre en Google Maps llevaba a otro
  negocio con el mismo nombre (muy común en Honduras). Ahora el dueño coloca un pin
  (tocando el mapa, con su ubicación actual, escribiendo coordenadas o pegando el enlace de
  "Compartir" de Google Maps; los enlaces cortos `maps.app.goo.gl` se resuelven en el
  servidor siguiendo solo redirecciones a dominios de Google). El mapa del formulario se
  amplía a pantalla completa (la misma instancia de Leaflet cambia de tamaño) y la búsqueda
  de colonias muestra hasta 5 lugares de la ciudad del negocio para elegir. "Cómo llegar" abre el pin
  exacto en Google Maps (maps/search con las coordenadas; ahí la persona elige desde dónde:
  la URL de rutas maps/dir no les funcionaba a los clientes) o la navegación de Waze, y
  "Ver ficha en Google Maps" abre el enlace del dueño.
  Sin pin, la portada lleva a la dirección escrita y la búsqueda por texto queda como último
  recurso. Mapas con Leaflet + teselas de OpenStreetMap (sin llave de API), cargados solo al
  acercarse a la sección. La base valida que el pin esté dentro de Honduras y que el enlace
  sea de Google Maps; cambiarlo en un negocio publicado queda en "Cambios por revisar".
- **Paginación** (`components/ui/paginacion.tsx`: enlaces numerados 1 … 4 5 6 … 20, funciona
  sin JavaScript). Categorías: 24 negocios por página en la ruta
  (`/categoria/{c}[/{ciudad}]/pagina/{n}`), no en `?pagina=`, para que sigan siendo estáticas
  (ISR); `/pagina/1` redirige a la URL sin número, una página después de la última es 404 y
  cada página es canónica de sí misma. `/buscar` (24), el admin (negocios, reportes y reseñas,
  30) y las reseñas del panel (20) usan `?pagina=`. En la página del negocio se ven las 20
  reseñas más recientes y "Ver más reseñas" trae las siguientes desde el navegador.
- **URLs estables** (migración 014): si el admin cambia el slug, el anterior queda en
  `business_slug_redirects` y `/negocio/[viejo]` responde 308 hacia el nuevo.
- **Ciudad en la URL** (migración 017): `/negocio/{nombre}-{ciudad}` (p. ej.
  `baleadas-dona-marta-la-ceiba`). Ayuda un poco en búsquedas "negocio + ciudad", deja
  URLs legibles y evita los `-2` cuando el nombre se repite en otra ciudad. Si el dueño
  cambia de ciudad, en la URL cambia solo la ciudad y la anterior redirige (308); volver a
  la ciudad anterior recupera su URL. El nombre en la URL no cambia al editar el nombre
  (URL estable); si hace falta, el admin la cambia a mano. Un slug manual del admin sin
  ciudad conserva su base y se le agrega la ciudad nueva.
  Desde la migración 018 solo se guardan redirecciones de negocios que alguna vez se
  publicaron (`aprobado_en`), y una URL vieja bloquea ese nombre para otros negocios
  durante 12 meses; después otro negocio puede tomarla (si nadie la toma, sigue
  redirigiendo). Cada redirección es una fila con índice por slug y nunca hay cadenas:
  `slug_actual` lleva siempre directo a la URL vigente.
- **Spam sin fricción** (`lib/antispam.ts`, `components/forms/antispam.tsx`): campo
  trampa invisible y tiempo mínimo en registro, recuperación y reportes; bloqueo de
  correos temporales en el registro. CAPTCHA de Turnstile en modo invisible, apagado
  salvo que exista `NEXT_PUBLIC_TURNSTILE_SITE_KEY` (el token lo valida Supabase Auth).
- Tendrás que ajustar las plantillas de email en el dashboard. Te daré el texto exacto
  cuando lleguemos a ese paso.

### 2.7 Variables de entorno

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=   # sb_publishable_… (la anon key legacy también funciona aquí)
NEXT_PUBLIC_SITE_URL=http://localhost:3000   # https://emprendehn.com en producción
RESEND_API_KEY=                               # solo servidor; correos al dueño y al admin
CORREO_ADMIN=                                 # opcional; por defecto codezun@gmail.com
NEXT_PUBLIC_TURNSTILE_SITE_KEY=               # opcional; CAPTCHA invisible
NEXT_PUBLIC_LOGIN_GOOGLE=                     # opcional; "true" muestra el botón de Google
```

**No hace falta la service role / secret key en el MVP.** Todo, admin incluido, pasa por
RLS con la sesión del usuario, así que no hay ninguna llave maestra en el servidor que
se pueda filtrar.

---

## 3. Esquema de base de datos

### 3.1 Diagrama

```
auth.users 1─1 profiles 1─N businesses N─1 categories (self-ref: parent_id)
                              │   │
                              │   └─N─1 municipios N─1 departamentos
                              │   └─N─1 plans
                              └─1─N business_images ──> storage: business-images/{business_id}/…
```

### 3.2 Tipos (enums)

- `user_role`: `business_owner`, `admin`
- `business_status`: `pendiente`, `aprobado`, `rechazado`, `suspendido`

El plan **no** es un enum: es una FK a la tabla `plans` (ver abajo), para que los límites
y beneficios sean datos y no código.

### 3.3 Tablas

**`profiles`**
| columna | tipo | notas |
|---|---|---|
| id | uuid PK | FK → `auth.users(id)` on delete cascade |
| rol | user_role | default `business_owner` |
| nombre_completo | text | |
| email | text | copiado de auth.users por trigger (para que el admin contacte al dueño) |
| telefono | text | |
| created_at / updated_at | timestamptz | |

- Un trigger en `auth.users` (insert/update de email) crea o sincroniza el perfil. **El
  rol nunca se toma de `raw_user_meta_data`**, porque el usuario controla ese campo al
  registrarse.
- Para crear el primer admin corres a mano en el SQL editor:
  `update profiles set rol = 'admin' where email = '…';`

**`departamentos`** (18, con seed): `id smallint PK, nombre, slug unique`

**`municipios`** (298, con seed): `id int PK, departamento_id FK, nombre, slug unique, destacado bool`
- El slug es **único a nivel nacional**. Los nombres repetidos se desambiguan con el
  departamento (`san-jose-copan`, `san-jose-la-paz`).
- Caso especial: Distrito Central se muestra como **"Tegucigalpa"** (slug `tegucigalpa`),
  porque es como la gente lo busca en Google.

**`categories`**
| columna | tipo | notas |
|---|---|---|
| id | uuid PK | |
| parent_id | uuid null FK → categories | `null` = categoría principal; máximo 2 niveles (validado por trigger) |
| nombre | text | |
| slug | text unique | único global, así `/categoria/panaderias` funciona para padre o hija |
| descripcion | text | texto introductorio de la página de categoría (contenido SEO) |
| schema_type | text | default `LocalBusiness`; p. ej. `Bakery`, `BeautySalon`, `Plumber` → `@type` del JSON-LD |
| icono | text | |
| orden | smallint | |
| destacada | bool | se muestra en el inicio |
| activa | bool | |
| created_at / updated_at | | |

Seed inicial: unas 10 categorías principales y unas 40 subcategorías pensadas para
Honduras, editables desde `/admin`.

**`plans`**
| columna | tipo | notas |
|---|---|---|
| code | text PK | `gratis`, `basico`, `premium` |
| nombre | text | |
| max_imagenes | smallint | en el MVP los tres tienen el mismo límite bajo (p. ej. 5) |
| prioridad | smallint | para ordenar listados en el futuro (premium primero) |
| precio_mensual_lps | numeric null | informativo por ahora |
| activo | bool | |

**`businesses`**
| columna | tipo | notas |
|---|---|---|
| id | uuid PK | |
| owner_id | uuid FK → profiles | on delete cascade |
| nombre | text | 2–100 caracteres |
| slug | text unique | generado por trigger (§2.4) |
| descripcion | text | 30–2000 caracteres (el mínimo evita perfiles "vacíos") |
| category_id | uuid FK → categories | on delete **restrict** |
| municipio_id | int FK → municipios | ciudad para las URLs y la búsqueda |
| localidad | text null | colonia, barrio o aldea (p. ej. "Comayagüela", "Col. Kennedy") |
| direccion | text | |
| telefono | text | formato E.164 `+504XXXXXXXX` |
| whatsapp | text null | E.164 |
| email_contacto | text null | |
| redes_sociales | jsonb | `{facebook, instagram, tiktok, sitio_web}` → `sameAs` en el JSON-LD |
| horario | jsonb null | ver formato abajo |
| logo_path | text null | ruta en Storage |
| estado | business_status | default `pendiente` (**solo admin**) |
| plan | text FK → plans | default `gratis` (**solo admin**) |
| motivo_estado | text null | razón del rechazo o suspensión, visible para el dueño (**solo admin**) |
| aprobado_en | timestamptz null | (**solo admin**) |
| cambios_por_revisar | text[] | campos sensibles que el dueño cambió estando publicado y el admin no ha revisado (**solo admin**, lo llena el trigger) |
| cambios_por_revisar_desde | timestamptz null | primer cambio sin revisar; ordena la cola "Cambios por revisar" (**solo admin**) |
| search_vector | tsvector | columna generada: nombre (peso A) + descripción (B) + localidad (C), en español y sin acentos |
| created_at / updated_at | timestamptz | |

Formato de `horario` (flexible: turnos partidos, días cerrados, 24 h):
```json
{
  "lun": [{ "abre": "08:00", "cierra": "12:00" }, { "abre": "13:00", "cierra": "17:00" }],
  "mar": [{ "abre": "08:00", "cierra": "17:00" }],
  "dom": [],
  "nota": "Cerrado en feriados"
}
```
Un día ausente o con `[]` significa cerrado. Se valida con Zod y se convierte
directamente a `openingHoursSpecification` de schema.org.

**`business_images`**
| columna | tipo | notas |
|---|---|---|
| id | uuid PK | |
| business_id | uuid FK → businesses | on delete cascade |
| storage_path | text unique | `{business_id}/{uuid}.webp` |
| alt_text | text null | SEO y accesibilidad (default: nombre del negocio) |
| orden | smallint | |
| ancho / alto | int null | evitan CLS con `next/image` |
| created_at | | |

Un trigger `BEFORE INSERT` hace cumplir `count(*) < plans.max_imagenes` del plan del
negocio, bloqueando antes la fila del negocio (`FOR UPDATE`) para evitar condiciones de
carrera.

### 3.4 Índices (búsquedas rápidas por ciudad + categoría)

```sql
-- listado categoría + ciudad (la consulta más importante del sitio)
create index on businesses (category_id, municipio_id) where estado = 'aprobado';
-- listado por ciudad / sitemap / "ciudades con negocios en esta categoría"
create index on businesses (municipio_id) where estado = 'aprobado';
-- búsqueda de texto
create index on businesses using gin (search_vector);
-- panel del emprendedor
create index on businesses (owner_id);
-- panel de admin, filtro por estado
create index on businesses (estado, created_at desc);
-- hijos de una categoría / galería ordenada
create index on categories (parent_id);
create index on business_images (business_id, orden);
```
Los índices parciales (`where estado = 'aprobado'`) son más pequeños y cubren exactamente
lo que ve el público. El listado de una categoría padre consulta
`category_id in (padre + hijas)`, que usa el mismo índice.

### 3.5 RLS

Helper: `public.is_admin()`, una función `security definer` y `stable` que revisa
`profiles.rol`. En las políticas se usa como `(select public.is_admin())` y
`(select auth.uid())` para que Postgres la evalúe una vez por consulta y no por fila.

| Tabla | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| profiles | el propio usuario; admin | — (trigger) | el propio usuario, solo `nombre_completo` y `telefono` (grants de columna) | — |
| departamentos, municipios, plans | todos | admin | admin | admin |
| categories | todos (`activa`); admin ve todas | admin | admin | admin (bloqueado por FK si tiene negocios) |
| businesses | `estado = 'aprobado'`; dueño; admin | autenticado con `owner_id = auth.uid()` | dueño (sus filas) o admin | dueño o admin |
| business_images | si el negocio es visible (aprobado, dueño o admin) | dueño del negocio | dueño | dueño o admin |

**Campos restringidos (estado, plan, motivo_estado, aprobado_en, owner_id, slug).** RLS
trabaja por fila, no por columna. Los grants de columna tampoco sirven aquí, porque el
admin usa el mismo rol `authenticated` de Postgres que el dueño. Por eso uso un trigger
guardián en `businesses`:
- `BEFORE INSERT`: si no es admin, fuerza `estado = 'pendiente'`, `plan = 'gratis'`,
  `owner_id = auth.uid()` y limpia los campos de admin.
- `BEFORE UPDATE`: si no es admin y alguno de esos campos cambia, lanza una excepción.
- Si el dueño edita un negocio **rechazado** o **suspendido** (o le agrega una foto), el
  trigger lo pasa a `pendiente` (reenvío automático a revisión). Desde la migración 010.
- Si el dueño edita un negocio **aprobado**, el cambio se publica al instante. Si toca algo
  sensible (nombre, descripción, categoría, ciudad, ubicación en el mapa, logo, redes o
  fotos nuevas), el trigger lo anota en `cambios_por_revisar` y el negocio aparece en la cola
  "Cambios por revisar" del admin (moderación posterior). El dueño ve la insignia "Cambios
  en revisión" con la lista de campos (en "Mis negocios", el encabezado del negocio y el
  mensaje al guardar) hasta que el admin los marca como revisados. Teléfono, WhatsApp,
  correo, horario y dirección escrita no se anotan. Cualquier cambio de estado del admin
  limpia la cola.

**Storage:** el bucket `business-images` es **público para lectura** (CDN rápido e
indexable por Google Imágenes) y tiene políticas en `storage.objects`: solo se puede
insertar o borrar si la primera carpeta de la ruta es un `business_id` del usuario, y el
admin puede borrar cualquier archivo. El bucket limita el tamaño a 5 MB y los tipos a
`image/jpeg`, `image/png` y `image/webp`.

### 3.6 Pensado para la monetización (NO se implementa ahora)

El esquema actual ya lo soporta sin romper nada:
- `plans` ya existe, así que los límites por plan son datos.
- `subscriptions` (business_id, plan, estado, período, proveedor, external_id). Será la
  fuente de verdad del pago, y `businesses.plan` queda como caché desnormalizada para
  ordenar rápido.
- `featured_placements` (business_id, category_id, municipio_id null, inicia, termina,
  posición) para los destacados pagados por categoría y ciudad.
- `business_domains` (business_id, dominio unique, verificado_en). `proxy.ts` resolverá
  el `Host` hacia `/negocio/[slug]`.

---

## 4. Migraciones planeadas

| Archivo | Contenido | Se necesita para |
|---|---|---|
| `001_extensiones_y_utilidades.sql` | `unaccent`, configuración de búsqueda `es_unaccent`, `set_updated_at()`, `slugify()` | todo |
| `002_profiles_y_roles.sql` | enum `user_role`, `profiles`, triggers en `auth.users`, `is_admin()`, RLS | autenticación |
| `003_ubicaciones.sql` | `departamentos`, `municipios` + seed (18 / 298) | formulario del negocio |
| `004_categories.sql` | `categories` + RLS + seed inicial | formulario, directorio |
| `005_plans.sql` | `plans` + seed | businesses |
| `006_businesses.sql` | enum `business_status`, tabla, índices, trigger de slug, trigger guardián, RLS | panel |
| `007_business_images.sql` | tabla, trigger de límite por plan, RLS | galería |
| `008_storage.sql` | bucket `business-images` + políticas de `storage.objects` | galería |
| `009_funciones_directorio.sql` | RPC `buscar_negocios` (búsqueda + filtros + orden) y `resumen_directorio` (conteos por categoría/ciudad) | directorio público, sitemap |
| `010_revision_de_cambios.sql` | columnas `cambios_por_revisar*`, trigger guardián actualizado, trigger de fotos nuevas | moderación posterior, reenvío de suspendidos |

## 5. Orden de construcción

1. Setup: Next 16 + Tailwind + clientes de Supabase + `proxy.ts` → migraciones 001–002
2. Autenticación (registro, login, confirmación, recuperación)
3. Modelo de datos: migraciones 003–008 + `database.types.ts`
4. Panel del emprendedor (crear/editar negocio, horario, galería, estado)
5. Directorio público (inicio, categoría, categoría + ciudad, negocio, búsqueda)
6. Panel de admin (moderación, categorías)
7. SEO técnico (sitemap, robots, metadata, JSON-LD `LocalBusiness` y `BreadcrumbList`, canonical, OpenGraph)

## 6. Decisiones tomadas al implementar

- **Tailwind v4** con tokens en `@theme` (mismos nombres de clase propuestos).
- **Ciudad = municipio**: catálogo de 298 municipios (Distrito Central se muestra como
  "Tegucigalpa") + campo libre `localidad` para colonia, barrio o aldea.
- **Edición de un negocio aprobado**: se publica al instante (no vuelve a revisión, para
  que un cambio de teléfono no lo saque del directorio). Los cambios sensibles quedan en
  la cola "Cambios por revisar" del admin, que los marca como revisados o suspende el
  negocio. Un negocio `rechazado` o `suspendido` vuelve a `pendiente` cuando su dueño lo
  edita o le agrega fotos.
- **Correos de moderación**: el dueño recibe un correo cuando su negocio se aprueba (o se
  publica de nuevo), se rechaza o se suspende, con el motivo del admin. "Volver a
  pendiente" no avisa porque es una corrección interna del admin.
- **Máximo 3 negocios por cuenta** (constante en el trigger de `006` y en `lib/constantes.ts`).
- **Llaves de Supabase**: se usa `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`; acepta tanto la
  publishable key nueva como la anon key legacy.
- **Migración 009** adicional con las funciones de búsqueda (RPC) del directorio.
- **Container queries** (`@container` de Tailwind v4) en el perfil del negocio, para que
  se vea bien en la página pública, en la vista previa del panel y en la columna del admin.
- **Barra fija de contacto** (WhatsApp/Llamar) en móvil en la página pública del negocio.
- **Header público sin supabase-js**: decide "Mi panel / Ingresar" mirando si existe la
  cookie de sesión, sin cargar el SDK en las páginas públicas.
- **`tailwind-merge`** en `cn()` para resolver conflictos de clases.

