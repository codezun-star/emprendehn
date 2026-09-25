"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { Boton } from "@/components/ui/boton";
import { toast } from "@/components/ui/toast";
import { moderarResena } from "@/lib/acciones/admin";

export function AccionesResena({ resenaId, oculta, reportada }: { resenaId: string; oculta: boolean; reportada: boolean }) {
  const router = useRouter();
  const [pendiente, iniciar] = useTransition();

  const ejecutar = (accion: Parameters<typeof moderarResena>[1]) =>
    iniciar(async () => {
      const r = await moderarResena(resenaId, accion);
      if (!r.ok) return void toast.error(r.error);
      toast.exito(r.mensaje ?? "Listo");
      router.refresh();
    });

  return (
    <div className="flex flex-col items-end gap-2">
      {oculta ? (
        <Boton tamano="sm" variante="secundario" cargando={pendiente} onClick={() => ejecutar("mostrar")}>
          Volver a mostrar
        </Boton>
      ) : (
        <Boton tamano="sm" variante="peligro" cargando={pendiente} onClick={() => ejecutar("ocultar")}>
          Ocultar
        </Boton>
      )}
      {reportada && !oculta && (
        <Boton tamano="sm" variante="fantasma" disabled={pendiente} onClick={() => ejecutar("descartar-reporte")}>
          Descartar reporte
        </Boton>
      )}
    </div>
  );
}
