"use server";

import type { AuthError } from "@supabase/supabase-js";
import { redirect } from "next/navigation";

import { SITE_URL } from "@/lib/env";
import { crearClienteServidor } from "@/lib/supabase/server";
import { rutaSegura } from "@/lib/utils";
import {
  ingresoSchema,
  nuevaContrasenaSchema,
  recuperacionSchema,
  registroSchema,
  type IngresoInput,
  type NuevaContrasenaInput,
  type RecuperacionInput,
  type RegistroInput,
} from "@/lib/validaciones/auth";
import { falloValidacion, type ResultadoAccion } from "@/lib/validaciones/comun";

function traducirErrorAuth(error: AuthError): string {
  switch (error.code) {
    case "invalid_credentials":
      return "Correo o contraseña incorrectos.";
    case "email_not_confirmed":
      return "Todavía no confirmas tu correo. Revisa tu bandeja de entrada (y la carpeta de spam).";
    case "user_already_exists":
    case "email_exists":
      return "Ya existe una cuenta con ese correo. Intenta ingresar o recuperar tu contraseña.";
    case "weak_password":
      return "La contraseña es muy débil. Usa al menos 8 caracteres combinando letras y números.";
    case "same_password":
      return "La nueva contraseña debe ser distinta a la anterior.";
    case "over_email_send_rate_limit":
    case "over_request_rate_limit":
      return "Demasiados intentos. Espera unos minutos y vuelve a intentarlo.";
    case "signup_disabled":
      return "El registro está deshabilitado temporalmente.";
    default:
      return "Ocurrió un error inesperado. Inténtalo de nuevo.";
  }
}

export async function registrarse(
  input: RegistroInput,
): Promise<ResultadoAccion<{ email: string }>> {
  const parsed = registroSchema.safeParse(input);
  if (!parsed.success) return falloValidacion(parsed.error);
  const { email, password, nombre_completo } = parsed.data;

  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { nombre_completo },
      emailRedirectTo: `${SITE_URL}/auth/confirm`,
    },
  });
  if (error) return { ok: false, error: traducirErrorAuth(error), codigo: error.code };

  // Si la confirmación de correo está desactivada, Supabase ya devuelve la sesión.
  if (data.session) redirect("/panel");

  // Por seguridad Supabase no revela si el correo ya existía: siempre mostramos
  // "revisa tu correo".
  return { ok: true, datos: { email } };
}

export async function iniciarSesion(input: IngresoInput): Promise<ResultadoAccion> {
  const parsed = ingresoSchema.safeParse(input);
  if (!parsed.success) return falloValidacion(parsed.error);
  const { email, password, siguiente } = parsed.data;

  const supabase = await crearClienteServidor();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { ok: false, error: traducirErrorAuth(error), codigo: error.code };

  redirect(rutaSegura(siguiente));
}

export async function reenviarConfirmacion(input: RecuperacionInput): Promise<ResultadoAccion> {
  const parsed = recuperacionSchema.safeParse(input);
  if (!parsed.success) return falloValidacion(parsed.error);

  const supabase = await crearClienteServidor();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email: parsed.data.email,
    options: { emailRedirectTo: `${SITE_URL}/auth/confirm` },
  });
  if (error) return { ok: false, error: traducirErrorAuth(error), codigo: error.code };
  return { ok: true, mensaje: "Te enviamos un nuevo correo de confirmación." };
}

export async function solicitarRecuperacion(input: RecuperacionInput): Promise<ResultadoAccion> {
  const parsed = recuperacionSchema.safeParse(input);
  if (!parsed.success) return falloValidacion(parsed.error);

  const supabase = await crearClienteServidor();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${SITE_URL}/auth/confirm?siguiente=/nueva-contrasena`,
  });
  // No revelamos si el correo existe; solo informamos límites de envío.
  if (error && error.code?.startsWith("over_")) {
    return { ok: false, error: traducirErrorAuth(error), codigo: error.code };
  }
  return { ok: true };
}

export async function actualizarContrasena(input: NuevaContrasenaInput): Promise<ResultadoAccion> {
  const parsed = nuevaContrasenaSchema.safeParse(input);
  if (!parsed.success) return falloValidacion(parsed.error);

  const supabase = await crearClienteServidor();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) {
    return {
      ok: false,
      error: "Tu enlace expiró. Solicita uno nuevo para restablecer tu contraseña.",
      codigo: "sin_sesion",
    };
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { ok: false, error: traducirErrorAuth(error), codigo: error.code };

  redirect("/panel?aviso=contrasena-actualizada");
}

export async function cerrarSesion() {
  const supabase = await crearClienteServidor();
  await supabase.auth.signOut();
  redirect("/");
}
