import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { FormularioCategoria } from "@/components/admin/formulario-categoria";
import { requerirAdmin } from "@/lib/auth";
import { listarCategoriasAdmin } from "@/lib/consultas/admin";
import { TIPOS_SCHEMA } from "@/lib/validaciones/admin";

export const metadata: Metadata = { title: "Editar categoría" };

export default async function PaginaEditarCategoria({ params }: PageProps<"/admin/categorias/[id]">) {
  await requerirAdmin();
  const { id } = await params;
  const categorias = await listarCategoriasAdmin();
  const categoria = categorias.find((c) => c.id === id);
  if (!categoria) notFound();
  const tieneHijas = categorias.some((c) => c.parent_id === categoria.id);
  // Una categoría con subcategorías no puede volverse subcategoría (máximo 2 niveles).
  const padres = tieneHijas
    ? []
    : categorias.filter((c) => c.parent_id === null && c.id !== categoria.id).map((c) => ({ id: c.id, nombre: c.nombre }));
  const schemaType = (TIPOS_SCHEMA as readonly string[]).includes(categoria.schema_type)
    ? (categoria.schema_type as (typeof TIPOS_SCHEMA)[number])
    : "LocalBusiness";

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link href="/admin/categorias" className="text-sm">← Categorías</Link>
        <h1 className="mt-2 text-2xl font-bold text-brand-dark">{categoria.nombre}</h1>
        <p className="text-sm text-ink/60">{categoria.totalNegocios} negocios en esta categoría</p>
      </div>
      <FormularioCategoria
        categoriaId={categoria.id}
        padres={padres}
        totalNegocios={categoria.totalNegocios}
        valoresIniciales={{
          nombre: categoria.nombre,
          slug: categoria.slug,
          parent_id: categoria.parent_id ?? "",
          descripcion: categoria.descripcion ?? "",
          schema_type: schemaType,
          icono: categoria.icono ?? "",
          orden: String(categoria.orden),
          destacada: categoria.destacada,
          activa: categoria.activa,
        }}
      />
    </div>
  );
}
