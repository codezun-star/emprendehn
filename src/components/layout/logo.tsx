import Link from "next/link";

import { cn } from "@/lib/utils";

import { MarcaHN } from "./marca-hn";

export function Logo({ className, claro = false }: { className?: string; claro?: boolean }) {
  return (
    <Link
      href="/"
      className={cn(
        "inline-flex items-center gap-1 text-xl font-extrabold tracking-tight no-underline",
        claro ? "text-white" : "text-brand-dark",
        className,
      )}
      aria-label="EmprendeHN, ir al inicio"
    >
      {/* "Emprende" + el logo HN en lugar de las letras */}
      <span className="text-accent">Emprende</span>
      <MarcaHN className="size-8" />
    </Link>
  );
}
