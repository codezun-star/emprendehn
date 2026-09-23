@AGENTS.md

# EmprendeHN — notas para agentes

- Directorio de negocios de Honduras. Next.js 16 (App Router) + Supabase + Tailwind v4. Ver `README.md` y `docs/arquitectura.md`.
- **Migraciones**: el dueño las aplica manualmente en el SQL Editor de Supabase. Nunca ejecutar `supabase db push` ni conectarse al proyecto real. Cada cambio de esquema va en un archivo nuevo numerado en `supabase/migrations/` (idempotente) y se actualiza `src/types/database.types.ts`.
- Nombres del dominio en español (`negocio`, `categoria`, `ciudad`); convenciones técnicas en inglés cuando es lo idiomático.
- Páginas públicas: usar `crearClientePublico()` (sin cookies) para no romper el ISR. Tras mutaciones que afecten al directorio, llamar a `revalidarDirectorio()`.
- Colores solo vía tokens de Tailwind (`brand-dark`, `brand`, `brand-light`, `accent`, `ink`); texto `ink` sobre `accent`.
- Validar con `npm run lint && npm run typecheck && npm run build`.
