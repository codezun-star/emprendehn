import type { Metadata } from "next";

import { ListadoCategoria } from "@/components/directorio/listado-categoria";
import { cargarPaginaCategoria } from "@/lib/consultas/categoria";

export const revalidate = 3600;

export async function generateStaticParams() {
  return [];
}

export async function generateMetadata({
  params,
}: PageProps<"/categoria/[categoria]/[ciudad]">): Promise<Metadata> {
  const { categoria: categoriaSlug, ciudad: ciudadSlug } = await params;
  const { categoria, ciudad, total } = await cargarPaginaCategoria(categoriaSlug, ciudadSlug);
  const lugar = ciudad ? `${ciudad.nombre}, ${ciudad.departamento.nombre}` : "Honduras";
  const titulo = `${categoria.nombre} en ${ciudad?.nombre ?? "Honduras"}`;
  const descripcion = `${total > 0 ? `${total} ${total === 1 ? "opción" : "opciones"} de` : "Encuentra"} ${categoria.nombre.toLowerCase()} en ${lugar}. Fotos, horarios, ubicación y contacto directo por WhatsApp.`;
  const ruta = `/categoria/${categoria.slug}/${ciudad?.slug}`;
  return {
    title: titulo,
    description: descripcion,
    alternates: { canonical: ruta },
    openGraph: { title: titulo, description: descripcion, url: ruta },
    robots: total === 0 ? { index: false, follow: true } : undefined,
  };
}

export default async function PaginaCategoriaCiudad({ params }: PageProps<"/categoria/[categoria]/[ciudad]">) {
  const { categoria, ciudad } = await params;
  const datos = await cargarPaginaCategoria(categoria, ciudad);
  return <ListadoCategoria {...datos} />;
}
