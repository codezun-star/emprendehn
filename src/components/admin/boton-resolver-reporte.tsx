"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { Boton } from "@/components/ui/boton";
import { toast } from "@/components/ui/toast";
import { resolverReporte } from "@/lib/acciones/admin";

export function BotonResolverReporte({ reporteId, resuelto }: { reporteId: string; resuelto: boolean }) {
  const router = useRouter();
  const [pendiente, iniciar] = useTransition();

  return (
    <Boton
      tamano="sm"
      variante={resuelto ? "fantasma" : "secundario"}
      cargando={pendiente}
      onClick={() =>
        iniciar(async () => {
          const r = await resolverReporte(reporteId, !resuelto);
          if (!r.ok) return void toast.error(r.error);
          toast.exito(r.mensaje ?? "Listo");
          router.refresh();
        })
      }
    >
      {resuelto ? "Reabrir" : "Marcar como resuelto"}
    </Boton>
  );
}
