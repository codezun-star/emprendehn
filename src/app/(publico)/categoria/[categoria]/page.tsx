import type { Metadata } from "next";

import { ListadoCategoria } from "@/components/directorio/listado-categoria";
import { cargarPaginaCategoria, metadataCategoria } from "@/lib/consultas/categoria";

// ISR: páginas generadas en la primera visita y cacheadas; se revalidan cada
// hora y on-demand cuando un negocio de la categoría cambia.
export const revalidate = 3600;

export async function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: PageProps<"/categoria/[categoria]">): Promise<Metadata> {
  const { categoria } = await params;
  return metadataCategoria(categoria);
}

export default async function PaginaCategoria({ params }: PageProps<"/categoria/[categoria]">) {
  const { categoria } = await params;
  return <ListadoCategoria {...await cargarPaginaCategoria(categoria)} />;
}
