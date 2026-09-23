import type { Metadata } from "next";

import { PerfilNegocio } from "@/components/directorio/perfil-negocio";
import { Alerta } from "@/components/ui/alerta";
import { requerirUsuario } from "@/lib/auth";
import { obtenerCategorias, obtenerMunicipios } from "@/lib/consultas/directorio";
import { obtenerMiNegocio } from "@/lib/consultas/panel";

export const metadata: Metadata = { title: "Vista previa" };

export default async function PaginaVistaPrevia({ params }: PageProps<"/panel/negocios/[id]/vista-previa">) {
  const { id } = await params;
  const sesion = await requerirUsuario(`/panel/negocios/${id}/vista-previa`);
  const [negocio, { porId: categorias }, { porId: municipios }] = await Promise.all([
    obtenerMiNegocio(sesion.userId, id),
    obtenerCategorias(),
    obtenerMunicipios(),
  ]);
  const categoria = categorias.get(negocio.category_id);

  return (
    <div className="space-y-4">
      <Alerta tono="info">
        {negocio.estado === "aprobado"
          ? "Así se ve tu página publicada (puede tardar unos segundos en reflejar los últimos cambios)."
          : "Así se verá tu página cuando sea aprobada. Todavía no es visible para el público."}
      </Alerta>
      <div className="-mx-4 overflow-hidden rounded-2xl bg-brand-light ring-1 ring-brand-dark/10 sm:mx-0">
        <PerfilNegocio
          negocio={negocio}
          categoria={categoria}
          categoriaPadre={categoria?.parent_id ? categorias.get(categoria.parent_id) : undefined}
          ciudad={municipios.get(negocio.municipio_id)}
        />
      </div>
    </div>
  );
}
