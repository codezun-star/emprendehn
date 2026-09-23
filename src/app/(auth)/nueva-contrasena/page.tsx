import type { Metadata } from "next";

import { FormularioNuevaContrasena } from "@/components/auth/formulario-nueva-contrasena";
import { Alerta } from "@/components/ui/alerta";
import { BotonEnlace } from "@/components/ui/boton";
import { obtenerSesion } from "@/lib/auth";

export const metadata: Metadata = { title: "Nueva contraseña" };

export default async function PaginaNuevaContrasena() {
  // Se llega aquí desde el enlace del correo de recuperación (/auth/confirm),
  // que ya inició una sesión temporal.
  const sesion = await obtenerSesion();

  return (
    <div className="space-y-6">
      <div className="space-y-1 text-center">
        <h1 className="text-2xl font-bold text-brand-dark">Crea una nueva contraseña</h1>
        {sesion && <p className="text-sm text-ink/70">Para la cuenta {sesion.email}</p>}
      </div>
      {sesion ? (
        <FormularioNuevaContrasena />
      ) : (
        <div className="space-y-4">
          <Alerta tono="aviso">
            El enlace expiró o ya fue usado. Solicita uno nuevo para restablecer tu contraseña.
          </Alerta>
          <BotonEnlace href="/recuperar-contrasena" className="w-full">
            Solicitar nuevo enlace
          </BotonEnlace>
        </div>
      )}
    </div>
  );
}
