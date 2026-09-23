import type { Metadata } from "next";
import Link from "next/link";

import { Alerta } from "@/components/ui/alerta";
import { BotonEnlace } from "@/components/ui/boton";
import { ETIQUETAS_ESTADO, InsigniaEstado, InsigniaPlan } from "@/components/ui/insignia-estado";
import { requerirAdmin } from "@/lib/auth";
import { contarNegociosPorEstado, listarNegociosAdmin, POR_PAGINA_ADMIN } from "@/lib/consultas/admin";
import { obtenerCategorias, obtenerMunicipios } from "@/lib/consultas/directorio";
import { cn, formatearFecha } from "@/lib/utils";
import { ESTADOS } from "@/lib/validaciones/admin";

export const metadata: Metadata = { title: "Negocios" };

function texto(valor: string | string[] | undefined) {
  return (Array.isArray(valor) ? valor[0] : valor)?.trim() ?? "";
}

export default async function PaginaAdmin({ searchParams }: PageProps<"/admin">) {
  await requerirAdmin();
  const sp = await searchParams;
  const estado = ESTADOS.find((e) => e === texto(sp.estado)) ?? "pendiente";
  const q = texto(sp.q).slice(0, 100);
  const pagina = Math.max(1, Number.parseInt(texto(sp.pagina), 10) || 1);

  const [conteos, { negocios, total }, { porId: categorias }, { porId: municipios }] = await Promise.all([
    contarNegociosPorEstado(),
    listarNegociosAdmin({ estado, q, pagina }),
    obtenerCategorias(),
    obtenerMunicipios(),
  ]);
  const totalPaginas = Math.ceil(total / POR_PAGINA_ADMIN);
  const enlace = (params: Record<string, string | number>) =>
    `/admin?${new URLSearchParams({ estado, ...(q && { q }), ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])) })}`;

  return (
    <div className="space-y-6">
      {texto(sp.aviso) === "negocio-eliminado" && <Alerta tono="info">El negocio fue eliminado.</Alerta>}

      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-2xl font-bold text-brand-dark">Negocios</h1>
        <form className="flex gap-2" action="/admin">
          <input type="hidden" name="estado" value={estado} />
          <input
            name="q"
            defaultValue={q}
            placeholder="Buscar por nombre"
            aria-label="Buscar por nombre"
            className="rounded-lg border border-brand-dark/20 bg-white px-3 py-2 text-sm"
          />
          <button type="submit" className="rounded-lg bg-brand-dark px-4 py-2 text-sm font-semibold text-white">
            Buscar
          </button>
        </form>
      </div>

      <nav aria-label="Filtrar por estado" className="flex flex-wrap gap-2">
        {ESTADOS.map((e) => (
          <Link
            key={e}
            href={`/admin?estado=${e}`}
            aria-current={e === estado ? "page" : undefined}
            className={cn(
              "rounded-full px-4 py-2 text-sm font-semibold no-underline ring-1",
              e === estado
                ? "bg-brand-dark text-white ring-brand-dark"
                : "bg-white text-brand-dark ring-brand-dark/15 hover:ring-brand",
            )}
          >
            {ETIQUETAS_ESTADO[e]} <span className="opacity-70">({conteos[e]})</span>
          </Link>
        ))}
      </nav>

      {negocios.length === 0 ? (
        <p className="rounded-2xl bg-white p-8 text-center text-ink/60 ring-1 ring-brand-dark/10">
          No hay negocios en este estado{q && " que coincidan con la búsqueda"}.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-2xl bg-white shadow-sm ring-1 ring-brand-dark/10">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-brand-light text-left text-xs uppercase tracking-wide text-ink/60">
              <tr>
                <th className="px-4 py-3">Negocio</th>
                <th className="px-4 py-3">Categoría · Ciudad</th>
                <th className="px-4 py-3">Dueño</th>
                <th className="px-4 py-3">{estado === "pendiente" ? "Enviado" : "Actualizado"}</th>
                <th className="px-4 py-3"><span className="sr-only">Acciones</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-dark/5">
              {negocios.map((n) => (
                <tr key={n.id}>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2 font-semibold text-brand-dark">
                      {n.nombre} <InsigniaEstado estado={n.estado} /> <InsigniaPlan plan={n.plan} />
                    </div>
                    <div className="text-xs text-ink/50">/negocio/{n.slug}</div>
                  </td>
                  <td className="px-4 py-3 text-ink/70">
                    {categorias.get(n.category_id)?.nombre ?? "—"} · {municipios.get(n.municipio_id)?.nombre ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-ink/70">
                    <div>{n.dueno?.nombre_completo ?? "—"}</div>
                    <div className="text-xs text-ink/50">{n.dueno?.email}</div>
                  </td>
                  <td className="px-4 py-3 text-ink/70">
                    {formatearFecha(estado === "pendiente" ? n.created_at : n.updated_at)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <BotonEnlace href={`/admin/negocios/${n.id}`} tamano="sm" variante="secundario">
                      Revisar
                    </BotonEnlace>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPaginas > 1 && (
        <nav aria-label="Paginación" className="flex items-center justify-center gap-3 text-sm">
          {pagina > 1 && <Link href={enlace({ pagina: pagina - 1 })}>← Anterior</Link>}
          <span className="text-ink/60">Página {pagina} de {totalPaginas}</span>
          {pagina < totalPaginas && <Link href={enlace({ pagina: pagina + 1 })}>Siguiente →</Link>}
        </nav>
      )}
    </div>
  );
}
