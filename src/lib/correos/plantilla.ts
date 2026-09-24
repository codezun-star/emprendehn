import { COLORES } from "@/lib/marca";

// Piezas comunes de los correos. Los clientes de correo ignoran <style> y CSS
// moderno, así que todo va en tablas con estilos en línea.

export type Correo = { asunto: string; html: string; texto: string };

export const FUENTE = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
export const TEXTO_SECUNDARIO = "#4a5b68";

/** Obligatorio para todo texto que venga de usuarios (nombre del negocio, del dueño…). */
export function escaparHtml(texto: string): string {
  return texto.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

/** Botón que se ve igual en Gmail, Outlook y Apple Mail. `url` ya escapada. */
export function boton(texto: string, url: string, variante: "principal" | "secundario" = "principal"): string {
  const [fondo, color] = variante === "principal" ? [COLORES.accent, COLORES.ink] : [COLORES.brandDark, "#ffffff"];
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;">
  <tr>
    <td style="border-radius:10px;background:${fondo};">
      <a href="${url}" target="_blank" style="display:inline-block;padding:14px 28px;font-family:${FUENTE};font-size:16px;font-weight:700;line-height:1.2;color:${color};text-decoration:none;border-radius:10px;">${texto}</a>
    </td>
  </tr>
</table>`;
}

/**
 * Documento completo: logo, tarjeta blanca con `contenido` y pie. `resumen` es el
 * texto que los clientes de correo muestran junto al asunto en la bandeja.
 */
export function documentoCorreo({
  asunto,
  resumen,
  contenido,
  urlSitio,
}: {
  asunto: string;
  resumen: string;
  contenido: string;
  urlSitio: string;
}): string {
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${escaparHtml(asunto)}</title>
</head>
<body style="margin:0;padding:0;background:${COLORES.brandLight};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">${escaparHtml(resumen)}${"&#8199;&#847;".repeat(40)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${COLORES.brandLight};">
  <tr>
    <td align="center" style="padding:32px 12px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">
        <tr>
          <td align="center" style="padding:0 0 24px;font-family:${FUENTE};font-size:26px;font-weight:800;letter-spacing:-0.5px;color:${COLORES.brandDark};">
            <a href="${urlSitio}" target="_blank" style="color:${COLORES.brandDark};text-decoration:none;">Emprende<span style="color:${COLORES.accent};">HN</span></a>
          </td>
        </tr>
        <tr>
          <td style="background:#ffffff;border-radius:16px;border:1px solid #e1e8ed;overflow:hidden;">
            ${contenido}
          </td>
        </tr>
        <tr>
          <td align="center" style="padding:24px 16px 0;font-family:${FUENTE};font-size:13px;line-height:1.6;color:${TEXTO_SECUNDARIO};">
            Recibiste este correo porque registraste un negocio en EmprendeHN.<br>
            <a href="${urlSitio}" target="_blank" style="color:${TEXTO_SECUNDARIO};">EmprendeHN</a> · Directorio de emprendedores de Honduras
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}
