import Link from "next/link";

import { cn } from "@/lib/utils";

export function Logo({ className, claro = false }: { className?: string; claro?: boolean }) {
  return (
    <Link
      href="/"
      className={cn(
        "inline-flex items-center gap-2 text-xl font-extrabold tracking-tight no-underline",
        claro ? "text-white" : "text-brand-dark",
        className,
      )}
      aria-label="EmprendeHN, ir al inicio"
    >
      <span aria-hidden className="grid size-8 place-items-center rounded-lg bg-accent text-sm font-black text-ink">
        E
      </span>
      <span>
        Emprende<span className="text-accent">HN</span>
      </span>
    </Link>
  );
}
