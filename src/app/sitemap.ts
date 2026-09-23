import type { MetadataRoute } from "next";

import {
  obtenerCategorias,
  obtenerNegociosParaSitemap,
  obtenerResumen,
} from "@/lib/consultas/directorio";
import { urlAbsoluta } from "@/lib/seo";

// Se regenera cada hora y on-demand (revalidatePath("/sitemap.xml")) cuando
// se aprueba, edita o retira un negocio.
export const revalidate = 3600;

/**
 * Incluye solo páginas con contenido: categorías y combinaciones
 * categoría + ciudad con al menos un negocio aprobado, y todos los negocios
 * aprobados. (Límite del protocolo: 50 000 URLs; al acercarse, dividir con
 * generateSitemaps.)
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [{ todas: categorias }, resumen, negocios] = await Promise.all([
    obtenerCategorias(),
    obtenerResumen(),
    obtenerNegociosParaSitemap(),
  ]);

  const ultimaActualizacionPorCategoria = new Map<string, string>();
  for (const fila of resumen) {
    const actual = ultimaActualizacionPorCategoria.get(fila.categoria_slug);
    if (!actual || fila.actualizado > actual) {
      ultimaActualizacionPorCategoria.set(fila.categoria_slug, fila.actualizado);
    }
  }
  const masReciente = negocios.reduce<string | undefined>(
    (max, n) => (!max || n.updated_at > max ? n.updated_at : max),
    undefined,
  );

  return [
    { url: urlAbsoluta("/"), lastModified: masReciente, changeFrequency: "daily", priority: 1 },
    { url: urlAbsoluta("/categorias"), changeFrequency: "weekly", priority: 0.6 },
    ...categorias
      .filter((c) => ultimaActualizacionPorCategoria.has(c.slug))
      .map((c) => ({
        url: urlAbsoluta(`/categoria/${c.slug}`),
        lastModified: ultimaActualizacionPorCategoria.get(c.slug),
        changeFrequency: "weekly" as const,
        priority: 0.8,
      })),
    ...resumen.map((fila) => ({
      url: urlAbsoluta(`/categoria/${fila.categoria_slug}/${fila.municipio_slug}`),
      lastModified: fila.actualizado,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    ...negocios.map((n) => ({
      url: urlAbsoluta(`/negocio/${n.slug}`),
      lastModified: n.updated_at,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  ];
}
