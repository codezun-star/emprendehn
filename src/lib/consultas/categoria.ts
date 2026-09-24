import "server-only";

import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { cache } from "react";

import { RESULTADOS_POR_PAGINA } from "@/lib/constantes";
import {
  buscarNegocios,
  obtenerCategorias,
  obtenerMunicipios,
  obtenerResumen,
} from "@/lib/consultas/directorio";
import { totalDePaginas } from "@/lib/utils";

/**
 * URL de un listado: /categoria/{c}[/{ciudad}][/pagina/{n}]. La página 1 no
 * lleva número (una sola URL canónica). La paginación va en la ruta, no en
 * ?pagina=, para que las páginas sigan siendo estáticas (ISR).
 */
export function rutaCategoria(categoriaSlug: string, ciudadSlug?: string, pagina = 1): string {
  return `/categoria/${categoriaSlug}${ciudadSlug ? `/${ciudadSlug}` : ""}${pagina > 1 ? `/pagina/${pagina}` : ""}`;
}

/** Valida el segmento [pagina]: /pagina/1 redirige a la URL sin número; lo que no sea 2, 3… es 404. */
export function paginaDeRuta(segmento: string, categoriaSlug: string, ciudadSlug?: string): number {
  if (!/^\d{1,4}$/.test(segmento)) notFound();
  const n = Number(segmento);
  if (n === 1) permanentRedirect(rutaCategoria(categoriaSlug, ciudadSlug));
  if (n < 1) notFound();
  return n;
}

/**
 * Datos de una página de categoría (opcionalmente filtrada por ciudad).
 * Memoizado por request: lo usan generateMetadata y la página.
 */
export const cargarPaginaCategoria = cache(async (categoriaSlug: string, ciudadSlug?: string, pagina = 1) => {
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
    buscarNegocios({
      categoria: categoria.slug,
      ciudad: ciudad?.slug,
      limite: RESULTADOS_POR_PAGINA,
      desplazamiento: (pagina - 1) * RESULTADOS_POR_PAGINA,
    }),
    obtenerResumen(categoria.slug),
    hijas.length > 0 ? obtenerResumen() : Promise.resolve([]),
  ]);
  // Una página más allá de la última (p. ej. se publicaron menos negocios): 404.
  if (pagina > 1 && negocios.length === 0) notFound();

  // Conteo por subcategoría (en la ciudad si aplica) para los chips.
  const conteoHijas = new Map<string, number>();
  for (const fila of resumenGeneral) {
    if (ciudad && fila.municipio_slug !== ciudad.slug) continue;
    conteoHijas.set(fila.categoria_slug, (conteoHijas.get(fila.categoria_slug) ?? 0) + Number(fila.total));
  }

  return {
    categoria,
    padre,
    hijas,
    ciudad,
    negocios,
    total: Number(total),
    pagina,
    totalPaginas: totalDePaginas(Number(total), RESULTADOS_POR_PAGINA),
    resumen,
    conteoHijas,
  };
});

/** Metadata de /categoria/… (con o sin ciudad, cualquier página). */
export async function metadataCategoria(categoriaSlug: string, ciudadSlug?: string, pagina = 1): Promise<Metadata> {
  const { categoria, ciudad, total, totalPaginas } = await cargarPaginaCategoria(categoriaSlug, ciudadSlug, pagina);
  const sufijo = pagina > 1 ? ` · Página ${pagina} de ${totalPaginas}` : "";
  const titulo = `${categoria.nombre} en ${ciudad?.nombre ?? "Honduras"}${sufijo}`;
  const descripcion = ciudad
    ? `${total > 0 ? `${total} ${total === 1 ? "opción" : "opciones"} de` : "Encuentra"} ${categoria.nombre.toLowerCase()} en ${ciudad.nombre}, ${ciudad.departamento.nombre}. Fotos, horarios, ubicación y contacto directo por WhatsApp.`
    : (categoria.descripcion ??
      `Encuentra ${categoria.nombre.toLowerCase()} en Honduras. Fotos, horarios, ubicación y contacto directo por WhatsApp.`);
  const ruta = rutaCategoria(categoria.slug, ciudad?.slug, pagina);
  return {
    title: titulo,
    description: descripcion,
    // Cada página es canónica de sí misma (así Google llega a todos los negocios).
    alternates: { canonical: ruta },
    openGraph: { title: titulo, description: descripcion, url: ruta },
    // Sin negocios la página es "contenido escaso": que Google no la indexe todavía.
    robots: total === 0 ? { index: false, follow: true } : undefined,
  };
}
