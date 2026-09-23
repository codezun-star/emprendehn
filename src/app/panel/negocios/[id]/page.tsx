import type { Metadata } from "next";

import { ZonaPeligro } from "@/components/panel/zona-peligro";
import { FormularioNegocio } from "@/components/panel/formulario-negocio";
import { Alerta } from "@/components/ui/alerta";
import { requerirUsuario } from "@/lib/auth";
import { obtenerOpcionesFormulario } from "@/lib/consultas/formulario";
import { obtenerMiNegocio } from "@/lib/consultas/panel";
import { valoresDesdeNegocio } from "@/lib/negocio-form";

export const metadata: Metadata = { title: "Editar negocio" };

export default async function PaginaEditarNegocio({ params }: PageProps<"/panel/negocios/[id]">) {
  const { id } = await params;
  const sesion = await requerirUsuario(`/panel/negocios/${id}`);
  const [negocio, opciones] = await Promise.all([
    obtenerMiNegocio(sesion.userId, id),
    obtenerOpcionesFormulario(),
  ]);

  return (
    <div className="space-y-6">
      {(negocio.estado === "rechazado" || negocio.estado === "suspendido") && negocio.motivo_estado && (
        <Alerta tono="error" titulo="Mensaje del equipo de EmprendeHN">
          {negocio.motivo_estado}
        </Alerta>
      )}
      <FormularioNegocio
        negocioId={negocio.id}
        categorias={opciones.categorias}
        departamentos={opciones.departamentos}
        municipios={opciones.municipios}
        valoresIniciales={valoresDesdeNegocio(negocio)}
        departamentoInicial={opciones.municipiosPorId.get(negocio.municipio_id)?.departamento_id}
      />
      <ZonaPeligro negocioId={negocio.id} nombre={negocio.nombre} />
    </div>
  );
}
