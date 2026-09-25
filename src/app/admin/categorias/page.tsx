import type { Metadata } from "next";
import Link from "next/link";

import { IconoCategoria } from "@/components/directorio/icono-categoria";
import { BotonEnlace } from "@/components/ui/boton";
import { requerirAdmin } from "@/lib/auth";
import { listarCategoriasAdmin } from "@/lib/consultas/admin";

export const metadata: Metadata = { title: "Categorías" };

export default async function PaginaCategoriasAdmin() {
  await requerirAdmin();
  const categorias = await listarCategoriasAdmin();
  const padres = categorias.filter((c) => c.parent_id === null);
  const hijasDe = (id: string) => categorias.filter((c) => c.parent_id === id);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-brand-dark">Categorías</h1>
          <p className="text-sm text-ink/60">
            {padres.length} principales · {categorias.length - padres.length} subcategorías
          </p>
        </div>
        <BotonEnlace href="/admin/categorias/nueva">Nueva categoría</BotonEnlace>
      </div>

      <ul className="space-y-4">
        {padres.map((p) => (
          <li key={p.id} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-brand-dark/10">
            <FilaCategoria categoria={p} principal />
            {hijasDe(p.id).length > 0 && (
              <ul className="mt-3 space-y-1 border-t border-brand-dark/5 pt-3 pl-4 sm:pl-12">
                {hijasDe(p.id).map((h) => (
                  <li key={h.id}>
                    <FilaCategoria categoria={h} />
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

function FilaCategoria({
  categoria,
  principal = false,
}: {
  categoria: Awaited<ReturnType<typeof listarCategoriasAdmin>>[number];
  principal?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 text-sm">
      {principal && (
        <span className="grid size-9 place-items-center rounded-lg bg-brand-light text-brand">
          <IconoCategoria icono={categoria.icono} className="size-4" />
        </span>
      )}
      <Link
        href={`/admin/categorias/${categoria.id}`}
        className={principal ? "font-bold text-brand-dark" : "text-brand-dark"}
      >
        {categoria.nombre}
      </Link>
      <span className="text-xs text-ink/50">/{categoria.slug}</span>
      <span className="text-xs text-ink/50">{categoria.schema_type}</span>
      {!categoria.activa && <span className="rounded bg-slate-200 px-1.5 text-xs font-semibold text-slate-700">Inactiva</span>}
      {categoria.destacada && <span className="rounded bg-accent/30 px-1.5 text-xs font-semibold text-ink">Destacada</span>}
      <span className="ml-auto text-xs text-ink/60">{categoria.totalNegocios} negocios</span>
    </div>
  );
}
