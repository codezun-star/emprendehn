import "server-only";

import { notFound } from "next/navigation";
import { cache } from "react";

import { LIMITE_LISTADO } from "@/lib/constantes";
import {
  buscarNegocios,
  obtenerCategorias,
  obtenerMunicipios,
  obtenerResumen,
} from "@/lib/consultas/directorio";

/**
 * Datos de una página de categoría (opcionalmente filtrada por ciudad).
 * Memoizado por request: lo usan generateMetadata y la página.
 */
export const cargarPaginaCategoria = cache(async (categoriaSlug: string, ciudadSlug?: string) => {
  const [{ porSlug, porId, todas }, municipios] = await Promise.all([
    obtenerCategorias(),
    obtenerMunicipios(),
  ]);

  const categoria = porSlug.get(categoriaSlug);
  if (!categoria) notFound();
  const ciudad = ciudadSlug ? municipios.porSlug.get(ciudadSlug) : undefined;
  if (ciudadSlug && !ciudad) notFound();

  const padre = categoria.parent_id ? porId.get(categoria.parent_id) : undefined;
  const hijas = todas.filter((c) => c.parent_id === categoria.id);

  const [{ negocios, total }, resumen, resumenGeneral] = await Promise.all([
    buscarNegocios({ categoria: categoria.slug, ciudad: ciudad?.slug, limite: LIMITE_LISTADO }),
    obtenerResumen(categoria.slug),
    hijas.length > 0 ? obtenerResumen() : Promise.resolve([]),
  ]);

  // Conteo por subcategoría (en la ciudad si aplica) para los chips.
  const conteoHijas = new Map<string, number>();
  for (const fila of resumenGeneral) {
    if (ciudad && fila.municipio_slug !== ciudad.slug) continue;
    conteoHijas.set(fila.categoria_slug, (conteoHijas.get(fila.categoria_slug) ?? 0) + Number(fila.total));
  }

  return { categoria, padre, hijas, ciudad, negocios, total: Number(total), resumen, conteoHijas };
});
