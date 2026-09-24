import type { Metadata } from "next";

import { ListadoCategoria } from "@/components/directorio/listado-categoria";
import { cargarPaginaCategoria, metadataCategoria, paginaDeRuta } from "@/lib/consultas/categoria";

// /categoria/{c}/pagina/{n}: páginas 2, 3… del listado, también estáticas (ISR).
export const revalidate = 3600;

export async function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: PageProps<"/categoria/[categoria]/pagina/[pagina]">): Promise<Metadata> {
  const { categoria, pagina } = await params;
  return metadataCategoria(categoria, undefined, paginaDeRuta(pagina, categoria));
}

export default async function PaginaCategoriaPaginada({ params }: PageProps<"/categoria/[categoria]/pagina/[pagina]">) {
  const { categoria, pagina } = await params;
  return <ListadoCategoria {...await cargarPaginaCategoria(categoria, undefined, paginaDeRuta(pagina, categoria))} />;
}
