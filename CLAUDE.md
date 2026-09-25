@AGENTS.md

# EmprendeHN — notas para agentes

- Directorio de negocios de Honduras. Next.js 16 (App Router) + Supabase + Tailwind v4. Ver `README.md` y `docs/arquitectura.md`.
- **Migraciones**: el dueño las aplica manualmente en el SQL Editor de Supabase. Nunca ejecutar `supabase db push` ni conectarse al proyecto real. Cada cambio de esquema va en un archivo nuevo numerado en `supabase/migrations/` (idempotente) y se actualiza `src/types/database.types.ts`.
- Nombres del dominio en español (`negocio`, `categoria`, `ciudad`); convenciones técnicas en inglés cuando es lo idiomático.
- Páginas públicas: usar `crearClientePublico()` (sin cookies) para no romper el ISR. Tras mutaciones que afecten al directorio, llamar a `revalidarDirectorio()`.
- Colores solo vía tokens de Tailwind (`brand-dark`, `brand`, `brand-light`, `accent`, `ink`); texto `ink` sobre `accent`.
- Seguridad (ver `docs/seguridad.md`): `is_admin()` exige rol + segundo factor (TOTP de < 12 h); para prohibir algo a una cuenta admin usar `tiene_rol_admin()` / `Sesion.rolAdmin`. En pruebas SQL, `pruebas.t_como(uid)` simula esa sesión verificada (`t_como(uid, 'aal1')` sin código). Un servicio externo nuevo debe agregarse a la CSP de `next.config.ts`. Redirecciones con `?siguiente=` siempre por `rutaSegura()`.
- Feedback de acciones: el resultado va en un toast (`toast.exito/error/info/cargando` de `components/ui/toast.tsx`); los errores de un campo, junto al campo. Tras una redirección del servidor, `conAviso(ruta, clave)` con la clave en `lib/avisos.ts`. Formularios largos: `irAlPrimerError()` de `lib/desplazamiento.ts`. Barras fijas abajo llevan `data-barra-inferior` (lo flotante se acomoda encima).
- Validar con `npm run lint && npm run typecheck && npm run build`.
