"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Alerta } from "@/components/ui/alerta";
import { Boton } from "@/components/ui/boton";
import { Campo, Select, Textarea } from "@/components/ui/campo";
import type { EstadoNegocio } from "@/components/ui/insignia-estado";
import { cambiarPlan, eliminarNegocioAdmin, marcarCambiosRevisados, moderarNegocio } from "@/lib/acciones/admin";

export function PanelModeracion({
  negocioId,
  nombre,
  estadoActual,
  motivoActual,
  planActual,
  planes,
  cambiosPorRevisar,
}: {
  negocioId: string;
  nombre: string;
  estadoActual: EstadoNegocio;
  motivoActual: string | null;
  planActual: string;
  planes: { code: string; nombre: string; max_imagenes: number }[];
  /** Cambios publicados que el admin aún no revisa (solo negocios aprobados). */
  cambiosPorRevisar: { campos: string; desde: string } | null;
}) {
  const router = useRouter();
  const [motivo, setMotivo] = useState(motivoActual ?? "");
  const [plan, setPlan] = useState(planActual);
  const [resultado, setResultado] = useState<{ ok: boolean; texto: string } | null>(null);
  const [errorMotivo, setErrorMotivo] = useState<string | undefined>();
  const [pendiente, iniciar] = useTransition();

  function ejecutar(accion: () => Promise<{ ok: boolean; error?: string; mensaje?: string; campos?: Record<string, string> } | undefined>) {
    setResultado(null);
    setErrorMotivo(undefined);
    iniciar(async () => {
      const r = await accion();
      if (!r) return;
      if (r.ok) {
        setResultado({ ok: true, texto: r.mensaje ?? "Listo." });
        router.refresh();
      } else {
        setErrorMotivo(r.campos?.motivo);
        setResultado({ ok: false, texto: r.error ?? "Ocurrió un error." });
      }
    });
  }

  const moderar = (estado: EstadoNegocio) => ejecutar(() => moderarNegocio(negocioId, { estado, motivo }));

  return (
    <div className="space-y-5 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-brand-dark/10">
      <h2 className="text-lg font-bold text-brand-dark">Moderación</h2>
      {resultado && <Alerta tono={resultado.ok ? "exito" : "error"}>{resultado.texto}</Alerta>}

      {cambiosPorRevisar && (
        <Alerta tono="aviso" titulo="Cambios publicados sin revisar">
          <p>
            {cambiosPorRevisar.campos} (desde el {cambiosPorRevisar.desde}). Ya se ven en el directorio; si
            algo no cumple las reglas, suspende el negocio con un motivo.
          </p>
          <Boton
            variante="secundario"
            tamano="sm"
            className="mt-3"
            disabled={pendiente}
            onClick={() => ejecutar(() => marcarCambiosRevisados(negocioId))}
          >
            Marcar como revisados
          </Boton>
        </Alerta>
      )}

      <Campo
        etiqueta="Motivo (obligatorio para rechazar o suspender)"
        htmlFor="motivo"
        error={errorMotivo}
        ayuda="El emprendedor verá este mensaje en su panel."
      >
        <Textarea
          id="motivo"
          rows={3}
          className="min-h-0"
          maxLength={500}
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          placeholder="Ej.: La descripción no corresponde al negocio. Agrega fotos reales del local."
        />
      </Campo>

      <div className="grid gap-2 sm:grid-cols-2">
        <Boton onClick={() => moderar("aprobado")} disabled={pendiente || estadoActual === "aprobado"} className="bg-emerald-700 hover:bg-emerald-800">
          Aprobar y publicar
        </Boton>
        <Boton variante="secundario" onClick={() => moderar("rechazado")} disabled={pendiente || estadoActual === "rechazado"}>
          Rechazar
        </Boton>
        <Boton variante="secundario" onClick={() => moderar("suspendido")} disabled={pendiente || estadoActual === "suspendido"}>
          Suspender
        </Boton>
        <Boton variante="fantasma" onClick={() => moderar("pendiente")} disabled={pendiente || estadoActual === "pendiente"}>
          Volver a pendiente
        </Boton>
      </div>

      <div className="space-y-2 border-t border-brand-dark/10 pt-5">
        <Campo etiqueta="Plan" htmlFor="plan">
          <div className="flex gap-2">
            <Select id="plan" value={plan} onChange={(e) => setPlan(e.target.value)}>
              {planes.map((p) => (
                <option key={p.code} value={p.code}>
                  {p.nombre} ({p.max_imagenes} fotos)
                </option>
              ))}
            </Select>
            <Boton
              variante="secundario"
              disabled={pendiente || plan === planActual}
              onClick={() => ejecutar(() => cambiarPlan(negocioId, { plan }))}
            >
              Guardar
            </Boton>
          </div>
        </Campo>
      </div>

      <div className="border-t border-brand-dark/10 pt-5">
        <Boton
          variante="peligro"
          tamano="sm"
          disabled={pendiente}
          onClick={() => {
            if (confirm(`¿Eliminar definitivamente "${nombre}" y todas sus fotos? Úsalo solo para spam.`)) {
              ejecutar(() => eliminarNegocioAdmin(negocioId));
            }
          }}
        >
          Eliminar negocio (spam)
        </Boton>
      </div>
    </div>
  );
}
