"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Boton } from "@/components/ui/boton";
import { resolverReporte } from "@/lib/acciones/admin";

export function BotonResolverReporte({ reporteId, resuelto }: { reporteId: string; resuelto: boolean }) {
  const router = useRouter();
  const [pendiente, iniciar] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="space-y-1">
      <Boton
        tamano="sm"
        variante={resuelto ? "fantasma" : "secundario"}
        cargando={pendiente}
        onClick={() =>
          iniciar(async () => {
            const r = await resolverReporte(reporteId, !resuelto);
            if (r.ok) router.refresh();
            else setError(r.error);
          })
        }
      >
        {resuelto ? "Reabrir" : "Marcar como resuelto"}
      </Boton>
      {error && <p className="text-xs text-red-700">{error}</p>}
    </div>
  );
}
