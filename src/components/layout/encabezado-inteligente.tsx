"use client";

import { useEffect, useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Encabezado fijo que se esconde al bajar (más espacio para leer, sobre todo en
 * el celular) y vuelve apenas se sube un poco. Siempre visible arriba de todo y
 * cuando algo de adentro tiene el foco (teclado).
 */
export function EncabezadoInteligente({ children, className }: { children: ReactNode; className?: string }) {
  const [oculto, setOculto] = useState(false);

  useEffect(() => {
    let anterior = window.scrollY;
    let pendiente = false;
    const revisar = () => {
      pendiente = false;
      const y = window.scrollY;
      const delta = y - anterior;
      if (y < 96) setOculto(false);
      else if (delta > 8) setOculto(true);
      else if (delta < -8) setOculto(false);
      if (Math.abs(delta) > 8) anterior = y;
    };
    const alDesplazar = () => {
      if (pendiente) return;
      pendiente = true;
      requestAnimationFrame(revisar);
    };
    window.addEventListener("scroll", alDesplazar, { passive: true });
    return () => window.removeEventListener("scroll", alDesplazar);
  }, []);

  return (
    <header
      data-oculto={oculto || undefined}
      onFocusCapture={() => setOculto(false)}
      className={cn("transition-transform duration-300 ease-out", oculto && "-translate-y-full", className)}
    >
      {children}
    </header>
  );
}
