import { NextResponse, type NextRequest } from "next/server";

import { actualizarSesion } from "@/lib/supabase/proxy";

/**
 * Proxy (antes "middleware" en Next < 16).
 * Solo corre en rutas privadas y de autenticación (ver matcher): las páginas
 * públicas del directorio quedan 100 % estáticas/cacheables.
 *
 * 1. Refresca la sesión de Supabase (cookies).
 * 2. Sin sesión en /panel o /admin  -> /ingresar?siguiente=…
 * 3. Con sesión en /ingresar o /registro -> /panel
 *
 * La autorización real (rol admin, dueño del negocio) se verifica de nuevo en
 * los layouts/server actions y, al final, en RLS. Nunca confiar solo en el proxy.
 */
export async function proxy(request: NextRequest) {
  const { response, userId } = await actualizarSesion(request);
  const { pathname, search } = request.nextUrl;

  const esPrivada = pathname.startsWith("/panel") || pathname.startsWith("/admin");
  if (esPrivada && !userId) {
    const url = request.nextUrl.clone();
    url.pathname = "/ingresar";
    url.search = `?siguiente=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }

  const esAuth = pathname === "/ingresar" || pathname === "/registro";
  if (esAuth && userId) {
    const url = request.nextUrl.clone();
    url.pathname = "/panel";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    "/panel/:path*",
    "/admin/:path*",
    "/ingresar",
    "/registro",
    "/nueva-contrasena",
    "/auth/:path*",
  ],
};
