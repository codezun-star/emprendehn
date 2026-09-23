import { ArrowRight, BadgeCheck, Search, Store } from "lucide-react";
import Link from "next/link";

import { Buscador } from "@/components/directorio/buscador";
import { IconoCategoria } from "@/components/directorio/icono-categoria";
import { RejillaNegocios } from "@/components/directorio/tarjeta-negocio";
import { JsonLd } from "@/components/seo/json-ld";
import { BotonEnlace } from "@/components/ui/boton";
import {
  contarPorCategoria,
  obtenerCategorias,
  obtenerMunicipios,
  obtenerNegociosRecientes,
  obtenerOpcionesBuscador,
} from "@/lib/consultas/directorio";
import { jsonLdSitio } from "@/lib/seo";

// ISR: se regenera como máximo cada hora (y on-demand al aprobar negocios).
export const revalidate = 3600;

function textoConteo(total = 0) {
  if (total === 0) return "Sé el primero";
  return total === 1 ? "1 negocio" : `${total} negocios`;
}

export default async function PaginaInicio() {
  const [{ arbol }, { destacados: ciudades }, conteo, recientes, opciones] = await Promise.all([
    obtenerCategorias(),
    obtenerMunicipios(),
    contarPorCategoria(),
    obtenerNegociosRecientes(6),
    obtenerOpcionesBuscador(),
  ]);
  const destacadas = arbol.filter((c) => c.destacada);

  return (
    <>
      <JsonLd datos={jsonLdSitio()} />

      <section className="bg-brand-dark text-white">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:py-20">
          <h1 className="max-w-3xl text-3xl font-extrabold leading-tight sm:text-5xl">
            Encuentra negocios y emprendedores en <span className="text-accent">Honduras</span>
          </h1>
          <p className="mt-4 max-w-2xl text-base text-white/80 sm:text-lg">
            Panaderías, salones de belleza, plomeros, tiendas y cientos de servicios cerca de ti.
            Contáctalos directo por WhatsApp.
          </p>
          <div className="mt-8 max-w-5xl">
            <Buscador categorias={opciones.categorias} ciudades={opciones.ciudades} />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12">
        <div className="mb-6 flex items-end justify-between gap-4">
          <h2 className="text-2xl font-bold text-brand-dark">Explora por categoría</h2>
          <Link href="/categorias" className="text-sm font-semibold">
            Ver todas →
          </Link>
        </div>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {destacadas.map((c) => (
            <li key={c.id}>
              <Link
                href={`/categoria/${c.slug}`}
                className="flex h-full items-center gap-3 rounded-2xl bg-white p-4 no-underline shadow-sm ring-1 ring-brand-dark/10 transition hover:ring-brand"
              >
                <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-light text-brand">
                  <IconoCategoria icono={c.icono} className="size-5" />
                </span>
                <span className="min-w-0">
                  <span className="block font-semibold leading-tight text-brand-dark">{c.nombre}</span>
                  <span className="text-xs text-ink/60">
                    {textoConteo(conteo.get(c.slug))}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {recientes.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 pb-12">
          <h2 className="mb-6 text-2xl font-bold text-brand-dark">Recién llegados al directorio</h2>
          <RejillaNegocios negocios={recientes} />
        </section>
      )}

      <section className="mx-auto max-w-6xl px-4 pb-12">
        <h2 className="mb-4 text-2xl font-bold text-brand-dark">Busca en tu ciudad</h2>
        <ul className="flex flex-wrap gap-2">
          {ciudades.map((c) => (
            <li key={c.id}>
              <Link
                href={`/buscar?ciudad=${c.slug}`}
                className="inline-block rounded-full bg-white px-4 py-2 text-sm font-medium text-brand-dark no-underline ring-1 ring-brand-dark/10 hover:ring-brand"
              >
                {c.nombre}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="bg-white">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-brand">Para emprendedores</p>
            <h2 className="mt-2 text-3xl font-extrabold text-brand-dark">
              Tu negocio en Google, sin pagar una página web
            </h2>
            <p className="mt-4 text-ink/80">
              Crea gratis el perfil de tu negocio en EmprendeHN: con tus fotos, horario, ubicación y
              un botón directo a tu WhatsApp. Tu página vive en un sitio con cientos de negocios, y
              eso ayuda a que Google te muestre cuando alguien busca lo que vendes en tu ciudad.
            </p>
            <BotonEnlace href="/registro" variante="acento" tamano="lg" className="mt-6">
              Registrar mi negocio gratis <ArrowRight className="size-4" aria-hidden />
            </BotonEnlace>
          </div>
          <ol className="space-y-4">
            {[
              { icono: Store, titulo: "Crea tu perfil", texto: "Nombre, categoría, fotos, horario y WhatsApp. Toma 5 minutos." },
              { icono: BadgeCheck, titulo: "Lo revisamos", texto: "Verificamos que la información sea real antes de publicarlo." },
              { icono: Search, titulo: "Te encuentran", texto: "Tu página aparece en el directorio y en los buscadores." },
            ].map((paso, i) => (
              <li key={paso.titulo} className="flex gap-4 rounded-2xl bg-brand-light p-5">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-dark font-bold text-white">
                  {i + 1}
                </span>
                <div>
                  <h3 className="flex items-center gap-2 font-bold text-brand-dark">
                    <paso.icono className="size-4" aria-hidden /> {paso.titulo}
                  </h3>
                  <p className="text-sm text-ink/70">{paso.texto}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </>
  );
}
