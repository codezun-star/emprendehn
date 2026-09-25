"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";

import { AVISOS_URL, type AvisoUrl as Aviso } from "@/lib/avisos";

import { toast } from "./toast";

/**
 * Muestra como toast el `?aviso=` que deja una redirección del servidor y lo
 * quita de la URL (sin recargar), para que no se repita al actualizar la página
 * ni quede al compartir el enlace. Va en el layout raíz dentro de <Suspense>.
 */
export function AvisoUrl() {
  const parametros = useSearchParams();
  const clave = parametros.get("aviso");
  const mostrado = useRef<string | null>(null);

  useEffect(() => {
    if (!clave || mostrado.current === clave) return;
    const aviso: Aviso | undefined = AVISOS_URL[clave as keyof typeof AVISOS_URL];
    if (!aviso) return;
    mostrado.current = clave;
    toast[aviso.tipo](aviso.titulo, { descripcion: aviso.descripcion });

    const url = new URL(window.location.href);
    url.searchParams.delete("aviso");
    // Next integra history.replaceState con su router: no vuelve a pedir la página.
    window.history.replaceState(null, "", url.pathname + url.search + url.hash);
  }, [clave]);

  return null;
}
