import { MessageSquareQuote } from "lucide-react";

import type { ResenaPublica } from "@/lib/consultas/directorio";
import { formatearFecha } from "@/lib/utils";

import { EscribirResena } from "./escribir-resena";
import { Estrellas } from "./estrellas";

/** Reseñas en la página pública del negocio (id="resenas" para enlazar). */
export function SeccionResenas({
  negocioId,
  slug,
  promedio,
  total,
  resenas,
}: {
  negocioId: string;
  slug: string;
  promedio: number | null;
  total: number;
  resenas: ResenaPublica[];
}) {
  return (
    <section id="resenas" className="scroll-mt-24 space-y-5 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-brand-dark/10 @xl:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-bold text-brand-dark">
          <MessageSquareQuote className="size-5" aria-hidden /> Reseñas
        </h2>
        {promedio !== null && total > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-ink">{promedio.toLocaleString("es-HN", { minimumFractionDigits: 1 })}</span>
            <div>
              <Estrellas valor={promedio} />
              <p className="text-xs text-ink/60">
                {total} {total === 1 ? "reseña" : "reseñas"}
              </p>
            </div>
          </div>
        )}
      </div>

      <EscribirResena negocioId={negocioId} slug={slug} />

      {resenas.length === 0 ? (
        <p className="text-sm text-ink/65">Todavía no hay reseñas. ¡Cuenta tu experiencia y ayuda a otros clientes!</p>
      ) : (
        <ul className="divide-y divide-brand-dark/10">
          {resenas.map((r) => (
            <li key={r.id} className="space-y-1.5 py-4 first:pt-0 last:pb-0">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold text-ink">{r.autor_nombre}</p>
                <time dateTime={r.created_at} className="text-xs text-ink/55">
                  {formatearFecha(r.created_at)}
                </time>
              </div>
              <Estrellas valor={r.calificacion} />
              {r.comentario && <p className="whitespace-pre-line text-sm text-ink/80">{r.comentario}</p>}
              {r.respuesta && (
                <div className="mt-2 rounded-lg bg-brand-light px-4 py-3 text-sm">
                  <p className="font-semibold text-brand-dark">Respuesta del negocio</p>
                  <p className="mt-0.5 whitespace-pre-line text-ink/80">{r.respuesta}</p>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      {total > resenas.length && (
        <p className="text-xs text-ink/55">Se muestran las {resenas.length} reseñas más recientes de {total}.</p>
      )}
    </section>
  );
}
