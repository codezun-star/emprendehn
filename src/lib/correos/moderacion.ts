import { SITE_URL } from "@/lib/env";
import { COLORES } from "@/lib/marca";
import type { Enums } from "@/types/database.types";

import {
  boton,
  documentoCorreo,
  escaparHtml as e,
  filaEncabezado,
  FUENTE,
  parrafo,
  parrafoSaludo,
  recuadro,
  saludo,
  TEXTO_SECUNDARIO,
  textoMultilinea,
  type Correo,
} from "./plantilla";

// Avisos al emprendedor cuando el admin cambia el estado de su negocio.
// "Volver a pendiente" no avisa: es una corrección interna del admin.

export type DatosCorreoModeracion = {
  negocioId: string;
  nombreNegocio: string;
  slug: string;
  nombreDueno: string | null;
  categoria: string | null;
  ciudad: string | null;
  /** Motivo escrito por el admin (rechazo o suspensión). */
  motivo: string | null;
  /** Ya estuvo publicado antes (p. ej. se reactiva tras una suspensión). */
  publicadoAntes: boolean;
};

export function correoDeModeracion(estado: Enums<"business_status">, d: DatosCorreoModeracion): Correo | null {
  switch (estado) {
    case "aprobado":
      return correoAprobado(d);
    case "rechazado":
      return correoConMotivo(d, {
        asunto: `${d.nombreNegocio} necesita algunos cambios para publicarse`,
        resumen: "Revisamos tu negocio y te falta poco para publicarlo.",
        icono: "!",
        titulo: "Tu negocio necesita algunos cambios",
        subtitulo: "Todavía no está publicado, pero te falta poco.",
        intro: "y antes de publicarlo necesitamos que ajustes lo siguiente:",
        cierre:
          "Cuando lo corrijas y guardes los cambios desde tu panel (o agregues las fotos que falten), tu negocio volverá a revisión automáticamente y te avisaremos por correo.",
        boton: "Corregir mi negocio",
      });
    case "suspendido":
      return correoConMotivo(d, {
        asunto: `Suspendimos ${d.nombreNegocio} en EmprendeHN`,
        resumen: "Tu negocio ya no aparece en el directorio. Te contamos por qué.",
        icono: "!",
        fondoIcono: "#cfe0ec",
        titulo: "Suspendimos tu negocio",
        subtitulo: "Por ahora no aparece en el directorio.",
        intro: "y lo retiramos del directorio por el siguiente motivo:",
        cierre:
          "Si corriges lo indicado y guardas los cambios desde tu panel, lo revisaremos de nuevo para volver a publicarlo.",
        boton: "Ir a mi negocio",
      });
    case "pendiente":
      return null;
  }
}

function urls(d: DatosCorreoModeracion) {
  return {
    negocio: `${SITE_URL}/negocio/${d.slug}`,
    panel: `${SITE_URL}/panel/negocios/${d.negocioId}`,
  };
}

function correoAprobado(d: DatosCorreoModeracion): Correo {
  const url = urls(d);
  const urlWhatsapp = `https://wa.me/?text=${encodeURIComponent(
    `¡Ya estamos en EmprendeHN! Conoce ${d.nombreNegocio}: ${url.negocio}`,
  )}`;
  const hola = saludo(d.nombreDueno);
  const ubicacion = [d.categoria, d.ciudad].filter(Boolean).join(" · ");
  const deNuevo = d.publicadoAntes;

  const asunto = deNuevo
    ? `¡Listo! ${d.nombreNegocio} aparece de nuevo en EmprendeHN`
    : `¡Listo! ${d.nombreNegocio} ya aparece en EmprendeHN`;
  const intro = deNuevo
    ? "ya está visible otra vez en EmprendeHN. Cualquier persona puede encontrarlo en el directorio, ver tus datos y contactarte."
    : "ya está publicado en EmprendeHN. Desde hoy, cualquier persona puede encontrarlo en el directorio, ver tus datos y contactarte.";
  const tituloConsejos = deNuevo ? "Consigue más clientes" : "Consigue tus primeros clientes";
  const consejos = [
    {
      titulo: "Comparte tu enlace",
      texto: `Envíalo a tus contactos y publícalo en tus redes: es la forma más rápida de conseguir ${deNuevo ? "visitas" : "tus primeras visitas"}.`,
      enlace: { texto: "Compartir por WhatsApp", url: urlWhatsapp },
    },
    {
      titulo: "Mantén tus datos al día",
      texto: "Un horario y un teléfono correctos generan confianza. Puedes editarlos desde tu panel cuando quieras.",
      enlace: { texto: "Ir a mi panel", url: url.panel },
    },
    {
      titulo: "Muestra tu trabajo",
      texto: "Las fotos reales de tus productos o de tu local ayudan a que los clientes te elijan.",
    },
  ];

  const htmlConsejos = consejos
    .map(
      (c, i) => `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
  <tr>
    <td width="44" valign="top" style="padding:0 0 20px;">
      <div style="width:32px;height:32px;border-radius:16px;background:${COLORES.brandLight};font-family:${FUENTE};font-size:15px;font-weight:800;line-height:32px;text-align:center;color:${COLORES.brandDark};">${i + 1}</div>
    </td>
    <td valign="top" style="padding:0 0 20px;font-family:${FUENTE};">
      <p style="margin:0 0 4px;font-size:16px;font-weight:700;line-height:1.4;color:${COLORES.ink};">${c.titulo}</p>
      <p style="margin:0;font-size:15px;line-height:1.55;color:${TEXTO_SECUNDARIO};">${c.texto}</p>
      ${c.enlace ? `<p style="margin:8px 0 0;font-size:15px;font-weight:700;"><a href="${e(c.enlace.url)}" target="_blank" style="color:${COLORES.brand};text-decoration:none;">${c.enlace.texto} &rarr;</a></p>` : ""}
    </td>
  </tr>
</table>`,
    )
    .join("\n");

  const contenido = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
  ${filaEncabezado({
    icono: "&#10003;",
    titulo: deNuevo ? "¡Tu negocio está publicado de nuevo!" : "¡Tu negocio ya está publicado!",
    subtitulo: deNuevo
      ? "Ya aparece otra vez en el directorio de emprendedores de Honduras."
      : "Ya formas parte del directorio de emprendedores de Honduras.",
  })}
  <tr>
    <td style="padding:32px 32px 0;font-family:${FUENTE};">
      ${parrafoSaludo(hola)}
      ${parrafo(`Revisamos tu negocio, <strong>${e(d.nombreNegocio)}</strong>, y ${intro}`)}
      ${recuadro(`<p style="margin:0 0 4px;font-size:18px;font-weight:800;line-height:1.3;color:${COLORES.brandDark};">${e(d.nombreNegocio)}</p>
            ${ubicacion ? `<p style="margin:0 0 8px;font-size:14px;color:${TEXTO_SECUNDARIO};">${e(ubicacion)}</p>` : ""}
            <a href="${e(url.negocio)}" target="_blank" style="font-size:14px;color:${COLORES.brand};overflow-wrap:break-word;word-break:break-word;">${e(url.negocio.replace(/^https?:\/\//, ""))}</a>`)}
      <div style="padding:28px 0 32px;">${boton("Ver mi negocio publicado", e(url.negocio))}</div>
    </td>
  </tr>
  <tr>
    <td style="padding:0 32px 12px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="border-top:1px solid #e1e8ed;padding-top:28px;font-family:${FUENTE};">
            <h2 style="margin:0 0 20px;font-size:18px;font-weight:800;color:${COLORES.brandDark};">${tituloConsejos}</h2>
            ${htmlConsejos}
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`;

  const texto = [
    hola,
    "",
    `Revisamos tu negocio, ${d.nombreNegocio}, y ${intro}`,
    "",
    `Ver tu negocio: ${url.negocio}`,
    "",
    `${tituloConsejos}:`,
    ...consejos.flatMap((c, i) => [
      `${i + 1}. ${c.titulo}: ${c.texto}`,
      ...(c.enlace ? [`   ${c.enlace.texto}: ${c.enlace.url}`] : []),
    ]),
    ...pieTexto(),
  ].join("\n");

  return {
    asunto,
    html: documentoCorreo({
      asunto,
      resumen: `${d.nombreNegocio} ya aparece en el directorio. Compártelo con tus clientes.`,
      contenido,
      urlSitio: SITE_URL,
    }),
    texto,
  };
}

/** Rechazo y suspensión: mismo esquema con el mensaje del admin destacado. */
function correoConMotivo(
  d: DatosCorreoModeracion,
  t: {
    asunto: string;
    resumen: string;
    icono: string;
    fondoIcono?: string;
    titulo: string;
    subtitulo: string;
    intro: string;
    cierre: string;
    boton: string;
  },
): Correo {
  const url = urls(d);
  const hola = saludo(d.nombreDueno);

  const contenido = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
  ${filaEncabezado({ icono: t.icono, fondoIcono: t.fondoIcono, titulo: t.titulo, subtitulo: t.subtitulo })}
  <tr>
    <td style="padding:32px 32px 36px;font-family:${FUENTE};">
      ${parrafoSaludo(hola)}
      ${parrafo(`Revisamos tu negocio, <strong>${e(d.nombreNegocio)}</strong>, ${t.intro}`)}
      ${d.motivo
        ? recuadro(`<p style="margin:0 0 6px;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:${TEXTO_SECUNDARIO};">Mensaje del equipo de EmprendeHN</p>
            <p style="margin:0;font-size:16px;line-height:1.6;color:${COLORES.ink};">${textoMultilinea(d.motivo)}</p>`)
        : ""}
      <div style="padding-top:24px;">${parrafo(t.cierre, 28)}</div>
      ${boton(t.boton, e(url.panel))}
    </td>
  </tr>
</table>`;

  const texto = [
    hola,
    "",
    `Revisamos tu negocio, ${d.nombreNegocio}, ${t.intro}`,
    ...(d.motivo ? ["", d.motivo.trim()] : []),
    "",
    t.cierre,
    "",
    `${t.boton}: ${url.panel}`,
    ...pieTexto(),
  ].join("\n");

  return {
    asunto: t.asunto,
    html: documentoCorreo({ asunto: t.asunto, resumen: t.resumen, contenido, urlSitio: SITE_URL }),
    texto,
  };
}

function pieTexto() {
  return ["", "—", "Recibiste este correo porque registraste un negocio en EmprendeHN.", SITE_URL];
}
