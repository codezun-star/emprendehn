import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";

/** Números a mostrar: 1 … 4 5 6 … 20 (siempre la primera, la última y las vecinas). */
export function rangoPaginas(actual: number, total: number): (number | "…")[] {
  const visibles = [...new Set([1, actual - 1, actual, actual + 1, total])]
    .filter((n) => n >= 1 && n <= total)
    .sort((a, b) => a - b);
  const rango: (number | "…")[] = [];
  let anterior = 0;
  for (const n of visibles) {
    if (n - anterior === 2) rango.push(anterior + 1); // un solo hueco: mejor el número que "…"
    else if (n - anterior > 2) rango.push("…");
    rango.push(n);
    anterior = n;
  }
  return rango;
}

const base =
  "inline-flex h-10 min-w-10 items-center justify-center gap-1 rounded-lg px-3 text-sm font-semibold no-underline";

/**
 * Paginación con enlaces (funciona sin JavaScript y Google la puede seguir).
 * `enlace(n)` arma la URL de cada página; la página 1 debe ser la URL sin número.
 */
export function Paginacion({
  pagina,
  totalPaginas,
  enlace,
  className,
}: {
  pagina: number;
  totalPaginas: number;
  enlace: (n: number) => string;
  className?: string;
}) {
  if (totalPaginas <= 1) return null;
  return (
    <nav aria-label="Paginación" className={cn("flex flex-wrap items-center justify-center gap-2", className)}>
      {pagina > 1 ? (
        <Link href={enlace(pagina - 1)} rel="prev" className={cn(base, "bg-white text-brand-dark ring-1 ring-brand-dark/15 hover:bg-brand-light")}>
          <ChevronLeft className="size-4" aria-hidden />
          <span className="hidden sm:inline">Anterior</span>
          <span className="sr-only sm:hidden">Página anterior</span>
        </Link>
      ) : null}

      <ol className="flex items-center gap-1">
        {rangoPaginas(pagina, totalPaginas).map((n, i) =>
          n === "…" ? (
            <li key={`hueco-${i}`} aria-hidden className="px-1 text-ink/40">
              …
            </li>
          ) : (
            <li key={n}>
              <Link
                href={enlace(n)}
                aria-current={n === pagina ? "page" : undefined}
                aria-label={`Página ${n}`}
                className={cn(
                  base,
                  n === pagina
                    ? "bg-brand-dark text-white"
                    : "bg-white text-brand-dark ring-1 ring-brand-dark/15 hover:bg-brand-light",
                )}
              >
                {n}
              </Link>
            </li>
          ),
        )}
      </ol>

      {pagina < totalPaginas ? (
        <Link href={enlace(pagina + 1)} rel="next" className={cn(base, "bg-white text-brand-dark ring-1 ring-brand-dark/15 hover:bg-brand-light")}>
          <span className="hidden sm:inline">Siguiente</span>
          <span className="sr-only sm:hidden">Página siguiente</span>
          <ChevronRight className="size-4" aria-hidden />
        </Link>
      ) : null}
    </nav>
  );
}
