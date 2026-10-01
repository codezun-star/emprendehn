import type { MetadataRoute } from "next";

import { SITE_NAME } from "@/lib/env";
import { COLORES } from "@/lib/marca";

// Permite instalar el sitio como app (Android, iPhone, computadora): se abre a
// pantalla completa, sin la barra del navegador, con su ícono en el inicio.
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: `${SITE_NAME} · Negocios de Honduras`,
    short_name: SITE_NAME,
    description:
      "Encuentra negocios, emprendedores y servicios en tu ciudad y contáctalos directo por WhatsApp.",
    lang: "es-HN",
    dir: "ltr",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: COLORES.brandLight,
    theme_color: COLORES.brandDark,
    categories: ["business", "shopping", "lifestyle"],
    icons: [
      { src: "/iconos/app-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/iconos/app-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/iconos/adaptable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    // Accesos directos al mantener presionado el ícono.
    shortcuts: [
      { name: "Buscar negocios", short_name: "Buscar", url: "/buscar" },
      { name: "Categorías", url: "/categorias" },
      { name: "Mi panel", url: "/panel" },
    ],
  };
}
