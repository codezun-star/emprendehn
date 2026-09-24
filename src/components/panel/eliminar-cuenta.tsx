"use client";

import { useState, useTransition } from "react";

import { Alerta } from "@/components/ui/alerta";
import { Boton } from "@/components/ui/boton";
import { Campo, Input } from "@/components/ui/campo";
import { eliminarMiCuenta } from "@/lib/acciones/cuenta";

export function EliminarCuenta({ totalNegocios }: { totalNegocios: number }) {
  const [confirmacion, setConfirmacion] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pendiente, iniciar] = useTransition();
  const confirmado = confirmacion.trim().toUpperCase() === "ELIMINAR";

  return (
    <section className="space-y-4 rounded-2xl border border-red-200 bg-white p-5 sm:p-6">
      <div>
        <h2 className="text-lg font-bold text-red-800">Eliminar mi cuenta</h2>
        <p className="mt-1 text-sm text-ink/70">Se borrarán de forma permanente:</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-ink/70">
          <li>Tu cuenta y tus datos de acceso.</li>
          <li>
            {totalNegocios === 0
              ? "Tus negocios (no tienes ninguno registrado)."
              : `Tus ${totalNegocios === 1 ? "negocio" : `${totalNegocios} negocios`}, con sus páginas públicas y todas sus fotos.`}
          </li>
          <li>Las reseñas que hayas escrito.</li>
        </ul>
        <p className="mt-2 text-sm font-semibold text-ink/80">Esta acción no se puede deshacer.</p>
      </div>
      {error && <Alerta tono="error">{error}</Alerta>}
      <Campo etiqueta={<>Para confirmar, escribe <strong>ELIMINAR</strong></>} htmlFor="confirmar-eliminar">
        <Input
          id="confirmar-eliminar"
          value={confirmacion}
          onChange={(e) => setConfirmacion(e.target.value)}
          autoComplete="off"
          className="max-w-xs"
        />
      </Campo>
      <Boton
        variante="peligro"
        disabled={!confirmado}
        cargando={pendiente}
        onClick={() =>
          iniciar(async () => {
            const resultado = await eliminarMiCuenta(confirmacion);
            if (resultado && !resultado.ok) setError(resultado.error);
          })
        }
      >
        Eliminar mi cuenta definitivamente
      </Boton>
    </section>
  );
}
