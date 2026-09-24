import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Buscador } from "@/components/directorio/buscador";
import { FiltroAbierto } from "@/components/directorio/filtro-abierto";
import { RejillaNegocios } from "@/components/directorio/tarjeta-negocio";
import { BotonEnlace } from "@/components/ui/boton";
import { RESULTADOS_POR_PAGINA } from "@/lib/constantes";
import {
  buscarNegocios,
  obtenerCategorias,
  obtenerMunicipios,
  obtenerOpcionesBuscador,
} from "@/lib/consultas/directorio";

// Página dinámica (depende de la búsqueda). No se indexa: los resultados de
// búsqueda interna son contenido duplicado para Google; las páginas
// indexables son las de categoría y categoría + ciudad.
export const metadata: Metadata = {
  title: "Buscar negocios",
  robots: { index: false, follow: true },
};

function texto(valor: string | string[] | undefined): string {
  return (Array.isArray(valor) ? valor[0] : valor)?.trim().slice(0, 100) ?? "";
}

export default async function PaginaBuscar({ searchParams }: PageProps<"/buscar">) {
  const sp = await searchParams;
  const q = texto(sp.q);
  const pagina = Math.max(1, Math.min(100, Number.parseInt(texto(sp.pagina), 10) || 1));
  const abierto = texto(sp.abierto) === "1";

  const [{ porSlug: categorias }, { porSlug: municipios }, opciones] = await Promise.all([
    obtenerCategorias(),
    obtenerMunicipios(),
    obtenerOpcionesBuscador(),
  ]);
  const categoria = categorias.get(texto(sp.categoria));
  const ciudad = municipios.get(texto(sp.ciudad));

  // Sin texto ni filtro: la página canónica es la de categoría (o categoría + ciudad).
  if (!q && !abierto && categoria && pagina === 1) {
    redirect(`/categoria/${categoria.slug}${ciudad ? `/${ciudad.slug}` : ""}`);
  }

  const { negocios, total } = await buscarNegocios({
    texto: q,
    categoria: categoria?.slug,
    ciudad: ciudad?.slug,
    abierto,
    limite: RESULTADOS_POR_PAGINA,
    desplazamiento: (pagina - 1) * RESULTADOS_POR_PAGINA,
  });
  const totalPaginas = Math.ceil(Number(total) / RESULTADOS_POR_PAGINA);

  const enlace = (n: number, conAbierto = abierto) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (categoria) params.set("categoria", categoria.slug);
    if (ciudad) params.set("ciudad", ciudad.slug);
    if (conAbierto) params.set("abierto", "1");
    if (n > 1) params.set("pagina", String(n));
    return `/buscar?${params.toString()}`;
  };
  const enlacePagina = (n: number) => enlace(n);

  const descripcionBusqueda = [
    q && `“${q}”`,
    categoria && categoria.nombre,
    ciudad && `en ${ciudad.nombre}`,
    abierto && "abiertos ahora",
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <div className="rounded-2xl bg-brand-dark p-3">
        <Buscador
          categorias={opciones.categorias}
          ciudades={opciones.ciudades}
          valores={{ q, categoria: categoria?.slug, ciudad: ciudad?.slug, abierto }}
          compacto
        />
      </div>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-brand-dark">
            {descripcionBusqueda ? `Resultados: ${descripcionBusqueda}` : "Todos los negocios"}
          </h1>
          <p className="text-sm text-ink/60">
            {Number(total) === 1 ? "1 negocio encontrado" : `${total} negocios encontrados`}
          </p>
        </div>
        <FiltroAbierto href={enlace(1, !abierto)} activo={abierto} />
      </div>

      {negocios.length > 0 ? (
        <RejillaNegocios negocios={negocios} />
      ) : (
        <div className="rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-brand-dark/10">
          <h2 className="text-lg font-bold text-brand-dark">No encontramos negocios con esa búsqueda</h2>
          <p className="mt-2 text-sm text-ink/70">
            {abierto ? "Puede que a esta hora estén cerrados. " : ""}Prueba con otras palabras, quita filtros o{" "}
            <Link href="/categorias">explora las categorías</Link>.
          </p>
        </div>
      )}

      {totalPaginas > 1 && (
        <nav aria-label="Paginación" className="flex items-center justify-center gap-3">
          {pagina > 1 && (
            <BotonEnlace href={enlacePagina(pagina - 1)} variante="secundario" rel="prev">
              ← Anterior
            </BotonEnlace>
          )}
          <span className="text-sm text-ink/60">
            Página {pagina} de {totalPaginas}
          </span>
          {pagina < totalPaginas && (
            <BotonEnlace href={enlacePagina(pagina + 1)} variante="secundario" rel="next">
              Siguiente →
            </BotonEnlace>
          )}
        </nav>
      )}
    </div>
  );
}
