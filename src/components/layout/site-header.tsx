import Link from "next/link";

import { BotonEnlace } from "@/components/ui/boton";

import { EncabezadoInteligente } from "./encabezado-inteligente";
import { EnlaceSesion } from "./enlace-sesion";
import { Logo } from "./logo";
import { PestanasSitio } from "./pestanas-sitio";

// En el celular el sitio se usa como una app: arriba solo el logo y "Publicar";
// la navegación va en las pestañas de abajo (PestanasSitio). Desde md, el encabezado completo.
export function SiteHeader() {
  return (
    <>
      <EncabezadoInteligente className="sticky top-0 z-30 border-b border-brand-dark/10 bg-white/95 pt-[env(safe-area-inset-top)] backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 md:h-16">
          <Logo />
          <nav aria-label="Principal" className="flex items-center gap-6">
            <Link
              href="/categorias"
              className="hidden text-sm font-semibold text-brand-dark no-underline hover:text-brand md:inline"
            >
              Categorías
            </Link>
            <Link
              href="/buscar"
              className="hidden text-sm font-semibold text-brand-dark no-underline hover:text-brand md:inline"
            >
              Buscar
            </Link>
            <EnlaceSesion className="hidden md:inline" />
            <BotonEnlace href="/registro" variante="acento" tamano="sm" className="max-md:rounded-full max-md:px-4">
              <span className="md:hidden">Publicar</span>
              <span className="hidden md:inline">Registra tu negocio</span>
            </BotonEnlace>
          </nav>
        </div>
      </EncabezadoInteligente>
      {/* Fuera del encabezado: este se desliza al esconderse y arrastraría la barra fija. */}
      <PestanasSitio />
    </>
  );
}
