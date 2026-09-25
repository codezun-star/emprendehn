"use server";

import type { AuthError } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { z } from "zod";

import { obtenerSesion } from "@/lib/auth";
import { conAviso } from "@/lib/avisos";
import { enviarCorreo } from "@/lib/correos/enviar";
import { correoDosPasosActivada } from "@/lib/correos/seguridad";
import { destinoAdmin } from "@/lib/dos-pasos";
import { crearClienteServidor } from "@/lib/supabase/server";
import { falloValidacion, type ResultadoAccion } from "@/lib/validaciones/comun";

// Verificación en dos pasos del admin con Supabase Auth MFA (TOTP).
// Solo para cuentas con rol admin: a los dueños de negocios no se les pide.

const NO_AUTORIZADO: ResultadoAccion<never> = { ok: false, error: "No autorizado." };

const codigoSchema = z.object({
  factorId: z.uuid(),
  codigo: z
    .string()
    .transform((v) => v.replace(/\s/g, ""))
    .pipe(z.string().regex(/^\d{6}$/, "El código tiene 6 números.")),
  siguiente: z.string().max(2000).optional(),
});

function traducirErrorMfa(error: AuthError): string {
  switch (error.code) {
    case "mfa_verification_failed":
      return "El código no es correcto. Usa el código que muestra tu app en este momento (y revisa que la hora de tu teléfono esté bien).";
    case "mfa_challenge_expired":
      return "El código venció. Ingresa el código que muestra tu app ahora.";
    case "over_request_rate_limit":
      return "Demasiados intentos. Espera unos minutos y vuelve a intentarlo.";
    case "mfa_totp_enroll_not_enabled":
    case "mfa_totp_verify_not_enabled":
      return "La verificación con app de autenticación (TOTP) está desactivada en Supabase: actívala en Authentication → Multi-Factor.";
    case "too_many_enrolled_mfa_factors":
      return "La cuenta tiene demasiados dispositivos registrados. Escríbenos para limpiarlos.";
    default:
      console.error("[dos-pasos]", error.code, error.message);
      return "Ocurrió un error inesperado. Inténtalo de nuevo.";
  }
}

async function sesionConRolAdmin() {
  const sesion = await obtenerSesion();
  return sesion?.rolAdmin ? sesion : null;
}

/**
 * Primer paso de la activación: crea el factor TOTP (sin verificar) y
 * devuelve el QR y la clave para escribirla a mano.
 */
export async function iniciarInscripcion(): Promise<ResultadoAccion<{ factorId: string; qr: string; secreto: string }>> {
  if (!(await sesionConRolAdmin())) return NO_AUTORIZADO;
  const supabase = await crearClienteServidor();

  const { data: factores, error: errorFactores } = await supabase.auth.mfa.listFactors();
  if (errorFactores) return { ok: false, error: traducirErrorMfa(errorFactores) };
  if (factores.totp.length > 0) {
    return { ok: false, error: "La verificación en dos pasos ya está activada. Recarga la página para ingresar tu código." };
  }
  // Activaciones que quedaron a medias (se cerró la página antes de confirmar).
  for (const factor of factores.all) {
    if (factor.factor_type === "totp" && factor.status === "unverified") {
      await supabase.auth.mfa.unenroll({ factorId: factor.id });
    }
  }

  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: "totp",
    issuer: "EmprendeHN",
    friendlyName: `Admin EmprendeHN ${new Date().toISOString().slice(0, 16)}`,
  });
  if (error) return { ok: false, error: traducirErrorMfa(error) };
  return { ok: true, datos: { factorId: data.id, qr: qrComoImagen(data.totp.qr_code), secreto: data.totp.secret } };
}

/**
 * supabase-js entrega el QR como "data:image/svg+xml;utf-8,<svg…>" sin codificar:
 * un "#" dentro del SVG cortaría la imagen. Se vuelve a armar codificado.
 */
function qrComoImagen(qr: string): string {
  const prefijo = "data:image/svg+xml;utf-8,";
  return qr.startsWith(prefijo) ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(qr.slice(prefijo.length))}` : qr;
}

/** Verifica el código (al activar o al ingresar) y entra al panel de administración. */
export async function verificarCodigo(input: z.input<typeof codigoSchema>): Promise<ResultadoAccion> {
  const sesion = await sesionConRolAdmin();
  if (!sesion) return NO_AUTORIZADO;
  const parsed = codigoSchema.safeParse(input);
  if (!parsed.success) return falloValidacion(parsed.error);
  const { factorId, codigo, siguiente } = parsed.data;

  const supabase = await crearClienteServidor();
  const { data: factores, error: errorFactores } = await supabase.auth.mfa.listFactors();
  if (errorFactores) return { ok: false, error: traducirErrorMfa(errorFactores) };
  const factor = factores.all.find((f) => f.id === factorId && f.factor_type === "totp");
  if (!factor) return { ok: false, error: "Recarga la página e inténtalo de nuevo." };

  // Guarda la sesión nueva (aal2) en las cookies.
  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code: codigo });
  if (error) return { ok: false, error: traducirErrorMfa(error), campos: { codigo: traducirErrorMfa(error) } };

  if (factor.status === "unverified") {
    const email = sesion.email;
    after(() => enviarCorreo(email, correoDosPasosActivada(email, new Date())));
  }
  redirect(destinoAdmin(siguiente));
}

/**
 * Cierra la sesión en todos los dispositivos (revoca todos los refresh tokens).
 * Para cuando se pierde un teléfono o se sospecha de un acceso.
 */
export async function cerrarSesionEnTodos(): Promise<void> {
  const supabase = await crearClienteServidor();
  await supabase.auth.signOut({ scope: "global" });
  redirect(conAviso("/ingresar", "sesiones-cerradas"));
}
