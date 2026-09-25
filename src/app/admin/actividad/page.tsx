import type { Metadata } from "next";
import Link from "next/link";

import { Paginacion } from "@/components/ui/paginacion";
import { requerirAdmin } from "@/lib/auth";
import { listarAuditoria, POR_PAGINA_ADMIN } from "@/lib/consultas/admin";
import { numeroDePagina, totalDePaginas } from "@/lib/utils";
import type { Json } from "@/types/database.types";

export const metadata: Metadata = { title: "Actividad" };

const TABLAS: Record<string, string> = {
  businesses: "el negocio",
  business_images: "una foto",
  business_reviews: "la reseña de",
  business_reports: "el reporte",
  categories: "la categoría",
  municipios: "la ciudad",
  plans: "el plan",
  profiles: "el rol de",
};

const ACCIONES: Record<string, string> = { crear: "creó", editar: "editó", eliminar: "eliminó" };

const fechaHora = new Intl.DateTimeFormat("es-HN", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "America/Tegucigalpa",
});

/** Valor de una columna en una línea (los largos se recortan). */
function valor(v: Json | undefined): string {
  if (v === null || v === undefined) return "—";
  const texto = typeof v === "string" ? v : JSON.stringify(v);
  return texto.length > 140 ? `${texto.slice(0, 140)}…` : texto;
}

export default async function PaginaActividad({ searchParams }: PageProps<"/admin/actividad">) {
  await requerirAdmin();
  const { pagina: paramPagina } = await searchParams;
  const pagina = numeroDePagina(paramPagina);
  const { registros, total } = await listarAuditoria(pagina);
  const enlace = (n: number) => `/admin/actividad${n > 1 ? `?pagina=${n}` : ""}`;

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-brand-dark">Actividad</h1>
        <p className="text-sm text-ink/70">
          Todo lo que se cambió desde una sesión de administrador, y cualquier cambio de rol (incluso desde el SQL
          Editor). Nadie puede editar ni borrar este registro desde la web. Si ves algo que no hiciste, cambia tu
          contraseña y cierra la sesión en todos los dispositivos.
        </p>
      </div>

      {registros.length === 0 ? (
        <p className="rounded-2xl bg-white p-8 text-center text-ink/60 ring-1 ring-brand-dark/10">
          Todavía no hay actividad registrada.
        </p>
      ) : (
        <ul className="space-y-3">
          {registros.map((r) => {
            const cambios = Object.entries((r.cambios ?? {}) as Record<string, [Json, Json]>);
            const enlaceNegocio =
              r.tabla === "businesses" && r.accion !== "eliminar" && r.registro_id ? `/admin/negocios/${r.registro_id}` : null;
            return (
              <li key={r.id} className="space-y-2 rounded-2xl bg-white p-5 text-sm shadow-sm ring-1 ring-brand-dark/10">
                <p>
                  <strong className="text-brand-dark">{r.actor_email ?? "SQL Editor (sin sesión)"}</strong>{" "}
                  {ACCIONES[r.accion] ?? r.accion} {TABLAS[r.tabla] ?? r.tabla}{" "}
                  {enlaceNegocio ? (
                    <Link href={enlaceNegocio} className="font-semibold">
                      {r.registro ?? "(sin nombre)"}
                    </Link>
                  ) : (
                    <span className="font-semibold">{r.registro ?? ""}</span>
                  )}
                </p>
                <p className="text-xs text-ink/55">{fechaHora.format(new Date(r.created_at))}</p>
                {cambios.length > 0 && (
                  <details open={r.accion === "editar"}>
                    <summary className="cursor-pointer text-xs font-semibold text-brand-dark">
                      {r.accion === "editar" ? "Cambios" : "Datos"} ({cambios.length})
                    </summary>
                    <dl className="mt-2 grid gap-x-4 gap-y-1 text-xs sm:grid-cols-[10rem_1fr]">
                      {cambios.map(([columna, [antes, despues]]) => (
                        <div key={columna} className="contents">
                          <dt className="font-mono text-ink/60">{columna}</dt>
                          <dd className="break-words">
                            {r.accion === "editar" ? (
                              <>
                                <span className="text-red-800 line-through decoration-red-800/40">{valor(antes)}</span>
                                {" → "}
                                <span className="text-emerald-800">{valor(despues)}</span>
                              </>
                            ) : (
                              valor(r.accion === "eliminar" ? antes : despues)
                            )}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </details>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <Paginacion pagina={pagina} totalPaginas={totalDePaginas(total, POR_PAGINA_ADMIN)} enlace={enlace} />
    </div>
  );
}
