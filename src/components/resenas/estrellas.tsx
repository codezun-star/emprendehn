import { Star } from "lucide-react";

import { cn } from "@/lib/utils";

/** 1–5 estrellas de solo lectura (redondea al entero más cercano). */
export function Estrellas({ valor, className }: { valor: number; className?: string }) {
  const llenas = Math.round(valor);
  return (
    <span
      role="img"
      aria-label={`${valor.toLocaleString("es-HN", { maximumFractionDigits: 1 })} de 5 estrellas`}
      className={cn("inline-flex items-center gap-0.5", className)}
    >
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          aria-hidden
          className={cn("size-4", i <= llenas ? "fill-accent text-accent" : "fill-transparent text-ink/25")}
        />
      ))}
    </span>
  );
}

/** "★ 4,5 (12)" compacto para tarjetas y encabezados. */
export function ResumenCalificacion({
  promedio,
  total,
  className,
}: {
  promedio: number | null;
  total: number;
  className?: string;
}) {
  if (!promedio || total === 0) return null;
  return (
    <span className={cn("inline-flex items-center gap-1 text-sm", className)}>
      <Star aria-hidden className="size-4 fill-accent text-accent" />
      <span className="font-semibold text-ink">{promedio.toLocaleString("es-HN", { minimumFractionDigits: 1 })}</span>
      <span className="text-ink/60">
        ({total} {total === 1 ? "reseña" : "reseñas"})
      </span>
    </span>
  );
}
