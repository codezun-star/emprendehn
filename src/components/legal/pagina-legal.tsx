import type { ReactNode } from "react";

import { Migas } from "@/components/directorio/migas";

/** Contenedor de texto largo (Privacidad, Términos): migas, título y estilos de lectura. */
export function PaginaLegal({
  titulo,
  ruta,
  actualizado,
  children,
}: {
  titulo: string;
  ruta: string;
  actualizado?: string;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <Migas migas={[{ nombre: "Inicio", ruta: "/" }, { nombre: titulo, ruta }]} />
      <header className="space-y-1">
        <h1 className="text-3xl font-extrabold text-brand-dark">{titulo}</h1>
        {actualizado && <p className="text-sm text-ink/60">Última actualización: {actualizado}</p>}
      </header>
      <div className="space-y-4 rounded-2xl bg-white p-6 leading-relaxed text-ink/85 shadow-sm ring-1 ring-brand-dark/10 sm:p-8 [&_a]:font-semibold [&_h2]:pt-4 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-brand-dark [&_li]:pl-1 [&_strong]:text-ink [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-6">
        {children}
      </div>
    </div>
  );
}
