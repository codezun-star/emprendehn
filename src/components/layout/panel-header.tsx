import { LogOut } from "lucide-react";
import Link from "next/link";

import { cerrarSesion } from "@/lib/acciones/auth";

import { Logo } from "./logo";
import { PestanasPanel } from "./pestanas-panel";

// En el celular: logo, sección y "Salir"; la navegación va en las pestañas de abajo.
export function PanelHeader({
  email,
  esAdmin,
  seccion,
}: {
  email: string;
  esAdmin: boolean;
  seccion: "panel" | "admin";
}) {
  const enlace = "text-sm font-semibold no-underline hover:text-brand";
  return (
    <>
      <header className="border-b border-brand-dark/10 bg-white pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <Logo />
            <span className="truncate rounded-md bg-brand-dark px-2 py-0.5 text-xs font-semibold text-white">
              {seccion === "admin" ? "Administración" : "Mi panel"}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <nav aria-label="Cuenta" className="hidden flex-wrap items-center gap-4 md:flex">
              <Link href="/panel" className={`${enlace} ${seccion === "panel" ? "text-brand" : "text-brand-dark"}`}>
                Mis negocios
              </Link>
              <Link href="/panel/cuenta" className={`${enlace} text-brand-dark`}>
                Mi cuenta
              </Link>
              {esAdmin && (
                <Link href="/admin" className={`${enlace} ${seccion === "admin" ? "text-brand" : "text-brand-dark"}`}>
                  Administración
                </Link>
              )}
              <span className="hidden max-w-48 truncate text-xs text-ink/60 lg:inline" title={email}>
                {email}
              </span>
            </nav>
            <form action={cerrarSesion}>
              <button
                type="submit"
                className="-mr-2 flex items-center gap-1.5 rounded-full p-2 text-sm font-semibold text-ink/70 hover:text-red-700 md:mr-0 md:p-0"
              >
                <LogOut className="size-5 md:hidden" aria-hidden />
                <span className="max-md:sr-only">Salir</span>
              </button>
            </form>
          </div>
        </div>
      </header>
      <PestanasPanel esAdmin={esAdmin} />
    </>
  );
}
