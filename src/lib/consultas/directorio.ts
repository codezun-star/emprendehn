import "server-only";

import { cache } from "react";

import { crearClientePublico } from "@/lib/supabase/publico";
import type { Database, Tables } from "@/types/database.types";

// Consultas de las páginas PÚBLICAS: usan el cliente anónimo sin cookies para
// que las rutas se puedan prerenderizar y cachear (ISR). RLS garantiza que
// solo se lean negocios aprobados.

export type Categoria = Pick<
  Tables<"categories">,
  "id" | "parent_id" | "nombre" | "slug" | "descripcion" | "schema_type" | "icono" | "orden" | "destacada"
>;
export type CategoriaConHijas = Categoria & { hijas: Categoria[] };

export type Municipio = Pick<Tables<"municipios">, "id" | "nombre" | "slug" | "destacado" | "departamento_id"> & {
  departamento: Pick<Tables<"departamentos">, "nombre" | "slug">;
};

export type ResultadoBusqueda =
  Database["public"]["Functions"]["buscar_negocios"]["Returns"][number];

export type ResumenDirectorio =
  Database["public"]["Functions"]["resumen_directorio"]["Returns"][number];

export const obtenerCategorias = cache(async () => {
  const { data, error } = await crearClientePublico()
    .from("categories")
    .select("id, parent_id, nombre, slug, descripcion, schema_type, icono, orden, destacada")
    .eq("activa", true)
    .order("orden")
    .order("nombre");
  if (error) throw new Error(`No se pudieron cargar las categorías: ${error.message}`);

  const padres: CategoriaConHijas[] = data
    .filter((c) => c.parent_id === null)
    .map((c) => ({ ...c, hijas: [] }));
  const porId = new Map(padres.map((p) => [p.id, p]));
  for (const c of data) {
    if (c.parent_id) porId.get(c.parent_id)?.hijas.push(c);
  }
  return {
    arbol: padres,
    todas: data as Categoria[],
    porSlug: new Map(data.map((c) => [c.slug, c as Categoria])),
    porId: new Map(data.map((c) => [c.id, c as Categoria])),
  };
});

export const obtenerMunicipios = cache(async () => {
  const { data, error } = await crearClientePublico()
    .from("municipios")
    .select("id, nombre, slug, destacado, departamento_id, departamento:departamentos(nombre, slug)")
    .order("nombre");
  if (error) throw new Error(`No se pudieron cargar los municipios: ${error.message}`);

  const municipios = data as unknown as Municipio[];
  return {
    todos: municipios,
    porSlug: new Map(municipios.map((m) => [m.slug, m])),
    porId: new Map(municipios.map((m) => [m.id, m])),
    destacados: municipios.filter((m) => m.destacado),
  };
});

export const obtenerDepartamentos = cache(async () => {
  const { data, error } = await crearClientePublico()
    .from("departamentos")
    .select("id, nombre, slug")
    .order("nombre");
  if (error) throw new Error(`No se pudieron cargar los departamentos: ${error.message}`);
  return data;
});

const COLUMNAS_NEGOCIO = `
  id, nombre, slug, descripcion, category_id, municipio_id, localidad, direccion,
  telefono, whatsapp, email_contacto, redes_sociales, horario, logo_path, plan,
  estado, aprobado_en, updated_at,
  imagenes:business_images(id, storage_path, alt_text, orden, ancho, alto)
` as const;

export type NegocioPublico = Awaited<ReturnType<typeof obtenerNegocioPublico>>;

/** Perfil completo de un negocio aprobado (o null). */
export const obtenerNegocioPublico = cache(async (slug: string) => {
  const { data, error } = await crearClientePublico()
    .from("businesses")
    .select(COLUMNAS_NEGOCIO)
    .eq("slug", slug)
    .eq("estado", "aprobado")
    .order("orden", { referencedTable: "business_images" })
    .maybeSingle();
  if (error) throw new Error(`No se pudo cargar el negocio: ${error.message}`);
  return data;
});

export async function buscarNegocios(params: {
  texto?: string | null;
  categoria?: string | null;
  ciudad?: string | null;
  limite?: number;
  desplazamiento?: number;
  orden?: "relevancia" | "recientes";
}) {
  const { data, error } = await crearClientePublico().rpc("buscar_negocios", {
    p_texto: params.texto || undefined,
    p_categoria: params.categoria || undefined,
    p_ciudad: params.ciudad || undefined,
    p_limite: params.limite ?? 24,
    p_desplazamiento: params.desplazamiento ?? 0,
    p_orden: params.orden ?? "relevancia",
  });
  if (error) throw new Error(`Error en la búsqueda: ${error.message}`);
  return { negocios: data, total: data[0]?.total ?? 0 };
}

/** Conteo de negocios aprobados por categoría (padre e hija) y ciudad. */
export const obtenerResumen = cache(async (categoriaSlug?: string) => {
  const { data, error } = await crearClientePublico().rpc("resumen_directorio", {
    p_categoria: categoriaSlug,
  });
  if (error) throw new Error(`No se pudo cargar el resumen: ${error.message}`);
  return data;
});

/** Total de negocios aprobados por categoría (slug). */
export async function contarPorCategoria(): Promise<Map<string, number>> {
  const resumen = await obtenerResumen();
  const conteo = new Map<string, number>();
  for (const fila of resumen) {
    conteo.set(fila.categoria_slug, (conteo.get(fila.categoria_slug) ?? 0) + Number(fila.total));
  }
  return conteo;
}

export async function obtenerNegociosRecientes(limite = 6) {
  const { negocios } = await buscarNegocios({ limite, orden: "recientes" });
  return negocios;
}

/** Para el sitemap: todos los negocios aprobados. */
export async function obtenerNegociosParaSitemap() {
  const filas: { slug: string; updated_at: string }[] = [];
  const pagina = 1000;
  for (let desde = 0; ; desde += pagina) {
    const { data, error } = await crearClientePublico()
      .from("businesses")
      .select("slug, updated_at")
      .eq("estado", "aprobado")
      .order("slug")
      .range(desde, desde + pagina - 1);
    if (error) throw new Error(`No se pudo generar el sitemap: ${error.message}`);
    filas.push(...data);
    if (data.length < pagina) break;
  }
  return filas;
}

/** Opciones para el buscador (categorías en árbol y ciudades). */
export async function obtenerOpcionesBuscador() {
  const [{ arbol }, { todos, destacados }] = await Promise.all([obtenerCategorias(), obtenerMunicipios()]);
  const repetidos = new Set(
    todos.map((m) => m.nombre).filter((nombre, i, lista) => lista.indexOf(nombre) !== i),
  );
  const etiqueta = (m: Municipio) =>
    repetidos.has(m.nombre) ? `${m.nombre} (${m.departamento.nombre})` : m.nombre;
  return {
    categorias: arbol.map((c) => ({
      slug: c.slug,
      nombre: c.nombre,
      hijas: c.hijas.map((h) => ({ slug: h.slug, nombre: h.nombre })),
    })),
    ciudades: {
      destacadas: destacados.map((m) => ({ slug: m.slug, nombre: m.nombre })),
      todas: todos.map((m) => ({ slug: m.slug, nombre: etiqueta(m) })),
    },
  };
}
