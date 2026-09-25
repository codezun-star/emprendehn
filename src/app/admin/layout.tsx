import type { Metadata } from "next";
import Link from "next/link";

import { PanelHeader } from "@/components/layout/panel-header";
import { cerrarSesionEnTodos } from "@/lib/acciones/dos-pasos";
import { requerirAdmin } from "@/lib/auth";
import { contarReportesAbiertos, contarResenasReportadas } from "@/lib/consultas/admin";

const hora = new Intl.DateTimeFormat("es-HN", { timeStyle: "short", timeZone: "America/Tegucigalpa" });

export const metadata: Metadata = {
  title: { default: "Administración", template: "%s · Admin | EmprendeHN" },
  robots: { index: false, follow: false },
};

export default async function LayoutAdmin({ children }: LayoutProps<"/admin">) {
  const [sesion, reportesAbiertos, resenasReportadas] = await Promise.all([
    requerirAdmin(),
    contarReportesAbiertos(),
    contarResenasReportadas(),
  ]);
  return (
    <>
      <PanelHeader email={sesion.email} esAdmin seccion="admin" />
      <div className="border-b border-brand-dark/10 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 px-4">
          <nav aria-label="Administración" className="flex flex-wrap gap-x-6 text-sm font-semibold">
            <Link href="/admin" className="py-3 text-brand-dark no-underline hover:text-brand">
              Negocios
            </Link>
            <Link href="/admin/categorias" className="py-3 text-brand-dark no-underline hover:text-brand">
              Categorías
            </Link>
            <Link href="/admin/reportes" className="flex items-center gap-1.5 py-3 text-brand-dark no-underline hover:text-brand">
              Reportes
              {reportesAbiertos > 0 && (
                <span className="rounded-full bg-red-600 px-1.5 text-xs text-white">{reportesAbiertos}</span>
              )}
            </Link>
            <Link href="/admin/resenas" className="flex items-center gap-1.5 py-3 text-brand-dark no-underline hover:text-brand">
              Reseñas
              {resenasReportadas > 0 && (
                <span className="rounded-full bg-red-600 px-1.5 text-xs text-white">{resenasReportadas}</span>
              )}
            </Link>
            <Link href="/admin/actividad" className="py-3 text-brand-dark no-underline hover:text-brand">
              Actividad
            </Link>
          </nav>
          {/* Seguridad de la sesión: el código se vuelve a pedir a las 12 horas. */}
          <div className="flex flex-wrap items-center gap-x-3 py-2 text-xs text-ink/60">
            {sesion.dosPasosHasta && <span>Verificado con código hasta las {hora.format(sesion.dosPasosHasta)}</span>}
            <form action={cerrarSesionEnTodos}>
              <button type="submit" className="font-semibold text-ink/70 underline hover:text-red-700">
                Cerrar sesión en todos los dispositivos
              </button>
            </form>
          </div>
        </div>
      </div>
      <main id="contenido" className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        {children}
      </main>
    </>
  );
}
  