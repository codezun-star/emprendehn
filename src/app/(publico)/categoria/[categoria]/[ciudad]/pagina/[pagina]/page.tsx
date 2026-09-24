import type { Metadata } from "next";

import { ListadoCategoria } from "@/components/directorio/listado-categoria";
import { cargarPaginaCategoria, metadataCategoria, paginaDeRuta } from "@/lib/consultas/categoria";

// /categoria/{c}/{ciudad}/pagina/{n}: páginas 2, 3… del listado por ciudad (ISR).
export const revalidate = 3600;

export async function generateStaticParams() {
  return [];
}

export async function generateMetadata({
  params,
}: PageProps<"/categoria/[categoria]/[ciudad]/pagina/[pagina]">): Promise<Metadata> {
  const { categoria, ciudad, pagina } = await params;
  return metadataCategoria(categoria, ciudad, paginaDeRuta(pagina, categoria, ciudad));
}

export default async function PaginaCategoriaCiudadPaginada({
  params,
}: PageProps<"/categoria/[categoria]/[ciudad]/pagina/[pagina]">) {
  const { categoria, ciudad, pagina } = await params;
  return <ListadoCategoria {...await cargarPaginaCategoria(categoria, ciudad, paginaDeRuta(pagina, categoria, ciudad))} />;
}
