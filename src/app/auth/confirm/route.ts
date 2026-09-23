import type { EmailOtpType } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";

import { crearClienteServidor } from "@/lib/supabase/server";
import { rutaSegura } from "@/lib/utils";

const TIPOS_VALIDOS: EmailOtpType[] = ["signup", "email", "recovery", "invite", "magiclink", "email_change"];

/**
 * Destino de los enlaces de los correos de Supabase Auth (confirmación de
 * cuenta y recuperación de contraseña). Las plantillas de correo deben apuntar a:
 *   {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email
 *   {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery
 * (ver supabase/templates/).
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const tipo = searchParams.get("type") as EmailOtpType | null;

  const destinoPorDefecto = tipo === "recovery" ? "/nueva-contrasena" : "/panel?aviso=cuenta-confirmada";
  const siguiente = rutaSegura(searchParams.get("siguiente"), destinoPorDefecto);

  if (tokenHash && tipo && TIPOS_VALIDOS.includes(tipo)) {
    const supabase = await crearClienteServidor();
    const { error } = await supabase.auth.verifyOtp({ type: tipo, token_hash: tokenHash });
    if (!error) redirect(siguiente);
  }

  redirect("/ingresar?error=enlace-invalido");
}
