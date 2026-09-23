import type { Metadata } from "next";
import Link from "next/link";

import { FormularioRecuperacion } from "@/components/auth/formulario-recuperacion";

export const metadata: Metadata = { title: "Recuperar contraseña" };

export default function PaginaRecuperar() {
  return (
    <div className="space-y-6">
      <div className="space-y-1 text-center">
        <h1 className="text-2xl font-bold text-brand-dark">Recupera tu contraseña</h1>
        <p className="text-sm text-ink/70">
          Escribe tu correo y te enviaremos un enlace para crear una nueva.
        </p>
      </div>
      <FormularioRecuperacion />
      <p className="text-center text-sm">
        <Link href="/ingresar">Volver a ingresar</Link>
      </p>
    </div>
  );
}
