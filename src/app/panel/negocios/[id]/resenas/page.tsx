import type { Metadata } from "next";
import Link from "next/link";

import { Estrellas } from "@/components/resenas/estrellas";
import { ResponderResena } from "@/components/panel/responder-resena";
import { Alerta } from "@/components/ui/alerta";
import { requerirUsuario } from "@/lib/auth";
import { obtenerMiNegocio, obtenerResenasDeMiNegocio } from "@/lib/consultas/panel";
import { formatearFecha } from "@/lib/utils";

export const metadata: Metadata = { title: "Reseñas" };

export default async function PaginaResenas({ params }: PageProps<"/panel/negocios/[id]/resenas">) {
  const { id } = await params;
  const sesion = await requerirUsuario(`/panel/negocios/${id}/resenas`);
  const negocio = await obtenerMiNegocio(sesion.userId, id);
  const resenas = await obtenerResenasDeMiNegocio(negocio.id);
  const sinResponder = resenas.filter((r) => r.estado === "publicada" && !r.respuesta).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-brand-dark">Reseñas de tus clientes</h2>
          <p className="text-sm text-ink/65">
            Responder con amabilidad, incluso a las críticas, genera confianza en quien lee.
          </p>
        </div>
        {negocio.total_resenas > 0 && negocio.calificacion_promedio !== null && (
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold">{negocio.calificacion_promedio.toLocaleString("es-HN", { minimumFractionDigits: 1 })}</span>
            <div>
              <Estrellas valor={negocio.calificacion_promedio} />
              <p className="text-xs text-ink/60">
                {negocio.total_resenas} {negocio.total_resenas === 1 ? "publicada" : "publicadas"}
              </p>
            </div>
          </div>
        )}
      </div>

      {sinResponder > 0 && (
        <Alerta tono="aviso">
          Tienes {sinResponder} {sinResponder === 1 ? "reseña" : "reseñas"} sin responder.
        </Alerta>
      )}

      {resenas.length === 0 ? (
        <div className="rounded-2xl bg-white p-8 text-center text-sm text-ink/65 shadow-sm ring-1 ring-brand-dark/10">
          Todavía no tienes reseñas.{" "}
          {negocio.estado === "aprobado" ? (
            <>
              Pide a tus clientes que te califiquen en{" "}
              <Link href={`/negocio/${negocio.slug}#resenas`}>tu página</Link>.
            </>
          ) : (
            "Cuando tu negocio esté publicado, tus clientes podrán dejarte reseñas."
          )}
        </div>
      ) : (
        <ul className="space-y-3">
          {resenas.map((r) => (
            <li key={r.id} className="space-y-2 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-brand-dark/10">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{r.autor_nombre}</span>
                  <Estrellas valor={r.calificacion} />
                </div>
                <span className="text-xs text-ink/55">{formatearFecha(r.created_at)}</span>
              </div>
              {r.estado === "oculta" && (
                <p className="text-xs font-semibold text-ink/60">Oculta por el equipo de EmprendeHN: no se muestra en tu página.</p>
              )}
              {r.reportada && r.estado === "publicada" && (
                <p className="text-xs font-semibold text-amber-800">Reportada: el equipo de EmprendeHN la está revisando.</p>
              )}
              {r.comentario && <p className="whitespace-pre-line text-sm text-ink/80">{r.comentario}</p>}
              {r.respuesta && (
                <div className="rounded-lg bg-brand-light px-4 py-3 text-sm">
                  <p className="font-semibold text-brand-dark">Tu respuesta</p>
                  <p className="mt-0.5 whitespace-pre-line text-ink/80">{r.respuesta}</p>
                </div>
              )}
              {r.estado === "publicada" && (
                <ResponderResena resenaId={r.id} respuestaActual={r.respuesta} reportada={r.reportada} />
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
