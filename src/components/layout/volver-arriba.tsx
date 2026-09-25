"use client";

import { ArrowUp } from "lucide-react";
import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

/**
 * Botón "Volver arriba" que aparece solo cuando sirve: en páginas largas, después
 * de bajar un par de pantallas, al empezar a subir o al llegar al final. Se
 * acomoda sobre la barra fija de contacto de la página del negocio en el celular
 * (--espacio-inferior en globals.css).
 */
export function VolverArriba() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let anterior = window.scrollY;
    let pendiente = false;
    const revisar = () => {
      pendiente = false;
      const y = window.scrollY;
      const pantalla = window.innerHeight;
      const alFinal = y + pantalla >= document.documentElement.scrollHeight - pantalla / 2;
      const subiendo = y < anterior - 4;
      const bajando = y > anterior + 4;
      if (y < pantalla * 1.5) setVisible(false);
      else if (subiendo || alFinal) setVisible(true);
      else if (bajando) setVisible(false);
      if (subiendo || bajando) anterior = y;
    };
    const alDesplazar = () => {
      if (pendiente) return;
      pendiente = true;
      requestAnimationFrame(revisar);
    };
    window.addEventListener("scroll", alDesplazar, { passive: true });
    return () => window.removeEventListener("scroll", alDesplazar);
  }, []);

  function subir() {
    const suave = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: suave ? "smooth" : "auto" });
    // Para teclado y lectores de pantalla: el foco también vuelve al inicio.
    const inicio = document.querySelector<HTMLElement>("#contenido, #inicio, main");
    if (inicio) {
      if (!inicio.hasAttribute("tabindex")) inicio.setAttribute("tabindex", "-1");
      inicio.focus({ preventScroll: true });
    }
  }

  return (
    <button
      type="button"
      onClick={subir}
      aria-label="Volver arriba"
      title="Volver arriba"
      tabIndex={visible ? 0 : -1}
      aria-hidden={!visible}
      className={cn(
        "fixed right-4 bottom-[calc(1rem+var(--espacio-inferior,0px))] z-40 grid size-11 place-items-center rounded-full bg-white text-brand-dark shadow-lg ring-1 shadow-brand-dark/15 ring-brand-dark/10 transition duration-200 hover:bg-brand-dark hover:text-white sm:right-6 sm:bottom-[calc(1.5rem+var(--espacio-inferior,0px))]",
        visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0",
      )}
    >
      <ArrowUp className="size-5" aria-hidden />
    </button>
  );
}
