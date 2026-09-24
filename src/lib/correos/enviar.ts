import "server-only";

import type { Correo } from "./plantilla";

// Correos propios de la aplicación, enviados con la API de Resend.
// Los de autenticación (confirmación, recuperación) NO pasan por aquí: los envía
// Supabase Auth con Resend configurado como SMTP en su dashboard (ver README).

const REMITENTE = "EmprendeHN <no-reply@emprendehn.com>";
const API_RESEND = "https://api.resend.com/emails";

/** `sin-configurar`: falta RESEND_API_KEY (desarrollo local o previews). */
export type ResultadoEnvio = "enviado" | "sin-configurar" | "error";

/** Envía un correo. Nunca lanza: un fallo de correo no debe deshacer la acción que lo originó. */
export async function enviarCorreo(para: string, correo: Correo): Promise<ResultadoEnvio> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn(`[correo] RESEND_API_KEY no está definida; no se envió "${correo.asunto}".`);
    return "sin-configurar";
  }

  try {
    const respuesta = await fetch(API_RESEND, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: REMITENTE,
        to: [para],
        subject: correo.asunto,
        html: correo.html,
        text: correo.texto,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!respuesta.ok) {
      console.error(`[correo] Resend respondió ${respuesta.status}: ${await respuesta.text()}`);
      return "error";
    }
    return "enviado";
  } catch (error) {
    console.error("[correo] No se pudo contactar a Resend:", error);
    return "error";
  }
}
