import type { Metadata } from "next";
import Link from "next/link";

import { PanelModeracion } from "@/components/admin/panel-moderacion";
import { PaginaNegocio } from "@/components/negocio/pagina-negocio";
import { Alerta } from "@/components/ui/alerta";
import { InsigniaEstado } from "@/components/ui/insignia-estado";
import { requerirAdmin } from "@/lib/auth";
import { describirCambios } from "@/lib/constantes";
import { listarPlanes, obtenerNegocioAdmin } from "@/lib/consultas/admin";
import { obtenerCategorias, obtenerMunicipios } from "@/lib/consultas/directorio";
import { formatearFecha } from "@/lib/utils";

export const metadata: Metadata = { title: "Revisar negocio" };

export default async function PaginaRevisarNegocio({ params }: PageProps<"/admin/negocios/[id]">) {
  await requerirAdmin();
  const { id } = await params;
  const [negocio, planes, { porId: categorias }, { porId: municipios }] = await Promise.all([
    obtenerNegocioAdmin(id),
    listarPlanes(),
    obtenerCategorias(),
    obtenerMunicipios(),
  ]);
  const categoria = categorias.get(negocio.category_id);
  const hayCambios = negocio.estado === "aprobado" && negocio.cambios_por_revisar.length > 0;

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/admin?estado=${hayCambios ? "cambios" : negocio.estado}`} className="text-sm">← Volver al listado</Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold text-brand-dark">{negocio.nombre}</h1>
          <InsigniaEstado estado={negocio.estado} />
        </div>
        {negocio.estado === "aprobado" && (
          <Link href={`/negocio/${negocio.slug}`} className="text-sm">Ver página pública →</Link>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="order-2 min-w-0 overflow-hidden rounded-2xl bg-brand-light ring-1 ring-brand-dark/10 lg:order-1">
          <PaginaNegocio
            modo="vista-previa"
            negocio={negocio}
            categoria={categoria}
            ciudad={municipios.get(negocio.municipio_id)}
          />
        </div>

        <div className="order-1 space-y-4 lg:order-2">
          <PanelModeracion
            negocioId={negocio.id}
            nombre={negocio.nombre}
            estadoActual={negocio.estado}
            motivoActual={negocio.motivo_estado}
            planActual={negocio.plan}
            planes={planes}
            slugActual={negocio.slug}
            cambiosPorRevisar={
              hayCambios
                ? {
                    campos: describirCambios(negocio.cambios_por_revisar),
                    desde: formatearFecha(negocio.cambios_por_revisar_desde ?? negocio.updated_at),
                  }
                : null
            }
          />
          <div className="space-y-2 rounded-2xl bg-white p-5 text-sm shadow-sm ring-1 ring-brand-dark/10">
            <h2 className="text-lg font-bold text-brand-dark">Dueño</h2>
            <p>{negocio.dueno?.nombre_completo ?? "Sin nombre"}</p>
            {negocio.dueno?.email && <a href={`mailto:${negocio.dueno.email}`}>{negocio.dueno.email}</a>}
            {negocio.dueno?.telefono && <p>{negocio.dueno.telefono}</p>}
            <dl className="space-y-1 border-t border-brand-dark/10 pt-3 text-ink/70">
              <div className="flex justify-between gap-2"><dt>Enviado</dt><dd>{formatearFecha(negocio.created_at)}</dd></div>
              <div className="flex justify-between gap-2"><dt>Actualizado</dt><dd>{formatearFecha(negocio.updated_at)}</dd></div>
              {negocio.aprobado_en && (
                <div className="flex justify-between gap-2"><dt>Aprobado</dt><dd>{formatearFecha(negocio.aprobado_en)}</dd></div>
              )}
              <div className="flex justify-between gap-2"><dt>Fotos</dt><dd>{negocio.imagenes.length}</dd></div>
            </dl>
          </div>
          {negocio.imagenes.length === 0 && (
            <Alerta tono="aviso">Este negocio no tiene fotos. Considera pedirlas antes de aprobar.</Alerta>
          )}
        </div>
      </div>
    </div>
  );
}
