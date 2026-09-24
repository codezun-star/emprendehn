import type { ResenaPublica } from "@/lib/consultas/directorio";
import { formatearFecha } from "@/lib/utils";

import { Estrellas } from "./estrellas";

/** Una reseña publicada (sin hooks: la usan la lista del servidor y "Ver más" en el navegador). */
export function ItemResena({ resena: r }: { resena: ResenaPublica }) {
  return (
    <li className="space-y-1.5 py-4 first:pt-0 last:pb-0">
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
  );
}
