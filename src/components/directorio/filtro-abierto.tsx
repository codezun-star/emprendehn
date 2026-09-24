import { Clock } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";

/** Chip "Abierto ahora": un enlace (funciona sin JavaScript) que activa o quita el filtro. */
export function FiltroAbierto({ href, activo }: { href: string; activo: boolean }) {
  return (
    <Link
      href={href}
      aria-pressed={activo}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-semibold no-underline ring-1",
        activo
          ? "bg-emerald-700 text-white ring-emerald-700 hover:bg-emerald-800"
          : "bg-white text-brand-dark ring-brand-dark/15 hover:ring-brand",
      )}
    >
      <Clock className="size-4" aria-hidden />
      Abierto ahora
      {activo && <span aria-hidden>✕</span>}
    </Link>
  );
}
