import type { Metadata } from "next";
import Link from "next/link";

import { BotonGoogle } from "@/components/auth/boton-google";
import { FormularioIngreso } from "@/components/auth/formulario-ingreso";
import { Alerta } from "@/components/ui/alerta";

export const metadata: Metadata = { title: "Ingresar" };

const MENSAJES: Record<string, string> = {
  "enlace-invalido":
    "El enlace no es válido, ya se usó o expiró. Si tu cuenta ya está confirmada, inicia sesión aquí abajo.",
  "otro-navegador":
    "Abriste el enlace en otro navegador. Si era para confirmar tu cuenta, ya quedó confirmada: inicia sesión aquí abajo. " +
    "Si era para cambiar tu contraseña, pide un enlace nuevo y ábrelo en este mismo navegador.",
  google: "No pudimos iniciar sesión con Google. Inténtalo de nuevo o ingresa con tu correo.",
};

const AVISOS: Record<string, string> = {
  "sesiones-cerradas": "Cerraste la sesión en todos tus dispositivos. Vuelve a ingresar en este.",
};

export default async function PaginaIngresar({ searchParams }: PageProps<"/ingresar">) {
  const { siguiente, error, aviso } = await searchParams;
  const mensajeError = typeof error === "string" ? MENSAJES[error] : undefined;
  const mensajeAviso = typeof aviso === "string" ? AVISOS[aviso] : undefined;

  return (
    <div className="space-y-6">
      <div className="space-y-1 text-center">
        <h1 className="text-2xl font-bold text-brand-dark">Ingresa a tu cuenta</h1>
        <p className="text-sm text-ink/70">Administra el perfil de tu negocio.</p>
      </div>
      {mensajeError && <Alerta tono="error">{mensajeError}</Alerta>}
      {mensajeAviso && <Alerta tono="exito">{mensajeAviso}</Alerta>}
      <BotonGoogle siguiente={typeof siguiente === "string" ? siguiente : undefined} />
      <FormularioIngreso siguiente={typeof siguiente === "string" ? siguiente : undefined} />
      <p className="text-center text-sm text-ink/70">
        ¿No tienes cuenta? <Link href="/registro" className="font-semibold">Regístrate gratis</Link>
      </p>
    </div>
  );
}
