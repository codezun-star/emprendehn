import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";

import { crearClienteServidor } from "@/lib/supabase/server";
import { rutaSegura } from "@/lib/utils";

/**
 * Intercambio de código PKCE -> sesión para el inicio de sesión con Google
 * (components/auth/boton-google.tsx). Si la persona cancela en Google, llega
 * sin código y vuelve a /ingresar con un aviso.
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

  redirect("/ingresar?error=google");
}
