import { SITE_URL } from "@/lib/env";
import { COLORES } from "@/lib/marca";

import { boton, documentoCorreo, escaparHtml, FUENTE, TEXTO_SECUNDARIO, type Correo } from "./plantilla";

export type DatosNegocioAprobado = {
  negocioId: string;
  nombreNegocio: string;
  slug: string;
  nombreDueno: string | null;
  categoria: string | null;
  ciudad: string | null;
};

/** Aviso al emprendedor cuando el admin aprueba y publica su negocio. */
export function correoNegocioAprobado(d: DatosNegocioAprobado): Correo {
  const urlNegocio = `${SITE_URL}/negocio/${d.slug}`;
  const urlPanel = `${SITE_URL}/panel/negocios/${d.negocioId}`;
  const urlWhatsapp = `https://wa.me/?text=${encodeURIComponent(
    `¡Ya estamos en EmprendeHN! Conoce ${d.nombreNegocio}: ${urlNegocio}`,
  )}`;
  const primerNombre = d.nombreDueno?.trim().split(/\s+/)[0];
  const saludo = primerNombre ? `¡Hola, ${primerNombre}!` : "¡Hola!";
  const ubicacion = [d.categoria, d.ciudad].filter(Boolean).join(" · ");

  const asunto = `¡Listo! ${d.nombreNegocio} ya aparece en EmprendeHN`;
  const intro = "ya está publicado en EmprendeHN. Desde hoy, cualquier persona puede encontrarlo en el directorio, ver tus datos y contactarte.";
  const consejos = [
    {
      titulo: "Comparte tu enlace",
      texto: "Envíalo a tus contactos y publícalo en tus redes: es la forma más rápida de conseguir tus primeras visitas.",
      enlace: { texto: "Compartir por WhatsApp", url: urlWhatsapp },
    },
    {
      titulo: "Mantén tus datos al día",
      texto: "Un horario y un teléfono correctos generan confianza. Puedes editarlos desde tu panel cuando quieras.",
      enlace: { texto: "Ir a mi panel", url: urlPanel },
    },
    {
      titulo: "Muestra tu trabajo",
      texto: "Las fotos reales de tus productos o de tu local ayudan a que los clientes te elijan.",
    },
  ];

  const e = escaparHtml;
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
  <tr>
    <td align="center" style="background:${COLORES.brandDark};padding:40px 32px 36px;font-family:${FUENTE};">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto 20px;">
        <tr>
          <td align="center" valign="middle" width="64" height="64" style="width:64px;height:64px;border-radius:32px;background:${COLORES.accent};font-size:34px;font-weight:700;line-height:64px;color:${COLORES.ink};">&#10003;</td>
        </tr>
      </table>
      <h1 style="margin:0 0 10px;font-size:26px;font-weight:800;line-height:1.25;color:#ffffff;">¡Tu negocio ya está publicado!</h1>
      <p style="margin:0;font-size:16px;line-height:1.5;color:#cfe0ec;">Ya formas parte del directorio de emprendedores de Honduras.</p>
    </td>
  </tr>
  <tr>
    <td style="padding:32px 32px 0;font-family:${FUENTE};">
      <p style="margin:0 0 12px;font-size:17px;font-weight:700;color:${COLORES.brandDark};">${e(saludo)}</p>
      <p style="margin:0 0 24px;font-size:16px;line-height:1.6;color:${COLORES.ink};">Revisamos tu negocio, <strong>${e(d.nombreNegocio)}</strong>, y ${intro}</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${COLORES.brandLight};border-left:4px solid ${COLORES.accent};border-radius:12px;">
        <tr>
          <td style="padding:18px 20px;font-family:${FUENTE};">
            <p style="margin:0 0 4px;font-size:18px;font-weight:800;line-height:1.3;color:${COLORES.brandDark};">${e(d.nombreNegocio)}</p>
            ${ubicacion ? `<p style="margin:0 0 8px;font-size:14px;color:${TEXTO_SECUNDARIO};">${e(ubicacion)}</p>` : ""}
            <a href="${e(urlNegocio)}" target="_blank" style="font-size:14px;color:${COLORES.brand};overflow-wrap:break-word;word-break:break-word;">${e(urlNegocio.replace(/^https?:\/\//, ""))}</a>
          </td>
        </tr>
      </table>
      <div style="padding:28px 0 32px;">${boton("Ver mi negocio publicado", e(urlNegocio))}</div>
    </td>
  </tr>
  <tr>
    <td style="padding:0 32px 12px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="border-top:1px solid #e1e8ed;padding-top:28px;font-family:${FUENTE};">
            <h2 style="margin:0 0 20px;font-size:18px;font-weight:800;color:${COLORES.brandDark};">Consigue tus primeros clientes</h2>
            ${htmlConsejos}
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`;

  const texto = [
    saludo,
    "",
    `Revisamos tu negocio, ${d.nombreNegocio}, y ${intro}`,
    "",
    `Ver tu negocio: ${urlNegocio}`,
    "",
    "Consigue tus primeros clientes:",
    ...consejos.flatMap((c, i) => [
      `${i + 1}. ${c.titulo}: ${c.texto}`,
      ...(c.enlace ? [`   ${c.enlace.texto}: ${c.enlace.url}`] : []),
    ]),
    "",
    "—",
    "Recibiste este correo porque registraste un negocio en EmprendeHN.",
    SITE_URL,
  ].join("\n");

  return {
    asunto,
    html: documentoCorreo({ asunto, resumen: `${d.nombreNegocio} ya aparece en el directorio. Compártelo con tus clientes.`, contenido, urlSitio: SITE_URL }),
    texto,
  };
}
