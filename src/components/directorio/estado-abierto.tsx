"use client";

import { useEffect, useState } from "react";

import { DIAS, type Horario } from "@/lib/horario";
import { cn } from "@/lib/utils";

const ZONA_HORARIA = "America/Tegucigalpa";

export function ahoraEnHonduras() {
  const partes = new Intl.DateTimeFormat("en-US", {
    timeZone: ZONA_HORARIA,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const valor = (tipo: string) => partes.find((p) => p.type === tipo)?.value ?? "";
  const indice = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(valor("weekday"));
  return { indiceDia: indice, hora: `${valor("hour")}:${valor("minute")}` };
}

function estaAbierto(horario: Horario): boolean {
  const { indiceDia, hora } = ahoraEnHonduras();
  if (indiceDia < 0) return false;
  const hoy = DIAS[indiceDia].clave;
  const ayer = DIAS[(indiceDia + 6) % 7].clave;

  // Turnos de hoy (incluye los que cruzan la medianoche, p. ej. 18:00–02:00).
  const abiertoHoy = horario[hoy].some((t) =>
    t.cierra > t.abre ? hora >= t.abre && hora < t.cierra : hora >= t.abre,
  );
  // Turno de ayer que continúa después de medianoche.
  const sigueDeAyer = horario[ayer].some((t) => t.cierra < t.abre && hora < t.cierra);
  return abiertoHoy || sigueDeAyer;
}

/** "Abierto ahora / Cerrado ahora" calculado en el navegador (la página es estática). */
export function EstadoAbierto({ horario, className }: { horario: Horario; className?: string }) {
  const [abierto, setAbierto] = useState<boolean | null>(null);

  useEffect(() => {
    const actualizar = () => setAbierto(estaAbierto(horario));
    actualizar();
    const intervalo = setInterval(actualizar, 60_000);
    return () => clearInterval(intervalo);
  }, [horario]);

  if (abierto === null) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold",
        abierto ? "bg-emerald-100 text-emerald-900" : "bg-slate-200 text-slate-800",
        className,
      )}
    >
      <span aria-hidden className={cn("size-2 rounded-full", abierto ? "bg-emerald-600" : "bg-slate-500")} />
      {abierto ? "Abierto ahora" : "Cerrado ahora"}
    </span>
  );
}
