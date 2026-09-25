"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Boton } from "@/components/ui/boton";
import { Textarea } from "@/components/ui/campo";
import { toast } from "@/components/ui/toast";
import { reportarResena, responderResena } from "@/lib/acciones/resenas";

export function ResponderResena({
  resenaId,
  respuestaActual,
  reportada,
}: {
  resenaId: string;
  respuestaActual: string | null;
  reportada: boolean;
}) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [respuesta, setRespuesta] = useState(respuestaActual ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pendiente, iniciar] = useTransition();

  function ejecutar(accion: () => Promise<{ ok: true; mensaje?: string } | { ok: false; error: string }>, alTerminar?: () => void) {
    setError(null);
    iniciar(async () => {
      const r = await accion();
      if (!r.ok) return setError(r.error);
      toast.exito(r.mensaje ?? "Listo");
      alTerminar?.();
      router.refresh();
    });
  }

  return (
    <div className="space-y-2">
      {abierto ? (
        <div className="space-y-2">
          <label htmlFor={`respuesta-${resenaId}`} className="block text-sm font-medium text-brand-dark">
            Tu respuesta pública
          </label>
          <Textarea
            id={`respuesta-${resenaId}`}
            rows={3}
            className="min-h-0"
            maxLength={1000}
            value={respuesta}
            onChange={(e) => setRespuesta(e.target.value)}
            placeholder="Ej.: ¡Gracias por visitarnos! Nos alegra que te gustaran las baleadas."
          />
          <div className="flex flex-wrap gap-2">
            <Boton tamano="sm" cargando={pendiente} onClick={() => ejecutar(() => responderResena(resenaId, respuesta), () => setAbierto(false))}>
              {respuesta.trim() ? "Publicar respuesta" : "Quitar respuesta"}
            </Boton>
            <Boton tamano="sm" variante="fantasma" onClick={() => setAbierto(false)} disabled={pendiente}>
              Cancelar
            </Boton>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Boton tamano="sm" variante="secundario" onClick={() => setAbierto(true)}>
            {respuestaActual ? "Editar respuesta" : "Responder"}
          </Boton>
          {!reportada && (
            <Boton
              tamano="sm"
              variante="fantasma"
              disabled={pendiente}
              onClick={() => {
                if (confirm("¿Reportar esta reseña al equipo de EmprendeHN por ser falsa u ofensiva?")) {
                  ejecutar(() => reportarResena(resenaId));
                }
              }}
            >
              Reportar reseña
            </Boton>
          )}
        </div>
      )}
      {error && (
        <p role="alert" className="text-xs font-medium text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
