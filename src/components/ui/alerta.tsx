import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

const tonos = {
  info: "border-brand/30 bg-brand/5 text-brand-dark",
  exito: "border-emerald-600/30 bg-emerald-50 text-emerald-900",
  aviso: "border-amber-500/40 bg-amber-50 text-amber-900",
  error: "border-red-600/30 bg-red-50 text-red-900",
} as const;

export function Alerta({
  tono = "info",
  titulo,
  children,
  className,
}: {
  tono?: keyof typeof tonos;
  titulo?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div
      role={tono === "error" ? "alert" : "status"}
      className={cn("rounded-lg border px-4 py-3 text-sm", tonos[tono], className)}
    >
      {titulo && <p className="font-semibold">{titulo}</p>}
      {children && <div className={titulo ? "mt-1" : undefined}>{children}</div>}
    </div>
  );
}
