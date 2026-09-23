"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";

import { cn } from "@/lib/utils";

// Las páginas públicas son estáticas (no leen cookies en el servidor), así que
// el header decide "Mi panel" vs "Ingresar" en el navegador. Basta con ver si
// existe la cookie de sesión de Supabase: no cargamos supabase-js en páginas
// públicas (mejor rendimiento). Si la sesión expiró, proxy.ts lo resuelve.
function haySesion() {
  return /(^|;\s*)sb-[^=]+-auth-token(\.\d+)?=/.test(document.cookie);
}

const suscribir = () => () => {};

export function EnlaceSesion({ className }: { className?: string }) {
  const conSesion = useSyncExternalStore(suscribir, haySesion, () => false);

  return (
    <Link
      href={conSesion ? "/panel" : "/ingresar"}
      className={cn("text-sm font-semibold text-brand-dark no-underline hover:text-brand", className)}
    >
      {conSesion ? "Mi panel" : "Ingresar"}
    </Link>
  );
}
