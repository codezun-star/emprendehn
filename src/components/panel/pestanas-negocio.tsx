"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

export function PestanasNegocio({ negocioId }: { negocioId: string }) {
  const ruta = usePathname();
  const base = `/panel/negocios/${negocioId}`;
  const pestanas = [
    { href: base, etiqueta: "Datos" },
    { href: `${base}/galeria`, etiqueta: "Logo y fotos" },
    { href: `${base}/vista-previa`, etiqueta: "Vista previa" },
    { href: `${base}/estadisticas`, etiqueta: "Estadísticas" },
  ];
  return (
    <nav aria-label="Secciones del negocio" className="flex gap-1 overflow-x-auto border-b border-brand-dark/10">
      {pestanas.map((p) => {
        const activa = ruta === p.href;
        return (
          <Link
            key={p.href}
            href={p.href}
            aria-current={activa ? "page" : undefined}
            className={cn(
              "-mb-px whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-semibold no-underline",
              activa ? "border-brand text-brand" : "border-transparent text-ink/60 hover:text-brand-dark",
            )}
          >
            {p.etiqueta}
          </Link>
        );
      })}
    </nav>
  );
}
