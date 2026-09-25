"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

import { centrarEnFila } from "@/lib/desplazamiento";
import { cn } from "@/lib/utils";

export function PestanasNegocio({ negocioId }: { negocioId: string }) {
  const ruta = usePathname();
  const fila = useRef<HTMLElement>(null);
  const base = `/panel/negocios/${negocioId}`;
  const pestanas = [
    { href: base, etiqueta: "Datos" },
    { href: `${base}/galeria`, etiqueta: "Logo y fotos" },
    { href: `${base}/vista-previa`, etiqueta: "Vista previa" },
    { href: `${base}/estadisticas`, etiqueta: "Estadísticas" },
    { href: `${base}/resenas`, etiqueta: "Reseñas" },
  ];

  // En el celular no caben todas: la pestaña activa queda a la vista, centrada.
  useEffect(() => {
    centrarEnFila(fila.current?.querySelector<HTMLElement>('[aria-current="page"]') ?? null);
  }, [ruta]);

  return (
    <nav
      ref={fila}
      aria-label="Secciones del negocio"
      data-fila-desplazable
      className="flex gap-1 overflow-x-auto overscroll-x-contain border-b border-brand-dark/10 [scrollbar-width:none]"
    >
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
