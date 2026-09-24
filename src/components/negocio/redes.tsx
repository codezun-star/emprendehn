import { Globe } from "lucide-react";
import type { ReactNode } from "react";

import type { Json } from "@/types/database.types";

export const NOMBRES_REDES = {
  facebook: "Facebook",
  instagram: "Instagram",
  tiktok: "TikTok",
  sitio_web: "Sitio web",
} as const;

export type Red = keyof typeof NOMBRES_REDES;

export function redesDe(redes: Json): [Red, string][] {
  if (!redes || typeof redes !== "object" || Array.isArray(redes)) return [];
  return Object.entries(redes).filter(
    (par): par is [Red, string] => typeof par[1] === "string" && par[0] in NOMBRES_REDES,
  );
}

// Lucide ya no trae logos de marcas: trazos simples con el mismo estilo.
function Trazo({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
    >
      {children}
    </svg>
  );
}

export function IconoRed({ red, className }: { red: Red; className?: string }) {
  switch (red) {
    case "facebook":
      return (
        <Trazo className={className}>
          <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
        </Trazo>
      );
    case "instagram":
      return (
        <Trazo className={className}>
          <rect width="20" height="20" x="2" y="2" rx="5" />
          <circle cx="12" cy="12" r="4" />
          <path d="M17.5 6.5h.01" />
        </Trazo>
      );
    case "tiktok":
      return (
        <Trazo className={className}>
          <path d="M12 3v12.5a3.5 3.5 0 1 1-3.5-3.5" />
          <path d="M12 3a5.5 5.5 0 0 0 5.5 5.5" />
        </Trazo>
      );
    default:
      return <Globe aria-hidden className={className} />;
  }
}
