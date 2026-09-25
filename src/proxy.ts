import { NextResponse, type NextRequest } from "next/server";

import { dosPasosVigenteHasta } from "@/lib/dos-pasos";
import { actualizarSesion } from "@/lib/supabase/proxy";

/**
 * Proxy (antes "middleware" en Next < 16).
 * Solo corre en rutas privadas y de autenticación (ver matcher): las páginas
 * públicas del directorio quedan 100 % estáticas/cacheables.
 *
 * 1. Refresca la sesión de Supabase (cookies).
 * 2. Sin sesión en /panel, /admin o /dos-pasos -> /ingresar?siguiente=…
 * 3. En /admin sin la verificación en dos pasos vigente -> /dos-pasos?siguiente=…
 *    (esa página responde 404 a quien no es admin).
 * 4. Con sesión en /ingresar o /registro -> /panel
 *
 * La autorización real (rol admin, dueño del negocio) se verifica de nuevo en
 * los layouts/server actions y, al final, en RLS. Nunca confiar solo en el proxy.
 */
export async function proxy(request: NextRequest) {
  const { response, userId, claims } = await actualizarSesion(request);
  const { pathname, search } = request.nextUrl;

  // Las redirecciones llevan las cookies de la sesión recién refrescada: si se
  // perdieran, el navegador reusaría un refresh token ya rotado.
  const redirigir = (ruta: string, siguiente?: string) => {
    const url = request.nextUrl.clone();
    url.pathname = ruta;
    url.search = siguiente ? `?siguiente=${encodeURIComponent(siguiente)}` : "";
    const redireccion = NextResponse.redirect(url);
    response.cookies.getAll().forEach((cookie) => redireccion.cookies.set(cookie));
    const cache = response.headers.get("cache-control");
    if (cache) redireccion.headers.set("cache-control", cache);
    return redireccion;
  };

  const esAdmin = pathname === "/admin" || pathname.startsWith("/admin/");
  const esPrivada = esAdmin || pathname.startsWith("/panel") || pathname === "/dos-pasos";
  if (esPrivada && !userId) return redirigir("/ingresar", pathname + search);

  if (esAdmin && dosPasosVigenteHasta(claims) === null) return redirigir("/dos-pasos", pathname + search);

  const esAuth = pathname === "/ingresar" || pathname === "/registro";
  if (esAuth && userId) return redirigir("/panel");

  return response;
}

export const config = {
  matcher: [
    "/panel/:path*",
    "/admin/:path*",
    "/dos-pasos",
    "/ingresar",
    "/registro",
    "/nueva-contrasena",
    "/auth/:path*",
  ],
};
