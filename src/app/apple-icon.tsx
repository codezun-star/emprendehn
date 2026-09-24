import { ImageResponse } from "next/og";

import { uriMarca } from "@/lib/marca";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    // Cuadrado: iOS le aplica sus propias esquinas redondeadas.
    <img src={uriMarca(0)} width={180} height={180} alt="" />,
    size,
  );
}
