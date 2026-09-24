"use client";

import { useEffect } from "react";

import { esEvento, type Evento } from "@/lib/eventos";

function enviar(negocioId: string, evento: Evento) {
  const cuerpo = JSON.stringify({ negocioId, evento });
  // sendBeacon sobrevive a la navegación (p. ej. al abrir WhatsApp o llamar).
  if (navigator.sendBeacon?.("/api/eventos", new Blob([cuerpo], { type: "application/json" }))) return;
  fetch("/api/eventos", { method: "POST", body: cuerpo, keepalive: true, headers: { "Content-Type": "application/json" } }).catch(
    () => {},
  );
}

/**
 * Cuenta la visita (una vez por sesión del navegador) y los clics en los
 * enlaces marcados con data-evento. Solo en la página pública del negocio.
 */
export function RastreoNegocio({ negocioId }: { negocioId: string }) {
  useEffect(() => {
    const clave = `emprendehn:visita:${negocioId}`;
    try {
      if (!sessionStorage.getItem(clave)) {
        sessionStorage.setItem(clave, "1");
        enviar(negocioId, "visita");
      }
    } catch {
      enviar(negocioId, "visita");
    }

    function alHacerClic(e: MouseEvent) {
      const enlace = (e.target as Element | null)?.closest<HTMLElement>("[data-evento]");
      const evento = enlace?.dataset.evento;
      if (esEvento(evento)) enviar(negocioId, evento);
    }
    document.addEventListener("click", alHacerClic, { capture: true });
    return () => document.removeEventListener("click", alHacerClic, { capture: true });
  }, [negocioId]);

  return null;
}
