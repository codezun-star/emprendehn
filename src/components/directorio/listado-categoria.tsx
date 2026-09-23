import { MapPin } from "lucide-react";
import Link from "next/link";

import { Migas } from "@/components/directorio/migas";
import { RejillaNegocios } from "@/components/directorio/tarjeta-negocio";
import { JsonLd } from "@/components/seo/json-ld";
import { BotonEnlace } from "@/components/ui/boton";
import type {
  Categoria,
  Municipio,
  ResultadoBusqueda,
  ResumenDirectorio,
} from "@/lib/consultas/directorio";
import { jsonLdListado, type Miga } from "@/lib/seo";

/** Cuerpo compartido de /categoria/[c] y /categoria/[c]/[ciudad]. */
export function ListadoCategoria({
  categoria,
  padre,
  hijas,
  ciudad,
  negocios,
  total,
  resumen,
  conteoHijas,
}: {
  categoria: Categoria;
  padre?: Categoria;
  hijas: Categoria[];
  ciudad?: Municipio;
  negocios: ResultadoBusqueda[];
  total: number;
  resumen: ResumenDirectorio[];
  conteoHijas: Map<string, number>;
}) {
  const titulo = ciudad ? `${categoria.nombre} en ${ciudad.nombre}` : `${categoria.nombre} en Honduras`;
  const ciudadesConNegocios = resumen
    .filter((r) => r.categoria_slug === categoria.slug)
    .sort((a, b) => Number(b.total) - Number(a.total) || a.municipio_nombre.localeCompare(b.municipio_nombre));

  const migas: Miga[] = [
    { nombre: "Inicio", ruta: "/" },
    ...(padre ? [{ nombre: padre.nombre, ruta: `/categoria/${padre.slug}` }] : []),
    { nombre: categoria.nombre, ruta: `/categoria/${categoria.slug}` },
    ...(ciudad ? [{ nombre: ciudad.nombre, ruta: `/categoria/${categoria.slug}/${ciudad.slug}` }] : []),
  ];
  const busquedaCompleta = `/buscar?categoria=${categoria.slug}${ciudad ? `&ciudad=${ciudad.slug}` : ""}`;

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-8">
      <div className="space-y-3">
        <Migas migas={migas} />
        <h1 className="text-3xl font-extrabold text-brand-dark sm:text-4xl">{titulo}</h1>
        <p className="max-w-3xl text-ink/75">
          {ciudad
            ? `Encuentra ${categoria.nombre.toLowerCase()} en ${ciudad.nombre}, ${ciudad.departamento.nombre}. Mira fotos, horarios y ubicación, y contáctalos directo por WhatsApp.`
            : (categoria.descripcion ??
              `Encuentra ${categoria.nombre.toLowerCase()} en todo Honduras. Mira fotos, horarios y ubicación, y contáctalos directo por WhatsApp.`)}
        </p>
        {total > 0 && (
          <p className="text-sm font-semibold text-brand">
            {total} {total === 1 ? "negocio" : "negocios"}
          </p>
        )}
      </div>

      {hijas.length > 0 && (
        <nav aria-label="Subcategorías">
          <ul className="flex flex-wrap gap-2">
            {hijas.map((h) => (
              <li key={h.id}>
                <Link
                  href={ciudad ? `/categoria/${h.slug}/${ciudad.slug}` : `/categoria/${h.slug}`}
                  className="inline-block rounded-full bg-white px-4 py-2 text-sm font-medium text-brand-dark no-underline ring-1 ring-brand-dark/10 hover:ring-brand"
                >
                  {h.nombre}
                  {conteoHijas.get(h.slug) ? <span className="ml-1 text-ink/50">({conteoHijas.get(h.slug)})</span> : null}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}

      {negocios.length > 0 ? (
        <>
          <RejillaNegocios negocios={negocios} />
          <JsonLd datos={jsonLdListado(titulo, negocios)} />
          {total > negocios.length && (
            <div className="text-center">
              <BotonEnlace href={`${busquedaCompleta}&pagina=2`} variante="secundario">
                Ver más resultados
              </BotonEnlace>
            </div>
          )}
        </>
      ) : (
        <div className="rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-brand-dark/10">
          <h2 className="text-xl font-bold text-brand-dark">
            Todavía no hay {categoria.nombre.toLowerCase()} {ciudad ? `en ${ciudad.nombre}` : "publicados"}
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-ink/70">
            ¿Tienes un negocio de este tipo? Regístralo gratis y sé el primero en aparecer aquí.
          </p>
          <BotonEnlace href="/registro" variante="acento" className="mt-5">
            Registrar mi negocio
          </BotonEnlace>
        </div>
      )}

      {ciudadesConNegocios.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-bold text-brand-dark">
            {categoria.nombre} por ciudad
          </h2>
          <ul className="flex flex-wrap gap-2">
            {ciudadesConNegocios.map((r) => (
              <li key={r.municipio_slug}>
                <Link
                  href={`/categoria/${categoria.slug}/${r.municipio_slug}`}
                  aria-current={r.municipio_slug === ciudad?.slug ? "page" : undefined}
                  className="inline-flex items-center gap-1 rounded-full bg-white px-4 py-2 text-sm text-brand-dark no-underline ring-1 ring-brand-dark/10 hover:ring-brand aria-[current=page]:bg-brand-dark aria-[current=page]:text-white"
                >
                  <MapPin className="size-3.5" aria-hidden />
                  {r.municipio_nombre} <span className="opacity-60">({r.total})</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
