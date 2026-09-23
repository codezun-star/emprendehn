"use client";

import { useState, useTransition } from "react";

import { Alerta } from "@/components/ui/alerta";
import { Boton } from "@/components/ui/boton";
import { eliminarNegocio } from "@/lib/acciones/negocios";

export function ZonaPeligro({ negocioId, nombre }: { negocioId: string; nombre: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pendiente, iniciar] = useTransition();

  return (
    <section className="rounded-2xl border border-red-200 bg-white p-5 sm:p-6">
      <h2 className="text-lg font-bold text-red-800">Eliminar negocio</h2>
      <p className="mt-1 text-sm text-ink/70">
        Se borrarán la página pública, los datos y todas las fotos. Esta acción no se puede deshacer.
      </p>
      {error && <Alerta tono="error" className="mt-3">{error}</Alerta>}
      <Boton
        variante="peligro"
        tamano="sm"
        className="mt-4"
        cargando={pendiente}
        onClick={() => {
          const confirmacion = prompt(`Para confirmar, escribe el nombre del negocio: ${nombre}`);
          if (confirmacion?.trim() !== nombre.trim()) return;
          iniciar(async () => {
            const resultado = await eliminarNegocio(negocioId);
            if (resultado && !resultado.ok) setError(resultado.error);
          });
        }}
      >
        Eliminar definitivamente
      </Boton>
    </section>
  );
}
