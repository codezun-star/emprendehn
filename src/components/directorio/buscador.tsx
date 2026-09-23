import { Search } from "lucide-react";

import { cn } from "@/lib/utils";

type Opcion = { slug: string; nombre: string };

/**
 * Formulario de búsqueda (GET /buscar). Funciona sin JavaScript.
 * Si solo se elige categoría y/o ciudad, /buscar redirige a la página
 * canónica /categoria/… (mejor para SEO).
 */
export function Buscador({
  categorias,
  ciudades,
  valores = {},
  compacto = false,
}: {
  categorias: { nombre: string; hijas: Opcion[]; slug: string }[];
  ciudades: { destacadas: Opcion[]; todas: Opcion[] };
  valores?: { q?: string; categoria?: string; ciudad?: string };
  compacto?: boolean;
}) {
  const control =
    "h-12 w-full rounded-xl border-0 bg-white px-4 text-sm text-ink ring-1 ring-brand-dark/15 focus:outline-none focus:ring-2 focus:ring-brand";
  return (
    <form
      action="/buscar"
      method="get"
      role="search"
      className={cn(
        "grid gap-2 rounded-2xl bg-white/10 p-2 sm:grid-cols-[1fr_auto_auto_auto]",
        compacto && "bg-transparent p-0",
      )}
    >
      <label className="sr-only" htmlFor="buscar-q">¿Qué buscas?</label>
      <input
        id="buscar-q"
        name="q"
        type="search"
        defaultValue={valores.q}
        placeholder="¿Qué buscas? Ej.: baleadas, barbería, plomero"
        className={control}
      />
      <label className="sr-only" htmlFor="buscar-categoria">Categoría</label>
      <select id="buscar-categoria" name="categoria" defaultValue={valores.categoria ?? ""} className={cn(control, "sm:w-48")}>
        <option value="">Todas las categorías</option>
        {categorias.map((c) => (
          <optgroup key={c.slug} label={c.nombre}>
            <option value={c.slug}>Todo en {c.nombre}</option>
            {c.hijas.map((h) => (
              <option key={h.slug} value={h.slug}>{h.nombre}</option>
            ))}
          </optgroup>
        ))}
      </select>
      <label className="sr-only" htmlFor="buscar-ciudad">Ciudad</label>
      <select id="buscar-ciudad" name="ciudad" defaultValue={valores.ciudad ?? ""} className={cn(control, "sm:w-44")}>
        <option value="">Todo Honduras</option>
        <optgroup label="Ciudades principales">
          {ciudades.destacadas.map((c) => (
            <option key={c.slug} value={c.slug}>{c.nombre}</option>
          ))}
        </optgroup>
        <optgroup label="Todos los municipios">
          {ciudades.todas.map((c) => (
            <option key={c.slug} value={c.slug}>{c.nombre}</option>
          ))}
        </optgroup>
      </select>
      <button
        type="submit"
        className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-accent px-6 text-sm font-bold text-ink hover:brightness-95"
      >
        <Search className="size-4" aria-hidden /> Buscar
      </button>
    </form>
  );
}
