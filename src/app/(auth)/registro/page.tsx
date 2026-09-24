import type { Metadata } from "next";
import Link from "next/link";

import { BotonGoogle } from "@/components/auth/boton-google";
import { FormularioRegistro } from "@/components/auth/formulario-registro";

export const metadata: Metadata = {
  title: "Registra tu negocio gratis",
  description: "Crea gratis el perfil de tu negocio en EmprendeHN y aparece en Google.",
};

export default function PaginaRegistro() {
  return (
    <div className="space-y-6">
      <div className="space-y-1 text-center">
        <h1 className="text-2xl font-bold text-brand-dark">Crea tu cuenta</h1>
        <p className="text-sm text-ink/70">
          Es gratis. Después de confirmar tu correo podrás registrar tu negocio.
        </p>
      </div>
      <BotonGoogle />
      <FormularioRegistro />
      <p className="text-center text-sm text-ink/70">
        ¿Ya tienes cuenta? <Link href="/ingresar" className="font-semibold">Ingresa</Link>
      </p>
    </div>
  );
}
