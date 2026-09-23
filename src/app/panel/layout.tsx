import type { Metadata } from "next";

import { PanelHeader } from "@/components/layout/panel-header";
import { requerirUsuario } from "@/lib/auth";

export const metadata: Metadata = {
  title: { default: "Mi panel", template: "%s · Mi panel | EmprendeHN" },
  robots: { index: false, follow: false },
};

export default async function LayoutPanel({ children }: LayoutProps<"/panel">) {
  const sesion = await requerirUsuario("/panel");
  return (
    <>
      <PanelHeader email={sesion.email} esAdmin={sesion.esAdmin} seccion="panel" />
      <main id="contenido" className="mx-auto w-full max-w-4xl flex-1 px-4 py-8">
        {children}
      </main>
    </>
  );
}
