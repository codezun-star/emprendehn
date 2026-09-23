import type { Metadata } from "next";
import Link from "next/link";

import { FormularioNegocio } from "@/components/panel/formulario-negocio";
import { Alerta } from "@/components/ui/alerta";
import { requerirUsuario } from "@/lib/auth";
import { MAX_NEGOCIOS_POR_CUENTA } from "@/lib/constantes";
import { obtenerOpcionesFormulario } from "@/lib/consultas/formulario";
import { obtenerMisNegocios } from "@/lib/consultas/panel";

export const metadata: Metadata = { title: "Registrar negocio" };

export default async function PaginaNuevoNegocio() {
  const sesion = await requerirUsuario("/panel/negocios/nuevo");
  const [negocios, opciones] = await Promise.all([
    obtenerMisNegocios(sesion.userId),
    obtenerOpcionesFormulario(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/panel" className="text-sm">← Mis negocios</Link>
        <h1 className="mt-2 text-2xl font-bold text-brand-dark">Registra tu negocio</h1>
        <p className="text-sm text-ink/70">
          Completa la información. Revisaremos tu negocio antes de publicarlo en el directorio.
        </p>
      </div>
      {negocios.length >= MAX_NEGOCIOS_POR_CUENTA ? (
        <Alerta tono="aviso">Alcanzaste el máximo de {MAX_NEGOCIOS_POR_CUENTA} negocios por cuenta.</Alerta>
      ) : (
        <FormularioNegocio
          categorias={opciones.categorias}
          departamentos={opciones.departamentos}
          municipios={opciones.municipios}
        />
      )}
    </div>
  );
}
