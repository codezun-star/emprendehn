import type { Metadata } from "next";

import { ListadoCategoria } from "@/components/directorio/listado-categoria";
import { cargarPaginaCategoria, metadataCategoria } from "@/lib/consultas/categoria";

export const revalidate = 3600;

export async function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: PageProps<"/categoria/[categoria]/[ciudad]">): Promise<Metadata> {
  const { categoria, ciudad } = await params;
  return metadataCategoria(categoria, ciudad);
}

export default async function PaginaCategoriaCiudad({ params }: PageProps<"/categoria/[categoria]/[ciudad]">) {
  const { categoria, ciudad } = await params;
  return <ListadoCategoria {...await cargarPaginaCategoria(categoria, ciudad)} />;
}
