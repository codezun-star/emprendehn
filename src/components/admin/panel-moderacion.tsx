"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Alerta } from "@/components/ui/alerta";
import { Boton } from "@/components/ui/boton";
import { Campo, Select, Textarea } from "@/components/ui/campo";
import { toast } from "@/components/ui/toast";
import type { EstadoNegocio } from "@/components/ui/insignia-estado";
import {
  cambiarPlan,
  cambiarSlugNegocio,
  eliminarNegocioAdmin,
  marcarCambiosRevisados,
  moderarNegocio,
} from "@/lib/acciones/admin";

export function PanelModeracion({
  negocioId,
  nombre,
  estadoActual,
  motivoActual,
  planActual,
  planes,
  cambiosPorRevisar,
  slugActual,
}: {
  negocioId: string;
  nombre: string;
  slugActual: string;
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
  const [slug, setSlug] = useState(slugActual);
  const [error, setError] = useState<string | null>(null);
  const [errorMotivo, setErrorMotivo] = useState<string | undefined>();
  const [pendiente, iniciar] = useTransition();

  function ejecutar(accion: () => Promise<{ ok: boolean; error?: string; mensaje?: string; campos?: Record<string, string> } | undefined>) {
    setError(null);
    setErrorMotivo(undefined);
    iniciar(async () => {
      const r = await accion();
      if (!r) return;
      if (r.ok) {
        // El mensaje puede traer si el correo al dueño salió: se deja más tiempo.
        toast.exito(r.mensaje ?? "Listo", { duracion: 8000 });
        router.refresh();
      } else {
        setErrorMotivo(r.campos?.motivo);
        setError(r.error ?? "Ocurrió un error.");
      }
    });
  }

  const moderar = (estado: EstadoNegocio) => ejecutar(() => moderarNegocio(negocioId, { estado, motivo }));

  return (
    <div className="space-y-5 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-brand-dark/10">
      <h2 className="text-lg font-bold text-brand-dark">Moderación</h2>
      {error && <Alerta tono="error">{error}</Alerta>}

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

      <div className="space-y-2 border-t border-brand-dark/10 pt-5">
        <Campo
          etiqueta="URL del negocio"
          htmlFor="slug"
          ayuda="Si la cambias, la URL anterior redirige a la nueva y no se pierde el posicionamiento en Google."
        >
          <div className="flex gap-2">
            <div className="flex min-w-0 flex-1 items-center rounded-lg border border-brand-dark/20 bg-white pl-3 text-sm focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/30">
              <span className="shrink-0 text-ink/50">/negocio/</span>
              <input
                id="slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase())}
                className="min-w-0 flex-1 bg-transparent py-2.5 pr-3 focus:outline-none"
                maxLength={120}
                autoComplete="off"
              />
            </div>
            <Boton
              variante="secundario"
              disabled={pendiente || slug.trim() === slugActual}
              onClick={() => ejecutar(() => cambiarSlugNegocio(negocioId, slug))}
            >
              Cambiar
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
