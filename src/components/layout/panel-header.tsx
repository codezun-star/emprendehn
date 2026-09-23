import Link from "next/link";

import { cerrarSesion } from "@/lib/acciones/auth";

import { Logo } from "./logo";

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
    <header className="border-b border-brand-dark/10 bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-3">
          <Logo />
          <span className="rounded-md bg-brand-dark px-2 py-0.5 text-xs font-semibold text-white">
            {seccion === "admin" ? "Administración" : "Mi panel"}
          </span>
        </div>
        <nav aria-label="Cuenta" className="flex flex-wrap items-center gap-4">
          <Link href="/panel" className={`${enlace} ${seccion === "panel" ? "text-brand" : "text-brand-dark"}`}>
            Mis negocios
          </Link>
          {esAdmin && (
            <Link href="/admin" className={`${enlace} ${seccion === "admin" ? "text-brand" : "text-brand-dark"}`}>
              Administración
            </Link>
          )}
          <span className="hidden max-w-48 truncate text-xs text-ink/60 md:inline" title={email}>
            {email}
          </span>
          <form action={cerrarSesion}>
            <button type="submit" className="text-sm font-semibold text-ink/70 hover:text-red-700">
              Salir
            </button>
          </form>
        </nav>
      </div>
    </header>
  );
}
