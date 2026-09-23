import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";

import { crearClienteServidor } from "@/lib/supabase/server";
import { rutaSegura } from "@/lib/utils";

/**
 * Intercambio de código PKCE -> sesión. Lo usará el inicio de sesión con
 * Google (OAuth) cuando se active el proveedor en Supabase:
 *   supabase.auth.signInWithOAuth({ provider: "google",
 *     options: { redirectTo: `${SITE_URL}/auth/callback?siguiente=/panel` } })
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const codigo = searchParams.get("code");
  const siguiente = rutaSegura(searchParams.get("siguiente"));

  if (codigo) {
    const supabase = await crearClienteServidor();
    const { error } = await supabase.auth.exchangeCodeForSession(codigo);
    if (!error) redirect(siguiente);
  }

  redirect("/ingresar?error=enlace-invalido");
}
