"use client";

import { useEffect } from "react";

import { Boton, BotonEnlace } from "@/components/ui/boton";

export default function ErrorPagina({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center px-4 py-20 text-center">
      <h1 className="text-2xl font-bold text-brand-dark">Algo salió mal</h1>
      <p className="mt-2 text-ink/70">Ocurrió un error inesperado. Inténtalo de nuevo en unos segundos.</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Boton onClick={reset}>Reintentar</Boton>
        <BotonEnlace href="/" variante="secundario">
          Ir al inicio
        </BotonEnlace>
      </div>
    </main>
  );
}
