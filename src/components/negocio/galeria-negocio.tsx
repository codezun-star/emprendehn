"use client";

import { ChevronLeft, ChevronRight, X } from "lucide-react";
import Image from "next/image";
import { useRef, useState } from "react";

import { cn } from "@/lib/utils";

export type FotoGaleria = { id: string; src: string; alt: string };

/**
 * Mosaico según la cantidad de fotos. Celular (2 columnas): la primera a lo
 * ancho y el resto en pares. Escritorio (4 columnas, filas de 13rem): la
 * primera ocupa 2×2 y las demás rellenan el costado.
 */
function claseCelda(i: number, total: number): string {
  if (total === 1) return "aspect-[16/9]";
  if (total === 2) return "aspect-[4/3]";
  const ultimaSola = i > 0 && i === total - 1 && (total - 1) % 2 === 1;
  const anchaEnEscritorio = (total === 3 && i > 0) || (total === 4 && i === 3);
  return cn(
    "aspect-[4/3] @3xl:aspect-auto",
    i === 0 && "col-span-2 @3xl:row-span-2",
    ultimaSola && "col-span-2 aspect-[2/1]",
    anchaEnEscritorio ? "@3xl:col-span-2" : ultimaSola && "@3xl:col-span-1",
  );
}

/** Mosaico de fotos + visor a pantalla completa (flechas del teclado, Esc para cerrar). */
export function GaleriaNegocio({ fotos }: { fotos: FotoGaleria[] }) {
  const visor = useRef<HTMLDialogElement>(null);
  const [actual, setActual] = useState(0);
  const total = fotos.length;

  function abrir(i: number) {
    setActual(i);
    visor.current?.showModal();
  }
  const mover = (paso: number) => setActual((i) => (i + paso + total) % total);

  return (
    <>
      <ul
        className={cn(
          "grid gap-2 @xl:gap-3",
          total === 1 ? "grid-cols-1" : "grid-cols-2",
          total >= 3 && "@3xl:auto-rows-[13rem] @3xl:grid-cols-4",
        )}
      >
        {fotos.map((foto, i) => (
          <li
            key={foto.id}
            className={cn("relative overflow-hidden rounded-2xl bg-ink/5", claseCelda(i, total))}
          >
            <button
              type="button"
              onClick={() => abrir(i)}
              className="group absolute inset-0 cursor-zoom-in"
              aria-label={`Ver foto ${i + 1} de ${total}: ${foto.alt}`}
            >
              <Image
                src={foto.src}
                alt={foto.alt}
                fill
                sizes={i === 0 ? "(min-width: 1024px) 600px, 100vw" : "(min-width: 1024px) 300px, 50vw"}
                className="object-cover transition duration-500 group-hover:scale-[1.03]"
              />
            </button>
          </li>
        ))}
      </ul>

      <dialog
        ref={visor}
        aria-label="Fotos"
        className="m-0 h-dvh max-h-none w-screen max-w-none bg-ink/95 p-0 backdrop:bg-ink/80"
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") mover(1);
          if (e.key === "ArrowLeft") mover(-1);
        }}
      >
        {total > 0 && (
          <div className="relative flex h-full w-full items-center justify-center">
            <div className="relative h-[80vh] w-[92vw]">
              <Image src={fotos[actual].src} alt={fotos[actual].alt} fill sizes="92vw" className="object-contain" />
            </div>
            <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-sm text-white/80">
              {actual + 1} / {total}
            </p>
            <button
              type="button"
              onClick={() => visor.current?.close()}
              className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
              aria-label="Cerrar"
            >
              <X className="size-6" aria-hidden />
            </button>
            {total > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => mover(-1)}
                  className="absolute left-3 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
                  aria-label="Foto anterior"
                >
                  <ChevronLeft className="size-7" aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={() => mover(1)}
                  className="absolute right-3 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
                  aria-label="Foto siguiente"
                >
                  <ChevronRight className="size-7" aria-hidden />
                </button>
              </>
            )}
          </div>
        )}
      </dialog>
    </>
  );
}
