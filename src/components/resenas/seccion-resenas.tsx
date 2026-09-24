import { MessageSquareQuote } from "lucide-react";

import type { ResenaPublica } from "@/lib/consultas/directorio";
import { EscribirResena } from "./escribir-resena";
import { Estrellas } from "./estrellas";
import { ItemResena } from "./item-resena";
import { MasResenas } from "./mas-resenas";

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
            <ItemResena key={r.id} resena={r} />
          ))}
        </ul>
      )}
      {total > resenas.length && <MasResenas negocioId={negocioId} cargadas={resenas.length} total={total} />}
    </section>
  );
}
