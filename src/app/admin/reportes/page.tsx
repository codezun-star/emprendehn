import type { Metadata } from "next";
import Link from "next/link";

import { BotonResolverReporte } from "@/components/admin/boton-resolver-reporte";
import { InsigniaEstado } from "@/components/ui/insignia-estado";
import { requerirAdmin } from "@/lib/auth";
import { Paginacion } from "@/components/ui/paginacion";
import { contarReportesAbiertos, listarReportes, POR_PAGINA_ADMIN } from "@/lib/consultas/admin";
import { cn, formatearFecha, numeroDePagina, totalDePaginas } from "@/lib/utils";
import { ETIQUETAS_MOTIVO_REPORTE, type MotivoReporte } from "@/lib/validaciones/reportes";

export const metadata: Metadata = { title: "Reportes" };

export default async function PaginaReportes({ searchParams }: PageProps<"/admin/reportes">) {
  await requerirAdmin();
  const { estado: param, pagina: paramPagina } = await searchParams;
  const estado = param === "resuelto" ? "resuelto" : "abierto";
  const pagina = numeroDePagina(paramPagina);
  const [{ reportes, total }, abiertos] = await Promise.all([listarReportes(estado, pagina), contarReportesAbiertos()]);
  const enlace = (n: number) => `/admin/reportes?estado=${estado}${n > 1 ? `&pagina=${n}` : ""}`;

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-brand-dark">Reportes</h1>
        <p className="text-sm text-ink/70">
          Lo que reportan los visitantes. Revisa el negocio; si no cumple las reglas, suspéndelo con un
          motivo desde su página de revisión y luego marca el reporte como resuelto.
        </p>
      </div>

      <nav aria-label="Filtrar reportes" className="flex gap-2">
        {(["abierto", "resuelto"] as const).map((e) => (
          <Link
            key={e}
            href={`/admin/reportes?estado=${e}`}
            aria-current={e === estado ? "page" : undefined}
            className={cn(
              "rounded-full px-4 py-2 text-sm font-semibold no-underline ring-1",
              e === estado
                ? "bg-brand-dark text-white ring-brand-dark"
                : "bg-white text-brand-dark ring-brand-dark/15 hover:ring-brand",
            )}
          >
            {e === "abierto" ? `Abiertos (${abiertos})` : "Resueltos"}
          </Link>
        ))}
      </nav>

      {reportes.length === 0 ? (
        <p className="rounded-2xl bg-white p-8 text-center text-ink/60 ring-1 ring-brand-dark/10">
          {estado === "abierto" ? "No hay reportes abiertos." : "Todavía no hay reportes resueltos."}
        </p>
      ) : (
        <ul className="space-y-3">
          {reportes.map((r) => (
            <li key={r.id} className="flex flex-wrap items-start justify-between gap-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-brand-dark/10">
              <div className="min-w-0 flex-1 space-y-1.5">
                {r.negocio ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <Link href={`/admin/negocios/${r.negocio.id}`} className="font-bold">
                      {r.negocio.nombre}
                    </Link>
                    <InsigniaEstado estado={r.negocio.estado} />
                  </div>
                ) : (
                  <p className="font-bold text-ink/60">Negocio eliminado</p>
                )}
                <p className="text-sm font-semibold text-red-800">
                  {ETIQUETAS_MOTIVO_REPORTE[r.motivo as MotivoReporte] ?? r.motivo}
                </p>
                {r.detalle && <p className="whitespace-pre-line text-sm text-ink/80">{r.detalle}</p>}
                <p className="text-xs text-ink/55">
                  {formatearFecha(r.created_at)}
                  {r.contacto && (
                    <>
                      {" · "}
                      <a href={`mailto:${r.contacto}`}>{r.contacto}</a>
                    </>
                  )}
                  {r.resuelto_en && ` · Resuelto el ${formatearFecha(r.resuelto_en)}`}
                </p>
              </div>
              <BotonResolverReporte reporteId={r.id} resuelto={r.estado === "resuelto"} />
            </li>
          ))}
        </ul>
      )}

      <Paginacion pagina={pagina} totalPaginas={totalDePaginas(total, POR_PAGINA_ADMIN)} enlace={enlace} />
    </div>
  );
}
