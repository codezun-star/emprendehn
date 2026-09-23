import Link from "next/link";

import { obtenerCategorias } from "@/lib/consultas/directorio";

import { Logo } from "./logo";

export async function SiteFooter() {
  const { arbol } = await obtenerCategorias();

  return (
    <footer className="mt-16 bg-brand-dark text-white/80">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-3 lg:col-span-2">
          <Logo claro />
          <p className="max-w-sm text-sm">
            El directorio de emprendedores y negocios de Honduras. Crea gratis el perfil de tu
            negocio y aparece en Google cuando te busquen.
          </p>
        </div>

        <nav aria-label="Categorías">
          <h2 className="mb-3 text-sm font-semibold text-white">Categorías</h2>
          <ul className="space-y-2 text-sm">
            {arbol.slice(0, 7).map((c) => (
              <li key={c.id}>
                <Link href={`/categoria/${c.slug}`} className="text-white/80 no-underline hover:text-white">
                  {c.nombre}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/categorias" className="font-semibold text-accent no-underline hover:text-white">
                Ver todas →
              </Link>
            </li>
          </ul>
        </nav>

        <nav aria-label="Emprendedores">
          <h2 className="mb-3 text-sm font-semibold text-white">Emprendedores</h2>
          <ul className="space-y-2 text-sm">
            <li>
              <Link href="/registro" className="text-white/80 no-underline hover:text-white">
                Registrar mi negocio
              </Link>
            </li>
            <li>
              <Link href="/ingresar" className="text-white/80 no-underline hover:text-white">
                Ingresar
              </Link>
            </li>
            <li>
              <Link href="/buscar" className="text-white/80 no-underline hover:text-white">
                Buscar negocios
              </Link>
            </li>
          </ul>
        </nav>
      </div>
      <div className="border-t border-white/10">
        <p className="mx-auto max-w-6xl px-4 py-4 text-xs text-white/60">
          © {new Date().getFullYear()} EmprendeHN · Hecho en Honduras 🇭🇳
        </p>
      </div>
    </footer>
  );
}
