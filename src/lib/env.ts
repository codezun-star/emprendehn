// Variables de entorno públicas. Se referencian de forma estática
// (process.env.NEXT_PUBLIC_…) para que Next.js las incruste en el bundle del cliente.
// Como se incrustan al compilar, en Vercel deben existir ANTES del build.

function requerida(nombre: string, valor: string | undefined): string {
  if (!valor) {
    throw new Error(
      `Falta la variable de entorno ${nombre}. ` +
        "En local: copia .env.example a .env.local y complétala. " +
        "En Vercel: Project → Settings → Environment Variables (Production y Preview) y vuelve a desplegar.",
    );
  }
  return valor;
}

export const SUPABASE_URL = requerida(
  "NEXT_PUBLIC_SUPABASE_URL",
  process.env.NEXT_PUBLIC_SUPABASE_URL,
);

export const SUPABASE_PUBLISHABLE_KEY = requerida(
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
);

/**
 * URL canónica del sitio, sin "/" final (canonical, sitemap, enlaces de correo).
 * Prioridad: NEXT_PUBLIC_SITE_URL → dominio de producción de Vercel → URL del
 * deploy (previews) → localhost. Solo se usa en el servidor.
 */
function resolverSiteUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  if (process.env.VERCEL_ENV === "production" && process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

export const SITE_URL = resolverSiteUrl().replace(/\/+$/, "");

export const SITE_NAME = "EmprendeHN";
