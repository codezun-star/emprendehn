import Link from "next/link";

import { JsonLd } from "@/components/seo/json-ld";
import { jsonLdMigas, type Miga } from "@/lib/seo";

/** Migas de pan visibles + BreadcrumbList en JSON-LD. */
export function Migas({ migas }: { migas: Miga[] }) {
  return (
    <>
      <nav aria-label="Ruta de navegación" className="text-sm text-ink/60">
        <ol className="flex flex-wrap items-center gap-1">
          {migas.map((m, i) => (
            <li key={m.ruta} className="flex items-center gap-1">
              {i > 0 && <span aria-hidden>›</span>}
              {i === migas.length - 1 ? (
                <span aria-current="page" className="text-ink/80">{m.nombre}</span>
              ) : (
                <Link href={m.ruta} className="text-ink/60 no-underline hover:text-brand">
                  {m.nombre}
                </Link>
              )}
            </li>
          ))}
        </ol>
      </nav>
      <JsonLd datos={jsonLdMigas(migas)} />
    </>
  );
}
