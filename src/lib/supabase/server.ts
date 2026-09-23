import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "@/lib/env";
import type { Database } from "@/types/database.types";

/**
 * Cliente con la sesión del usuario (cookies). Para panel, admin, server actions
 * y route handlers. Leer cookies vuelve dinámica la ruta: NO usarlo en páginas
 * públicas cacheables (para eso está `crearClientePublico`).
 * Crear uno nuevo por request.
 */
export async function crearClienteServidor() {
  const cookieStore = await cookies();

  return createServerClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Llamado desde un Server Component: no puede escribir cookies.
          // No pasa nada porque proxy.ts refresca la sesión en cada request.
        }
      },
    },
  });
}
