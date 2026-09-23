import type { Metadata } from "next";

import { ListadoCategoria } from "@/components/directorio/listado-categoria";
import { cargarPaginaCategoria } from "@/lib/consultas/categoria";

// ISR: páginas generadas en la primera visita y cacheadas; se revalidan cada
// hora y on-demand cuando un negocio de la categoría cambia.
export const revalidate = 3600;

export async function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: PageProps<"/categoria/[categoria]">): Promise<Metadata> {
  const { categoria: slug } = await params;
  const { categoria, total } = await cargarPaginaCategoria(slug);
  const titulo = `${categoria.nombre} en Honduras`;
  const descripcion =
    categoria.descripcion ??
    `Encuentra ${categoria.nombre.toLowerCase()} en Honduras. Fotos, horarios, ubicación y contacto directo por WhatsApp.`;
  return {
    title: titulo,
    description: descripcion,
    alternates: { canonical: `/categoria/${categoria.slug}` },
    openGraph: { title: titulo, description: descripcion, url: `/categoria/${categoria.slug}` },
    // Sin negocios la página es "contenido escaso": que Google no la indexe todavía.
    robots: total === 0 ? { index: false, follow: true } : undefined,
  };
}

export default async function PaginaCategoria({ params }: PageProps<"/categoria/[categoria]">) {
  const { categoria } = await params;
  const datos = await cargarPaginaCategoria(categoria);
  return <ListadoCategoria {...datos} />;
}
