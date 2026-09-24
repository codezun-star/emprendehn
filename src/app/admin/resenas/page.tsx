import type { Metadata } from "next";
import Link from "next/link";

import { AccionesResena } from "@/components/admin/acciones-resena";
import { Estrellas } from "@/components/resenas/estrellas";
import { requerirAdmin } from "@/lib/auth";
import { Paginacion } from "@/components/ui/paginacion";
import { contarResenasReportadas, listarResenasAdmin, POR_PAGINA_ADMIN } from "@/lib/consultas/admin";
import { cn, formatearFecha, numeroDePagina, totalDePaginas } from "@/lib/utils";

export const metadata: Metadata = { title: "Reseñas" };

export default async function PaginaResenasAdmin({ searchParams }: PageProps<"/admin/resenas">) {
  await requerirAdmin();
  const { vista: param, pagina: paramPagina } = await searchParams;
  const reportadasTotal = await contarResenasReportadas();
  const vista = param === "recientes" || (param !== "reportadas" && reportadasTotal === 0) ? "recientes" : "reportadas";
  const pagina = numeroDePagina(paramPagina);
  const { resenas, total } = await listarResenasAdmin(vista, pagina);
  const enlace = (n: number) => `/admin/resenas?vista=${vista}${n > 1 ? `&pagina=${n}` : ""}`;

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-brand-dark">Reseñas</h1>
        <p className="text-sm text-ink/70">
          Se publican al instante. Oculta las falsas, ofensivas o que no hablan del negocio; una reseña
          negativa pero honesta debe quedarse.
        </p>
      </div>

      <nav aria-label="Filtrar reseñas" className="flex gap-2">
        {(["reportadas", "recientes"] as const).map((v) => (
          <Link
            key={v}
            href={`/admin/resenas?vista=${v}`}
            aria-current={v === vista ? "page" : undefined}
            className={cn(
              "rounded-full px-4 py-2 text-sm font-semibold no-underline ring-1",
              v === vista ? "bg-brand-dark text-white ring-brand-dark" : "bg-white text-brand-dark ring-brand-dark/15 hover:ring-brand",
            )}
          >
            {v === "reportadas" ? `Reportadas por dueños (${reportadasTotal})` : "Recientes"}
          </Link>
        ))}
      </nav>

      {resenas.length === 0 ? (
        <p className="rounded-2xl bg-white p-8 text-center text-ink/60 ring-1 ring-brand-dark/10">
          {vista === "reportadas" ? "No hay reseñas reportadas." : "Todavía no hay reseñas."}
        </p>
      ) : (
        <ul className="space-y-3">
          {resenas.map((r) => (
            <li
              key={r.id}
              className={cn(
                "flex flex-wrap items-start justify-between gap-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-brand-dark/10",
                r.estado === "oculta" && "opacity-70",
              )}
            >
              <div className="min-w-0 flex-1 space-y-1.5">
                {r.negocio && (
                  <Link href={`/admin/negocios/${r.negocio.id}`} className="text-sm font-bold">
                    {r.negocio.nombre}
                  </Link>
                )}
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-semibold">{r.autor_nombre}</span>
                  <Estrellas valor={r.calificacion} />
                  <span className="text-xs text-ink/55">{formatearFecha(r.created_at)}</span>
                  {r.estado === "oculta" && <span className="rounded-full bg-slate-200 px-2 text-xs font-semibold">Oculta</span>}
                  {r.reportada && <span className="rounded-full bg-red-100 px-2 text-xs font-semibold text-red-900">Reportada</span>}
                </div>
                {r.comentario && <p className="whitespace-pre-line text-sm text-ink/80">{r.comentario}</p>}
                {r.respuesta && (
                  <p className="border-l-2 border-brand/30 pl-3 text-sm text-ink/70">
                    <span className="font-semibold">Respuesta del negocio:</span> {r.respuesta}
                  </p>
                )}
              </div>
              <AccionesResena resenaId={r.id} oculta={r.estado === "oculta"} reportada={r.reportada} />
            </li>
          ))}
        </ul>
      )}

      <Paginacion pagina={pagina} totalPaginas={totalDePaginas(total, POR_PAGINA_ADMIN)} enlace={enlace} />
    </div>
  );
}
