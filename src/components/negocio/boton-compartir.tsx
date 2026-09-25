"use client";

import { Check, Share2 } from "lucide-react";
import { useState } from "react";

import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

/** Menú nativo de compartir en el celular; en la computadora, copia el enlace. */
export function BotonCompartir({ titulo, url, className }: { titulo: string; url: string; className?: string }) {
  const [copiado, setCopiado] = useState(false);

  async function compartir() {
    if (navigator.share) {
      try {
        await navigator.share({ title: titulo, url });
      } catch {
        // La persona cerró el menú.
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      toast.exito("Enlace copiado", { descripcion: "Pégalo en WhatsApp, Facebook o donde quieras compartirlo." });
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch {
      window.open(`https://wa.me/?text=${encodeURIComponent(`${titulo}: ${url}`)}`, "_blank", "noopener");
    }
  }

  return (
    <button type="button" onClick={compartir} className={cn("inline-flex items-center gap-2", className)}>
      {copiado ? <Check className="size-4" aria-hidden /> : <Share2 className="size-4" aria-hidden />}
      <span aria-live="polite">{copiado ? "¡Enlace copiado!" : "Compartir"}</span>
    </button>
  );
}
