import type { Metadata } from "next";

import { GestorGaleria } from "@/components/panel/gestor-galeria";
import { Alerta } from "@/components/ui/alerta";
import { requerirUsuario } from "@/lib/auth";
import { obtenerMiNegocio } from "@/lib/consultas/panel";

export const metadata: Metadata = { title: "Logo y fotos" };

export default async function PaginaGaleria({ params, searchParams }: PageProps<"/panel/negocios/[id]/galeria">) {
  const [{ id }, { nuevo }] = await Promise.all([params, searchParams]);
  const sesion = await requerirUsuario(`/panel/negocios/${id}/galeria`);
  const negocio = await obtenerMiNegocio(sesion.userId, id);

  return (
    <div className="space-y-6">
      {nuevo === "1" && (
        <Alerta tono="exito" titulo="¡Tu negocio fue enviado a revisión!">
          Mientras lo revisamos, agrega tu logo y algunas fotos: los perfiles con fotos generan más
          confianza y más contactos.
        </Alerta>
      )}
      <GestorGaleria
        negocioId={negocio.id}
        nombreNegocio={negocio.nombre}
        imagenes={negocio.imagenes}
        maxImagenes={negocio.plan_info?.max_imagenes ?? 5}
        logoPath={negocio.logo_path}
      />
    </div>
  );
}
