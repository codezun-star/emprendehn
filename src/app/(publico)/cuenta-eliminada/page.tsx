import { CircleCheck } from "lucide-react";
import type { Metadata } from "next";

import { BotonEnlace } from "@/components/ui/boton";

export const metadata: Metadata = {
  title: "Cuenta eliminada",
  robots: { index: false, follow: false },
};

export default function PaginaCuentaEliminada() {
  return (
    <div className="mx-auto max-w-md space-y-4 px-4 py-16 text-center">
      <CircleCheck className="mx-auto size-12 text-emerald-700" aria-hidden />
      <h1 className="text-2xl font-bold text-brand-dark">Tu cuenta fue eliminada</h1>
      <p className="text-ink/75">
        Borramos tu cuenta, tus negocios y sus fotos. Gracias por haber sido parte de EmprendeHN.
      </p>
      <BotonEnlace href="/" variante="secundario">
        Ir al inicio
      </BotonEnlace>
    </div>
  );
}
