import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { FormularioDosPasos } from "@/components/auth/formulario-dos-pasos";
import { requerirUsuario } from "@/lib/auth";
import { destinoAdmin, VIGENCIA_DOS_PASOS_HORAS } from "@/lib/dos-pasos";
import { crearClienteServidor } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Verificación en dos pasos" };

/**
 * Segundo paso del admin: activar la app de autenticación (la primera vez) o
 * ingresar su código. A quien no es admin le responde 404.
 */
export default async function PaginaDosPasos({ searchParams }: PageProps<"/dos-pasos">) {
  const { siguiente } = await searchParams;
  const sesion = await requerirUsuario("/dos-pasos");
  if (!sesion.rolAdmin) notFound();
  const destino = destinoAdmin(typeof siguiente === "string" ? siguiente : undefined);
  if (sesion.esAdmin) redirect(destino);

  const supabase = await crearClienteServidor();
  const { data } = await supabase.auth.mfa.listFactors();
  const factor = data?.totp[0];

  return (
    <div className="space-y-6">
      <div className="space-y-1 text-center">
        <h1 className="text-2xl font-bold text-brand-dark">Verificación en dos pasos</h1>
        <p className="text-sm text-ink/70">
          {factor
            ? `Ingresa el código de 6 números de tu app de autenticación. Lo pedimos cada ${VIGENCIA_DOS_PASOS_HORAS} horas.`
            : "Para proteger el panel de administración, además de tu contraseña pediremos un código de tu teléfono."}
        </p>
      </div>
      <FormularioDosPasos factorId={factor?.id ?? null} siguiente={destino} />
    </div>
  );
}
