import "server-only";

import { revalidatePath } from "next/cache";

import { obtenerCategorias, obtenerMunicipios } from "@/lib/consultas/directorio";

type RefNegocio = { slug: string; category_id: string; municipio_id: number };

/**
 * Revalidación on-demand (ISR) tras cualquier cambio que afecte al directorio:
 * la página del negocio, sus listados (categoría, categoría padre y cada una
 * con su ciudad), el inicio y el sitemap. Pasar el estado ANTERIOR y el NUEVO
 * del negocio cuando cambia de categoría o de ciudad.
 */
export async function revalidarDirectorio(...refs: Array<RefNegocio | null | undefined>) {
  const [{ porId: categorias }, { porId: municipios }] = await Promise.all([
    obtenerCategorias(),
    obtenerMunicipios(),
  ]);

  const rutas = new Set<string>(["/", "/categorias", "/sitemap.xml"]);
  for (const ref of refs) {
    if (!ref) continue;
    rutas.add(`/negocio/${ref.slug}`);

    const categoria = categorias.get(ref.category_id);
    const padre = categoria?.parent_id ? categorias.get(categoria.parent_id) : undefined;
    const ciudad = municipios.get(ref.municipio_id);

    for (const c of [categoria, padre]) {
      if (!c) continue;
      rutas.add(`/categoria/${c.slug}`);
      if (ciudad) rutas.add(`/categoria/${c.slug}/${ciudad.slug}`);
    }
  }

  for (const ruta of rutas) revalidatePath(ruta);
  // Páginas 2, 3… de los listados (/categoria/…/pagina/N): un negocio que entra
  // o sale corre a todos los siguientes, así que se revalidan todas.
  revalidatePath("/categoria/[categoria]/pagina/[pagina]", "page");
  revalidatePath("/categoria/[categoria]/[ciudad]/pagina/[pagina]", "page");
}

/** Pestañas del negocio en el panel del dueño (estado y "Cambios en revisión"). */
export function revalidarPanelNegocio(negocioId: string) {
  revalidatePath(`/panel/negocios/${negocioId}`, "layout");
  revalidatePath("/panel");
}

/** Tras cambios en categorías (admin): todo el árbol de listados. */
export function revalidarCategorias() {
  revalidatePath("/", "layout");
}
