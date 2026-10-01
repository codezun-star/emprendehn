"use client";

import type { LucideIcon } from "lucide-react";
import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ComponentProps, type MouseEvent, type ReactNode } from "react";

import { comportamientoScroll } from "@/lib/desplazamiento";
import { cn } from "@/lib/utils";

export type Pestana = {
  href: string;
  etiqueta: string;
  icono: LucideIcon;
  /** Si la pestaña corresponde a la ruta actual (puede abarcar subpáginas). */
  activa: (ruta: string) => boolean;
};

const claseItem = (activa: boolean) =>
  cn(
    "group flex h-full w-full flex-col items-center justify-center gap-0.5 text-[0.6875rem] leading-none no-underline",
    activa ? "font-semibold text-brand-dark" : "font-medium text-ink/60",
  );

function Icono({ icono: Icono, activa, pendiente = false }: { icono: LucideIcon; activa: boolean; pendiente?: boolean }) {
  return (
    <span
      className={cn(
        "grid h-8 w-14 place-items-center rounded-full transition-[background-color,scale] duration-200 group-active:scale-90",
        activa && "bg-brand/10",
      )}
    >
      <Icono className={cn("size-[1.4rem]", pendiente && "animate-pulse")} strokeWidth={activa ? 2.25 : 1.75} aria-hidden />
    </span>
  );
}

/** Mientras llega la página tocada, el ícono late (si ya estaba precargada, ni se nota). */
function IconoEnlace(props: { icono: LucideIcon; activa: boolean }) {
  const { pending } = useLinkStatus();
  return <Icono {...props} pendiente={pending} />;
}

/**
 * Barra de pestañas fija abajo, como en las apps del celular (en la computadora no
 * se muestra: ahí manda el encabezado). La pestaña tocada se marca al instante,
 * aunque la página tarde en llegar, y tocar la pestaña de la página actual sube al
 * inicio. Se esconde mientras se escribe (el teclado ocupa ese lugar) y en las
 * pantallas que traen su propia barra abajo (data-barra-inferior): ver globals.css.
 */
export function BarraPestanas({
  etiqueta,
  pestanas,
  children,
}: {
  etiqueta: string;
  pestanas: Pestana[];
  /** Pestañas extra al final que no navegan (p. ej. el botón "Menú"). */
  children?: ReactNode;
}) {
  const ruta = usePathname();
  const [toque, setToque] = useState<{ desde: string; href: string } | null>(null);
  // Solo vale mientras no cambie la ruta: al llegar, manda la ruta nueva.
  const destino = toque?.desde === ruta ? toque.href : null;

  function alTocar(e: MouseEvent<HTMLAnchorElement>, href: string) {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (href === ruta) {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: comportamientoScroll() });
      return;
    }
    setToque({ desde: ruta, href });
  }

  return (
    <nav
      aria-label={etiqueta}
      data-barra-pestanas
      className="fixed inset-x-0 bottom-0 z-40 border-t border-brand-dark/10 bg-white/95 pr-[env(safe-area-inset-right)] pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] backdrop-blur transition-transform duration-200 select-none [-webkit-touch-callout:none] md:hidden"
    >
      <ul className="mx-auto flex h-16 max-w-lg items-stretch">
        {pestanas.map((p) => {
          const activa = destino ? destino === p.href : p.activa(ruta);
          return (
            <li key={p.href} className="flex-1">
              <Link
                href={p.href}
                aria-current={activa ? "page" : undefined}
                onClick={(e) => alTocar(e, p.href)}
                className={claseItem(activa)}
              >
                <IconoEnlace icono={p.icono} activa={activa} />
                {p.etiqueta}
              </Link>
            </li>
          );
        })}
        {children}
      </ul>
    </nav>
  );
}

/** Pestaña que no navega: abre algo (el menú) en la misma pantalla. */
export function BotonPestana({
  etiqueta,
  icono,
  activa = false,
  ...props
}: { etiqueta: string; icono: LucideIcon; activa?: boolean } & Omit<ComponentProps<"button">, "className" | "children">) {
  return (
    <li className="flex-1">
      <button type="button" className={claseItem(activa)} {...props}>
        <Icono icono={icono} activa={activa} />
        {etiqueta}
      </button>
    </li>
  );
}
