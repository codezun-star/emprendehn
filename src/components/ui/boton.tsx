import Link from "next/link";
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

const base =
  "inline-flex items-center justify-center gap-2 rounded-lg font-semibold no-underline transition-colors disabled:cursor-not-allowed disabled:opacity-60";

const variantes = {
  primario: "bg-brand-dark text-white hover:bg-brand",
  secundario: "bg-white text-brand-dark ring-1 ring-inset ring-brand-dark/20 hover:bg-brand-light",
  // Texto ink sobre naranja: contraste 6.7:1 (el blanco no pasa WCAG AA).
  acento: "bg-accent text-ink hover:brightness-95",
  fantasma: "text-brand-dark hover:bg-brand-dark/5",
  peligro: "bg-red-700 text-white hover:bg-red-800",
} as const;

const tamanos = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2.5 text-sm",
  lg: "px-6 py-3 text-base",
} as const;

type Estilo = {
  variante?: keyof typeof variantes;
  tamano?: keyof typeof tamanos;
};

export function clasesBoton({ variante = "primario", tamano = "md" }: Estilo = {}) {
  return cn(base, variantes[variante], tamanos[tamano]);
}

export function Boton({
  variante,
  tamano,
  cargando = false,
  className,
  children,
  disabled,
  type = "button",
  ...props
}: ComponentProps<"button"> & Estilo & { cargando?: boolean }) {
  return (
    <button
      type={type}
      disabled={disabled || cargando}
      aria-busy={cargando || undefined}
      className={cn(clasesBoton({ variante, tamano }), className)}
      {...props}
    >
      {cargando && (
        <span
          aria-hidden
          className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
      )}
      {children}
    </button>
  );
}

export function BotonEnlace({
  variante,
  tamano,
  className,
  ...props
}: ComponentProps<typeof Link> & Estilo) {
  return <Link className={cn(clasesBoton({ variante, tamano }), className)} {...props} />;
}
