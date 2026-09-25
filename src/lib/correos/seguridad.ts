import "server-only";

import { CORREO_CONTACTO } from "@/lib/constantes";
import { SITE_URL } from "@/lib/env";

import {
  boton,
  documentoCorreo,
  escaparHtml as e,
  filaEncabezado,
  FUENTE,
  parrafo,
  recuadro,
  type Correo,
} from "./plantilla";

/**
 * Aviso al admin cuando se activa la verificación en dos pasos en su cuenta:
 * si no fue él, alguien más tiene su contraseña.
 */
export function correoDosPasosActivada(email: string, fecha: Date): Correo {
  const cuando = new Intl.DateTimeFormat("es-HN", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "America/Tegucigalpa",
  }).format(fecha);
  const asunto = "Activaste la verificación en dos pasos";
  const contenido = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
  ${filaEncabezado({ icono: "✓", titulo: asunto, subtitulo: "Seguridad de tu cuenta de administrador" })}
  <tr>
    <td style="padding:32px 32px 36px;font-family:${FUENTE};">
      ${parrafo(`La cuenta <strong>${e(email)}</strong> ahora pide el código de tu app de autenticación para entrar al panel de administración (${e(cuando)}, hora de Honduras).`)}
      ${recuadro(`<p style="margin:0;font-family:${FUENTE};font-size:15px;line-height:1.6;"><strong>¿No fuiste tú?</strong> Alguien conoce tu contraseña. Cámbiala de inmediato y escríbenos a ${e(CORREO_CONTACTO)} para quitar ese dispositivo.</p>`)}
      <div style="height:24px;"></div>
      ${boton("Ir al panel de administración", e(`${SITE_URL}/admin`))}
    </td>
  </tr>
</table>`;

  return {
    asunto,
    html: documentoCorreo({
      asunto,
      resumen: "Tu cuenta de administrador ahora pide un código al ingresar.",
      contenido,
      urlSitio: SITE_URL,
      pie: "Recibiste este correo porque eres administrador de EmprendeHN.",
    }),
    texto: `La cuenta ${email} ahora pide el código de tu app de autenticación para entrar al panel de administración (${cuando}, hora de Honduras).\n\n¿No fuiste tú? Alguien conoce tu contraseña. Cámbiala de inmediato y escríbenos a ${CORREO_CONTACTO}.\n\n${SITE_URL}/admin`,
  };
}
