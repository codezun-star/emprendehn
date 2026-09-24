import { ImageResponse } from "next/og";

import { uriMarca } from "@/lib/marca";

// El logo "HN" en PNG para el encabezado de los correos: los clientes de
// correo (Gmail, Outlook) no muestran SVG. Se genera una vez en el build.
export const dynamic = "force-static";

export function GET() {
  // ImageResponse dibuja JSX a PNG: next/image no aplica aquí.
  // eslint-disable-next-line @next/next/no-img-element
  return new ImageResponse(<img src={uriMarca()} width={120} height={120} alt="" />, { width: 120, height: 120 });
}
