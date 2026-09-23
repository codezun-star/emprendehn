import { SiteHeader } from "@/components/layout/site-header";
import { BotonEnlace } from "@/components/ui/boton";

export default function NoEncontrado() {
  return (
    <>
      <SiteHeader />
      <main id="contenido" className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center px-4 py-20 text-center">
        <p className="text-6xl font-black text-brand-dark/20">404</p>
        <h1 className="mt-4 text-2xl font-bold text-brand-dark">No encontramos esta página</h1>
        <p className="mt-2 text-ink/70">
          Puede que el negocio ya no esté publicado o que el enlace tenga un error.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <BotonEnlace href="/">Ir al inicio</BotonEnlace>
          <BotonEnlace href="/categorias" variante="secundario">
            Ver categorías
          </BotonEnlace>
        </div>
      </main>
    </>
  );
}
