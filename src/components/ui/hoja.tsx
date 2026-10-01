"use client";

import { X } from "lucide-react";
import { useEffect, useId, useRef, useState, type PointerEvent, type ReactNode } from "react";

/**
 * Hoja que sube desde abajo, como los menús de las apps del celular. Es un
 * <dialog> modal: el foco queda adentro, Escape la cierra y lo de atrás no se
 * puede tocar. También se cierra tocando afuera, arrastrándola hacia abajo o al
 * elegir un enlace. Animación en globals.css (dialog[data-hoja]).
 */
export function Hoja({
  abierta,
  alCerrar,
  titulo,
  children,
}: {
  abierta: boolean;
  alCerrar: () => void;
  titulo: string;
  children: ReactNode;
}) {
  const dialogo = useRef<HTMLDialogElement>(null);
  const idTitulo = useId();
  const [arrastre, setArrastre] = useState<number | null>(null);
  const inicioArrastre = useRef(0);

  useEffect(() => {
    const d = dialogo.current;
    if (!d) return;
    if (abierta && !d.open) d.showModal();
    else if (!abierta && d.open) d.close();
  }, [abierta]);

  function alPresionar(e: PointerEvent<HTMLDivElement>) {
    if ((e.target as HTMLElement).closest("button")) return;
    inicioArrastre.current = e.clientY;
    setArrastre(0);
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // El dedo ya se levantó: el arrastre sigue funcionando sin captura.
    }
  }
  function alMover(e: PointerEvent<HTMLDivElement>) {
    if (arrastre !== null) setArrastre(Math.max(0, e.clientY - inicioArrastre.current));
  }
  function alSoltar() {
    if (arrastre === null) return;
    // Sin el estilo del arrastre, la hoja sigue sola: hacia abajo (cerrar) o de vuelta a su lugar.
    if (arrastre > 80) alCerrar();
    setArrastre(null);
  }

  return (
    <dialog
      ref={dialogo}
      data-hoja
      aria-labelledby={idTitulo}
      onClose={alCerrar}
      onClick={(e) => {
        // Afuera de la hoja (el fondo oscuro) o en un enlace: se cierra.
        if (e.target === e.currentTarget || (e.target as HTMLElement).closest("a")) alCerrar();
      }}
      style={arrastre ? { translate: `0 ${arrastre}px`, transition: "none" } : undefined}
      className="inset-x-0 top-auto bottom-0 mx-auto max-h-[88dvh] w-full max-w-lg overflow-hidden rounded-t-3xl bg-white p-0 text-ink shadow-2xl"
    >
      <div className="flex max-h-[88dvh] flex-col">
        <div
          onPointerDown={alPresionar}
          onPointerMove={alMover}
          onPointerUp={alSoltar}
          onPointerCancel={alSoltar}
          className="shrink-0 touch-none px-5 pt-2.5 pb-2"
        >
          <span aria-hidden className="mx-auto block h-1.5 w-10 rounded-full bg-ink/15" />
          <div className="mt-2 flex items-center justify-between gap-3">
            <h2 id={idTitulo} className="text-lg font-bold text-brand-dark">
              {titulo}
            </h2>
            <button
              type="button"
              onClick={alCerrar}
              aria-label="Cerrar"
              className="-mr-2 grid size-10 place-items-center rounded-full text-ink/60 hover:bg-brand-light hover:text-ink"
            >
              <X className="size-5" aria-hidden />
            </button>
          </div>
        </div>
        <div className="overflow-y-auto overscroll-contain px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          {children}
        </div>
      </div>
    </dialog>
  );
}
