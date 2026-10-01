"use client";

import { CircleUserRound, House, ShieldCheck, Store } from "lucide-react";
import { usePathname } from "next/navigation";

import { BarraPestanas, type Pestana } from "./barra-pestanas";

/**
 * Pestañas del panel en el celular. En el editor de un negocio no se muestran:
 * es una pantalla "adentro" (vuelve con "← Mis negocios") con su propia barra
 * de guardar abajo.
 */
export function PestanasPanel({ esAdmin }: { esAdmin: boolean }) {
  const ruta = usePathname();
  if (ruta.startsWith("/panel/negocios/")) return null;

  const pestanas: Pestana[] = [
    { href: "/panel", etiqueta: "Mis negocios", icono: Store, activa: (r) => r === "/panel" },
    { href: "/panel/cuenta", etiqueta: "Mi cuenta", icono: CircleUserRound, activa: (r) => r === "/panel/cuenta" },
    ...(esAdmin
      ? [{ href: "/admin", etiqueta: "Admin", icono: ShieldCheck, activa: (r: string) => r.startsWith("/admin") }]
      : []),
    { href: "/", etiqueta: "Directorio", icono: House, activa: () => false },
  ];
  return <BarraPestanas etiqueta="Panel" pestanas={pestanas} />;
}
