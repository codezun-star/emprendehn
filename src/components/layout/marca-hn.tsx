import { franjasMarca, TRAZOS_MARCA } from "@/lib/marca";
import { cn } from "@/lib/utils";

const [ARRIBA, ABAJO] = franjasMarca(14);

/** Logo "HN" en la bandera de Honduras. Decorativo: el nombre va en el texto al lado. */
export function MarcaHN({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden className={cn("shrink-0", className)}>
      <rect width="64" height="64" rx="14" className="fill-white" />
      <path d={ARRIBA} className="fill-bandera" />
      <path d={ABAJO} className="fill-bandera" />
      <path d={TRAZOS_MARCA.h} className="fill-bandera" />
      <rect {...TRAZOS_MARCA.recuadroN} className="fill-bandera" />
      <path d={TRAZOS_MARCA.n} className="fill-white" />
    </svg>
  );
}
