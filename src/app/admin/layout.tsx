import type { Metadata } from "next";
import Link from "next/link";

import { PanelHeader } from "@/components/layout/panel-header";
import { requerirAdmin } from "@/lib/auth";
import { contarReportesAbiertos, contarResenasReportadas } from "@/lib/consultas/admin";

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
        <nav aria-label="Administración" className="mx-auto flex max-w-6xl gap-6 px-4 text-sm font-semibold">
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
        </nav>
      </div>
      <main id="contenido" className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        {children}
      </main>
    </>
  );
}
