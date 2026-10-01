"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

import { centrarEnFila } from "@/lib/desplazamiento";
import { cn } from "@/lib/utils";

/** Secciones de la administración; en el celular, una fila de pestañas que se desliza. */
export function NavAdmin({ reportes, resenas }: { reportes: number; resenas: number }) {
  const ruta = usePathname();
  const fila = useRef<HTMLElement>(null);
  const secciones = [
    // La lista de negocios es /admin; el detalle, /admin/negocios/[id].
    { href: "/admin", etiqueta: "Negocios", activa: ruta === "/admin" || ruta.startsWith("/admin/negocios") },
    { href: "/admin/categorias", etiqueta: "Categorías" },
    { href: "/admin/reportes", etiqueta: "Reportes", pendientes: reportes },
    { href: "/admin/resenas", etiqueta: "Reseñas", pendientes: resenas },
    { href: "/admin/actividad", etiqueta: "Actividad" },
  ];

  useEffect(() => {
    centrarEnFila(fila.current?.querySelector<HTMLElement>("[aria-current]") ?? null);
  }, [ruta]);

  return (
    <nav
      ref={fila}
      aria-label="Administración"
      data-fila-desplazable
      className="-mx-4 flex w-[calc(100%+2rem)] gap-x-6 overflow-x-auto overscroll-x-contain px-4 text-sm font-semibold [scrollbar-width:none] md:mx-0 md:w-auto md:flex-wrap md:overflow-visible md:px-0"
    >
      {secciones.map((s) => {
        const activa = s.activa ?? (ruta === s.href || ruta.startsWith(`${s.href}/`));
        return (
          <Link
            key={s.href}
            href={s.href}
            aria-current={activa ? "page" : undefined}
            className={cn(
              "flex shrink-0 items-center gap-1.5 border-b-2 py-3 whitespace-nowrap no-underline",
              activa ? "border-brand text-brand" : "border-transparent text-brand-dark hover:text-brand",
            )}
          >
            {s.etiqueta}
            {!!s.pendientes && <span className="rounded-full bg-red-600 px-1.5 text-xs text-white">{s.pendientes}</span>}
          </Link>
        );
      })}
    </nav>
  );
}
