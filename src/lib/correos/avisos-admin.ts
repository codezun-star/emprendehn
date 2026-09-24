import "server-only";

import { after } from "next/server";

import { CORREO_CONTACTO, describirCambios } from "@/lib/constantes";
import { SITE_URL } from "@/lib/env";

import { enviarCorreo } from "./enviar";
import {
  boton,
  documentoCorreo,
  escaparHtml as e,
  filaEncabezado,
  FUENTE,
  parrafo,
  recuadro,
  textoMultilinea,
  type Correo,
} from "./plantilla";

// Avisos al admin para que no tenga que entrar a /admin a revisar si hay trabajo.
// Destino: CORREO_ADMIN (uno o varios separados por coma) o, si no existe, el
// correo de contacto.

export type AvisoAdmin =
  | { tipo: "nuevo"; negocioId: string; nombre: string; dueno: string }
  | { tipo: "reenviado"; negocioId: string; nombre: string }
  | { tipo: "cambios"; negocioId: string; nombre: string; cambios: string[] }
  | { tipo: "reporte"; negocioId: string; nombre: string; motivo: string; detalle: string | null };

type Estado = { estado: string; cambios_por_revisar_desde: string | null };

/**
 * Qué avisar después de que el dueño edita su negocio o sube una foto:
 * reenvío a revisión (rechazado/suspendido → pendiente) o el PRIMER cambio
 * sin revisar de un negocio publicado (los siguientes no vuelven a avisar).
 */
export function avisoPorCambio(
  antes: Estado,
  despues: Estado & { cambios_por_revisar: string[] },
): "reenviado" | "cambios" | null {
  if ((antes.estado === "rechazado" || antes.estado === "suspendido") && despues.estado === "pendiente") {
    return "reenviado";
  }
  if (antes.estado === "aprobado" && !antes.cambios_por_revisar_desde && despues.cambios_por_revisar_desde) {
    return "cambios";
  }
  return null;
}

/** Envía el aviso después de responder al usuario (no lo hace esperar). */
export function programarAvisoAdmin(aviso: AvisoAdmin) {
  after(async () => {
    const destinatarios = (process.env.CORREO_ADMIN || CORREO_CONTACTO)
      .split(",")
      .map((c) => c.trim())
      .filter(Boolean);
    await enviarCorreo(destinatarios, correoAviso(aviso));
  });
}

function correoAviso(aviso: AvisoAdmin): Correo {
  const urlNegocio = `${SITE_URL}/admin/negocios/${aviso.negocioId}`;
  const nombre = e(aviso.nombre);

  const t = (() => {
    switch (aviso.tipo) {
      case "nuevo":
        return {
          asunto: `Nuevo negocio por revisar: ${aviso.nombre}`,
          icono: "+",
          titulo: "Nuevo negocio por revisar",
          cuerpo: parrafo(`<strong>${e(aviso.dueno)}</strong> registró <strong>${nombre}</strong>. Revísalo para publicarlo o pedir cambios.`),
          texto: `${aviso.dueno} registró ${aviso.nombre}. Revísalo para publicarlo o pedir cambios.`,
          boton: "Revisar negocio",
          url: urlNegocio,
        };
      case "reenviado":
        return {
          asunto: `${aviso.nombre} volvió a revisión`,
          icono: "&#8635;",
          titulo: "Un negocio volvió a revisión",
          cuerpo: parrafo(`El dueño de <strong>${nombre}</strong> hizo cambios después de que lo rechazaras o suspendieras.`),
          texto: `El dueño de ${aviso.nombre} hizo cambios después de que lo rechazaras o suspendieras.`,
          boton: "Revisar negocio",
          url: urlNegocio,
        };
      case "cambios":
        return {
          asunto: `${aviso.nombre} cambió datos publicados`,
          icono: "!",
          titulo: "Cambios por revisar",
          cuerpo:
            parrafo(`<strong>${nombre}</strong> está publicado y su dueño cambió: <strong>${e(describirCambios(aviso.cambios))}</strong>.`) +
            parrafo("Los cambios ya se ven en el directorio. Si algo no cumple las reglas, suspéndelo con un motivo."),
          texto: `${aviso.nombre} está publicado y su dueño cambió: ${describirCambios(aviso.cambios)}. Los cambios ya se ven en el directorio.`,
          boton: "Revisar cambios",
          url: urlNegocio,
        };
      case "reporte":
        return {
          asunto: `Reporte: ${aviso.nombre}`,
          icono: "!",
          titulo: "Reportaron un negocio",
          cuerpo:
            parrafo(`Alguien reportó <strong>${nombre}</strong>.`) +
            recuadro(
              `<p style="margin:0;font-family:${FUENTE};font-size:16px;line-height:1.6;"><strong>${e(aviso.motivo)}</strong>${
                aviso.detalle ? `<br>${textoMultilinea(aviso.detalle)}` : ""
              }</p>`,
            ) +
            '<div style="height:24px;"></div>',
          texto: `Alguien reportó ${aviso.nombre}.\n\nMotivo: ${aviso.motivo}${aviso.detalle ? `\n${aviso.detalle}` : ""}`,
          boton: "Ver reportes",
          url: `${SITE_URL}/admin/reportes`,
        };
    }
  })();

  const contenido = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
  ${filaEncabezado({ icono: t.icono, titulo: t.titulo, subtitulo: "Panel de administración de EmprendeHN" })}
  <tr>
    <td style="padding:32px 32px 36px;font-family:${FUENTE};">
      ${t.cuerpo}
      ${boton(t.boton, e(t.url))}
    </td>
  </tr>
</table>`;

  return {
    asunto: t.asunto,
    html: documentoCorreo({
      asunto: t.asunto,
      resumen: t.texto,
      contenido,
      urlSitio: SITE_URL,
      pie: "Recibiste este correo porque eres administrador de EmprendeHN.",
    }),
    texto: `${t.texto}\n\n${t.boton}: ${t.url}`,
  };
}
