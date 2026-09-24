import { ImageResponse } from "next/og";

import { COLORES, uriMarca } from "@/lib/marca";

export const alt = "EmprendeHN · Directorio de emprendedores y negocios de Honduras";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Imagen por defecto al compartir enlaces del sitio (WhatsApp, Facebook…).
// Los perfiles de negocio usan su propia foto de portada.
export default function ImagenOpenGraph() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: 80,
          background: COLORES.brandDark,
          color: "white",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ display: "flex", fontSize: 72, fontWeight: 800 }}>Emprende</div>
          <img src={uriMarca()} width={88} height={88} alt="" />
        </div>
        <div style={{ marginTop: 40, fontSize: 44, lineHeight: 1.25, maxWidth: 900 }}>
          Encuentra negocios y emprendedores en Honduras
        </div>
        <div style={{ marginTop: 24, fontSize: 28, color: "rgba(255,255,255,0.75)" }}>
          Registra tu negocio gratis · emprendehn.com
        </div>
      </div>
    ),
    size,
  );
}
