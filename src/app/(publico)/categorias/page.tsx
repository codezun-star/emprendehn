import type { Metadata } from "next";
import Link from "next/link";

import { IconoCategoria } from "@/components/directorio/icono-categoria";
import { Migas } from "@/components/directorio/migas";
import { contarPorCategoria, obtenerCategorias } from "@/lib/consultas/directorio";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Todas las categorías de negocios en Honduras",
  description:
    "Explora todas las categorías del directorio de emprendedores de Honduras: comida, belleza, servicios para el hogar, tiendas, salud y más.",
  alternates: { canonical: "/categorias" },
};

export default async function PaginaCategorias() {
  const [{ arbol }, conteo] = await Promise.all([obtenerCategorias(), contarPorCategoria()]);

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <Migas migas={[{ nombre: "Inicio", ruta: "/" }, { nombre: "Categorías", ruta: "/categorias" }]} />
      <h1 className="text-3xl font-extrabold text-brand-dark">Categorías</h1>
      <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {arbol.map((padre) => (
          <li key={padre.id} className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-brand-dark/10">
            <Link href={`/categoria/${padre.slug}`} className="flex items-center gap-3 no-underline">
              <span className="grid size-10 place-items-center rounded-xl bg-brand-light text-brand">
                <IconoCategoria icono={padre.icono} className="size-5" />
              </span>
              <span className="text-lg font-bold text-brand-dark">{padre.nombre}</span>
              {conteo.get(padre.slug) ? (
                <span className="ml-auto text-sm text-ink/50">{conteo.get(padre.slug)}</span>
              ) : null}
            </Link>
            {padre.hijas.length > 0 && (
              <ul className="mt-3 space-y-1.5 border-t border-brand-dark/5 pt-3 text-sm">
                {padre.hijas.map((h) => (
                  <li key={h.id} className="flex justify-between gap-2">
                    <Link href={`/categoria/${h.slug}`}>{h.nombre}</Link>
                    {conteo.get(h.slug) ? <span className="text-ink/50">{conteo.get(h.slug)}</span> : null}
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
