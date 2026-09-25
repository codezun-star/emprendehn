# Seguridad de EmprendeHN

Cómo está protegido el sitio, qué encontró la auditoría de septiembre de 2026, cómo
funciona la verificación en dos pasos del admin y qué configurar en Supabase.

## 1. Capas de protección

| Capa | Qué hace |
|---|---|
| `proxy.ts` | Refresca la sesión. Sin sesión, `/panel`, `/admin` y `/dos-pasos` mandan a `/ingresar`. En `/admin` sin el código vigente, manda a `/dos-pasos`. |
| Layouts y server actions | Vuelven a verificar la sesión, el rol y el segundo factor (`requerirAdmin`, `clienteAdmin`). Todo lo que llega del navegador pasa por Zod. |
| Base de datos (RLS) | Decide al final. La app **no usa la `service_role` key**: todo corre con la sesión del usuario, así que aunque alguien llame directo a la API de Supabase, las reglas son las mismas. |
| Triggers guardianes | Un dueño no puede cambiar `estado`, `plan`, `slug`, `owner_id` ni `motivo_estado`; en reseñas, cada quien solo cambia lo suyo. Límites anti-spam: 3 negocios por cuenta, 10 reseñas al día, 3 reportes por negocio por hora. |
| Validaciones en la base | Teléfonos, correo, largos, redes sociales solo `http(s)://`, fotos y logo solo con el formato de ruta que genera la app. |
| Cabeceras HTTP | CSP, HSTS, `X-Frame-Options`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`, `Cross-Origin-Opener-Policy`; `noindex` en áreas privadas. |
| Admin | Rol admin **+** código de una app de autenticación (TOTP) de hace menos de 12 horas, exigido en la web **y** en la base. Registro de actividad que nadie puede editar. |

## 2. Auditoría (septiembre de 2026)

### Hallazgos corregidos

| # | Hallazgo | Riesgo | Corrección |
|---|---|---|---|
| 1 | El admin entraba solo con contraseña: con ella robada (phishing, reutilizada en otro sitio) se controlaba todo el directorio. | Alto | Verificación en dos pasos obligatoria (§3). La base también la exige: con solo la contraseña no hay ningún poder de admin, ni en la web ni llamando a la API. |
| 2 | Redirección abierta: `?siguiente=/%09/sitio-falso.com` en `/ingresar`, `/auth/callback` y `/auth/confirm` llevaba a otro sitio después de iniciar sesión (el navegador borra tabs y saltos de línea: queda `//sitio-falso.com`). Útil para phishing. | Medio | `rutaSegura()` rechaza caracteres de control y `\`, normaliza la ruta y comprueba que siga en el mismo sitio. |
| 3 | Sin Content-Security-Policy ni HSTS. | Medio | CSP con lista cerrada de servicios (§5) y HSTS de 2 años. |
| 4 | Supabase da `TRUNCATE`, `REFERENCES` y `TRIGGER` sobre todas las tablas a `anon` y `authenticated`. La API no los expone, pero `TRUNCATE` ignora RLS. | Bajo | Revocados, también para tablas futuras (migración 020). |
| 5 | Redes sociales y rutas de fotos solo se validaban en la app; con sesión se podía guardar `javascript:…` o una ruta arbitraria llamando directo a la API. React ya bloqueaba los `javascript:`. | Bajo | `CHECK` en la base y nombre de archivo obligatorio en la política de Storage. |
| 6 | Tras exigir el segundo factor, alguien con solo la contraseña del admin podría eliminar la cuenta admin. | Bajo | `eliminar_mi_cuenta` revisa el rol, no la sesión verificada. |
| 7 | No quedaba registro de lo que hacía el admin. | — | `admin_auditoria` + pestaña **Actividad** (§4). |
| 8 | Al redirigir, `proxy.ts` descartaba las cookies de la sesión recién refrescada. | Bajo | Las redirecciones copian las cookies. |

### Revisado sin cambios

- RLS activo en todas las tablas; políticas con `(select auth.uid())`; funciones
  `SECURITY DEFINER` con `search_path` vacío y permisos de ejecución revisados uno por uno.
- `profiles.rol` no se puede cambiar desde la app (grant por columna); solo por SQL.
- Sesiones validadas con `getClaims()` (nunca `getSession()` en el servidor).
- JSON-LD y correos escapan todo el texto de los usuarios; no hay otro `dangerouslySetInnerHTML`.
- Storage: cada dueño solo escribe en la carpeta de sus negocios; JPEG/PNG/WebP de hasta 5 MB.
- El lector de enlaces de Google Maps solo sigue redirecciones a dominios de Google (sin SSRF).
- `npm audit`: 0 vulnerabilidades. Historial de git: sin llaves ni contraseñas.

### Riesgos aceptados

- **IDs de dueños y autores visibles.** `owner_id` y `user_id` se leen por la API. Son UUID
  sin correo ni nombre; ocultarlos solo funcionaría para visitantes sin cuenta (cualquiera
  puede registrarse) y complicaría cada consulta.
- **Estadísticas inflables.** `registrar_evento` es público (lo llama cada visita); alguien
  podría inflar las visitas de un negocio. No afecta nada más.
- **`'unsafe-inline'` en scripts.** Next.js necesita scripts en línea; la alternativa
  (nonces) obliga a renderizar cada página en cada visita y rompería la caché del directorio.
  La CSP igual impide cargar scripts de otros dominios y enviar datos a otros servidores.

## 3. Verificación en dos pasos del admin

**Cómo funciona.** Después de la contraseña (o Google), `/admin` pide el código de 6 números
de una app de autenticación (Google Authenticator, Microsoft Authenticator, Authy, 1Password).
El código vale 12 horas; después se pide de nuevo. La base exige lo mismo en `is_admin()`
(`aal2` + código de hace menos de 12 h), así que una contraseña robada no sirve de nada.
Al activarla llega un correo de aviso. A los dueños de negocios no se les pide.

### Activación (hazlo en este orden)

1. Sube la app (este cambio ya está en `main`; Vercel lo despliega solo).
2. Entra a `https://emprendehn.com/admin`: te llevará a **Verificación en dos pasos**.
   Pulsa *Activar*, escanea el QR y escribe el código. **Consejo:** escanea el mismo QR con
   un segundo teléfono o guarda la clave manual en tu gestor de contraseñas: es tu respaldo.
3. Recién entonces aplica `supabase/migrations/020_seguridad.sql` en el SQL Editor. Si la
   aplicas antes de activar el código, el panel dejará de reconocerte como admin hasta que
   lo actives.

### Un admin nuevo

Dale el rol por SQL (`update public.profiles set rol = 'admin' where email = '…'`), pídele
que entre a `/admin` y active su código. El cambio de rol queda en la **Actividad**.

### Perdí el teléfono

Desde el SQL Editor de Supabase (el dashboard tiene su propia contraseña y 2FA):

```sql
-- 1. Quitar la app de autenticación registrada
delete from auth.mfa_factors
where user_id = (select id from auth.users where email = 'codezun@gmail.com');

-- 2. Cerrar todas las sesiones abiertas de esa cuenta
delete from auth.sessions
where user_id = (select id from auth.users where email = 'codezun@gmail.com');
```

Luego ingresa y vuelve a activar el código en `/dos-pasos`. Si sospechas que alguien más
entró, cambia también tu contraseña y revisa la pestaña **Actividad**.

### Cerrar sesión en todos los dispositivos

En la barra del panel de administración. Revoca todas las sesiones de tu cuenta (útil si
usaste una computadora ajena o perdiste el teléfono con la sesión abierta).

## 4. Registro de actividad del admin

Tabla `admin_auditoria` (migración 020), visible en **Admin → Actividad**:

- Todo cambio hecho con sesión de admin en negocios, fotos, reseñas, reportes, categorías,
  ciudades y planes: quién, cuándo y cada columna con su valor antes → después.
- Todo cambio de rol, incluso desde el SQL Editor (aparece como "SQL Editor (sin sesión)").
- La escriben solo triggers de la base. Nadie puede editarla ni borrarla desde la web o la
  API, ni siquiera el admin.

## 5. Cabeceras y Content-Security-Policy

Definidas en `next.config.ts`. La CSP solo permite:

| Servicio | Para qué |
|---|---|
| Supabase (tu URL) | API, subida de fotos, imágenes |
| `challenges.cloudflare.com` | Turnstile (si activas el CAPTCHA) |
| `tile.openstreetmap.org` | Teselas de los mapas |
| `nominatim.openstreetmap.org` | Búsqueda de direcciones en el selector de ubicación |

**Si agregas un servicio externo** (analítica, chat, otro mapa), agrégalo a la CSP o el
navegador lo bloqueará. Para ver qué se bloquea: consola del navegador → mensajes
"Refused to…". Zod corre en modo `jitless` (`src/instrumentation-client.ts`) para no usar
`eval`.

## 6. Configuración recomendada fuera del código

1. **2FA en todas las cuentas de servicio** — Supabase, Vercel, GitHub, Resend, Google Cloud
   y Cloudflare. Tienen más poder que el panel de admin: son lo primero que hay que proteger.
2. **Supabase → Authentication → Multi-Factor**: *TOTP (App Authenticator)* debe estar
   activado (viene así por defecto).
3. **Supabase → Authentication → Providers → Email**:
   - *Minimum password length*: 8 o más (la app ya lo exige).
   - *Password requirements*: letras y números.
   - *Secure email change* y *Secure password change* activados.
4. **Supabase → Authentication → Rate Limits**: deja los valores por defecto (limitan
   intentos de inicio de sesión y de códigos).
5. **Supabase → Authentication → Attack Protection**: CAPTCHA con Turnstile si aparece spam
   (ver README). En planes de pago, activa *Leaked password protection*.
6. **Llaves**: la `service_role` key y la `RESEND_API_KEY` nunca van en variables
   `NEXT_PUBLIC_*` ni en el código. La app no usa la `service_role`.
7. **Respaldos**: el plan gratuito de Supabase no tiene respaldos automáticos
   descargables; exporta la base de vez en cuando (*Database → Backups* o `pg_dump`).

## 7. Reportar una vulnerabilidad

Escribe a codezun@gmail.com (también en `/.well-known/security.txt`).
