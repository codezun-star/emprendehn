import Link from "next/link";

import { BotonEnlace } from "@/components/ui/boton";

import { EnlaceSesion } from "./enlace-sesion";
import { Logo } from "./logo";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-brand-dark/10 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <Logo />
        <nav aria-label="Principal" className="flex items-center gap-4 sm:gap-6">
          <Link
            href="/categorias"
            className="hidden text-sm font-semibold text-brand-dark no-underline hover:text-brand sm:inline"
          >
            Categorías
          </Link>
          <Link
            href="/buscar"
            className="hidden text-sm font-semibold text-brand-dark no-underline hover:text-brand sm:inline"
          >
            Buscar
          </Link>
          <EnlaceSesion />
          <BotonEnlace href="/registro" variante="acento" tamano="sm">
            <span className="sm:hidden">Publicar</span>
            <span className="hidden sm:inline">Registra tu negocio</span>
          </BotonEnlace>
        </nav>
      </div>
    </header>
  );
}
