import { ImageResponse } from "next/og";

import { uriMarca, uriMarcaAdaptable } from "@/lib/marca";

// Íconos de la app instalada en el celular o la computadora (manifest.ts).
// Se generan una vez en el build; cualquier otro nombre da 404.
const ICONOS: Record<string, { tamano: number; src: () => string }> = {
  "app-192.png": { tamano: 192, src: () => uriMarca() },
  "app-512.png": { tamano: 512, src: () => uriMarca() },
  "adaptable-512.png": { tamano: 512, src: uriMarcaAdaptable },
};

export const dynamicParams = false;

export function generateStaticParams() {
  return Object.keys(ICONOS).map((icono) => ({ icono }));
}

export async function GET(_request: Request, { params }: RouteContext<"/iconos/[icono]">) {
  const { tamano, src } = ICONOS[(await params).icono];
  // ImageResponse dibuja JSX a PNG: next/image no aplica aquí.
  // eslint-disable-next-line @next/next/no-img-element
  return new ImageResponse(<img src={src()} width={tamano} height={tamano} alt="" />, {
    width: tamano,
    height: tamano,
  });
}
