import type { Enums } from "@/types/database.types";

import { cn } from "@/lib/utils";

export type EstadoNegocio = Enums<"business_status">;

export const ETIQUETAS_ESTADO: Record<EstadoNegocio, string> = {
  pendiente: "En revisión",
  aprobado: "Publicado",
  rechazado: "Rechazado",
  suspendido: "Suspendido",
};

const tonos: Record<EstadoNegocio, string> = {
  pendiente: "bg-amber-100 text-amber-900",
  aprobado: "bg-emerald-100 text-emerald-900",
  rechazado: "bg-red-100 text-red-900",
  suspendido: "bg-slate-200 text-slate-800",
};

export function InsigniaEstado({ estado, className }: { estado: EstadoNegocio; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
        tonos[estado],
        className,
      )}
    >
      {ETIQUETAS_ESTADO[estado]}
    </span>
  );
}

export function InsigniaPlan({ plan }: { plan: string }) {
  if (plan === "gratis") return null;
  return (
    <span className="inline-flex items-center rounded-full bg-accent px-2.5 py-0.5 text-xs font-semibold capitalize text-ink">
      {plan === "basico" ? "Básico" : plan}
    </span>
  );
}
