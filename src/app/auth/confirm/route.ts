import type { EmailOtpType } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";

import { conAviso } from "@/lib/avisos";
import { crearClienteServidor } from "@/lib/supabase/server";
import { rutaSegura } from "@/lib/utils";

const TIPOS_VALIDOS: EmailOtpType[] = ["signup", "email", "recovery", "invite", "magiclink", "email_change"];

/**
 * Destino de los enlaces de los correos de Supabase Auth (confirmación de
 * cuenta y recuperación de contraseña). Las plantillas de correo deben apuntar a:
 *   {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email
 *   {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery
 * (ver supabase/templates/).
 *
 * También acepta el enlace de las plantillas por defecto de Supabase
 * ({{ .ConfirmationURL }}): Supabase verifica el token y redirige aquí con
 * ?code= (PKCE), que solo se puede canjear en el navegador donde se pidió.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const tipo = searchParams.get("type") as EmailOtpType | null;
  const codigo = searchParams.get("code");

  const destinoPorDefecto = tipo === "recovery" ? "/nueva-contrasena" : conAviso("/panel", "cuenta-confirmada");
  const siguiente = rutaSegura(searchParams.get("siguiente"), destinoPorDefecto);

  if (tokenHash && tipo && TIPOS_VALIDOS.includes(tipo)) {
    const supabase = await crearClienteServidor();
    const { error } = await supabase.auth.verifyOtp({ type: tipo, token_hash: tokenHash });
    if (!error) redirect(siguiente);
  } else if (codigo) {
    const supabase = await crearClienteServidor();
    const { error } = await supabase.auth.exchangeCodeForSession(codigo);
    if (!error) redirect(siguiente);
    // El enlace se abrió en otro navegador o dispositivo. Supabase ya verificó
    // el correo, pero la sesión no se puede crear aquí.
    if (error.code === "pkce_code_verifier_not_found") redirect("/ingresar?error=otro-navegador");
  }

  redirect("/ingresar?error=enlace-invalido");
}
