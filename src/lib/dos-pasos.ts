// Verificación en dos pasos del admin (TOTP: Google Authenticator, Authy, 1Password…).
// Sin dependencias de servidor: lo usan proxy.ts, lib/auth.ts y las acciones.
//
// Supabase Auth deja en el JWT:
//   aal: "aal1" (solo contraseña/Google) o "aal2" (además, código de la app)
//   amr: [{ method: "totp", timestamp: 1790000000 }, { method: "password", … }]
// La base exige lo mismo en is_admin() (migración 020, con 10 min de margen).

/** Cada cuántas horas el admin vuelve a ingresar el código de su app. */
export const VIGENCIA_DOS_PASOS_HORAS = 12;

type Claims = { aal?: unknown; amr?: unknown; iat?: unknown } | null | undefined;

/** Momento (ms) de la última verificación con código en esta sesión, o null. */
export function ultimaVerificacion(claims: Claims): number | null {
  if (claims?.aal !== "aal2" || !Array.isArray(claims.amr)) return null;
  const marcas = claims.amr.flatMap((m: unknown) => {
    // Formato RFC 8176 (["totp", …], sin fecha): cuenta desde que se emitió el
    // token. Se pierde el vencimiento de 12 h, no el segundo factor (igual en la base).
    if (m === "totp") return [typeof claims.iat === "number" ? claims.iat * 1000 : Date.now()];
    const { method, timestamp } = (m ?? {}) as { method?: unknown; timestamp?: unknown };
    return method === "totp" && typeof timestamp === "number" ? [timestamp * 1000] : [];
  });
  return marcas.length > 0 ? Math.max(...marcas) : null;
}

/** Hasta cuándo (ms) vale la verificación, o null si no hay una vigente. */
export function dosPasosVigenteHasta(claims: Claims, ahora = Date.now()): number | null {
  const ultima = ultimaVerificacion(claims);
  if (ultima === null) return null;
  const hasta = ultima + VIGENCIA_DOS_PASOS_HORAS * 3_600_000;
  return hasta > ahora ? hasta : null;
}

/**
 * Destino después de verificar: una ruta de /admin o /nueva-contrasena (con
 * dos pasos activado, Supabase pide el código para cambiar la contraseña).
 * Cualquier otra cosa → /admin.
 */
export function destinoAdmin(siguiente: string | null | undefined): string {
  if (!siguiente) return "/admin";
  try {
    const base = "https://emprendehn.invalid";
    const url = new URL(siguiente, base);
    const permitida = /^\/(?:admin(?:\/[\w-]+)*|nueva-contrasena)$/.test(url.pathname);
    return url.origin === base && permitida ? url.pathname + url.search : "/admin";
  } catch {
    return "/admin";
  }
}
