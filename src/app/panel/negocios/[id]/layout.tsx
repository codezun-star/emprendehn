import Link from "next/link";

import { PestanasNegocio } from "@/components/panel/pestanas-negocio";
import { Alerta } from "@/components/ui/alerta";
import { InsigniaEstado } from "@/components/ui/insignia-estado";
import { requerirUsuario } from "@/lib/auth";
import { obtenerMiNegocio } from "@/lib/consultas/panel";

export default async function LayoutNegocio({ children, params }: LayoutProps<"/panel/negocios/[id]">) {
  const { id } = await params;
  const sesion = await requerirUsuario(`/panel/negocios/${id}`);
  const negocio = await obtenerMiNegocio(sesion.userId, id);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/panel" className="text-sm">← Mis negocios</Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold text-brand-dark">{negocio.nombre}</h1>
          <InsigniaEstado estado={negocio.estado} />
        </div>
      </div>
      <PestanasNegocio negocioId={negocio.id} />
      {(negocio.estado === "rechazado" || negocio.estado === "suspendido") && (
        <Alerta tono="error" titulo="Mensaje del equipo de EmprendeHN">
          {negocio.motivo_estado && <p>{negocio.motivo_estado}</p>}
          <p className={negocio.motivo_estado ? "mt-2" : undefined}>
            Corrige lo indicado y guarda los cambios (o agrega las fotos que falten): tu negocio volverá a
            revisión automáticamente.
          </p>
        </Alerta>
      )}
      {children}
    </div>
  );
}
