import type { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/env";

export default function robots(): MetadataRoute.Robots {
  const esProduccion = process.env.VERCEL_ENV ? process.env.VERCEL_ENV === "production" : true;

  // Previews de Vercel: no indexar (evita contenido duplicado con el dominio real).
  if (!esProduccion) {
    return { rules: { userAgent: "*", disallow: "/" } };
  }

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Áreas privadas y búsqueda interna (combinaciones infinitas de parámetros).
      disallow: ["/panel", "/admin", "/dos-pasos", "/auth/", "/buscar", "/nueva-contrasena"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
