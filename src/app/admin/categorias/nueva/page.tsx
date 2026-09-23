import type { Metadata } from "next";
import Link from "next/link";

import { FormularioCategoria } from "@/components/admin/formulario-categoria";
import { requerirAdmin } from "@/lib/auth";
import { listarCategoriasAdmin } from "@/lib/consultas/admin";

export const metadata: Metadata = { title: "Nueva categoría" };

export default async function PaginaNuevaCategoria() {
  await requerirAdmin();
  const categorias = await listarCategoriasAdmin();
  const padres = categorias.filter((c) => c.parent_id === null).map((c) => ({ id: c.id, nombre: c.nombre }));

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link href="/admin/categorias" className="text-sm">← Categorías</Link>
        <h1 className="mt-2 text-2xl font-bold text-brand-dark">Nueva categoría</h1>
      </div>
      <FormularioCategoria
        padres={padres}
        valoresIniciales={{
          nombre: "",
          slug: "",
          parent_id: "",
          descripcion: "",
          schema_type: "LocalBusiness",
          icono: "",
          orden: "0",
          destacada: false,
          activa: true,
        }}
      />
    </div>
  );
}
