import "server-only";

import { cache } from "react";

import { RESENAS_POR_PAGINA } from "@/lib/constantes";
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

/**
 * Error legible. Si la tabla o función no existe, casi siempre es que faltan
 * migraciones en el proyecto de Supabase (el build prerenderiza con datos reales).
 */
function errorDeConsulta(contexto: string, error: { message: string; code?: string }): Error {
  const faltaEsquema = ["PGRST202", "PGRST205", "42P01", "42883"].includes(error.code ?? "");
  return new Error(
    `${contexto}: ${error.message}` +
      (faltaEsquema
        ? " — ¿Ya aplicaste las migraciones de supabase/migrations (001–020) en este proyecto de Supabase?"
        : ""),
  );
}

export const obtenerCategorias = cache(async () => {
  const { data, error } = await crearClientePublico()
    .from("categories")
    .select("id, parent_id, nombre, slug, descripcion, schema_type, icono, orden, destacada")
    .eq("activa", true)
    .order("orden")
    .order("nombre");
  if (error) throw errorDeConsulta("No se pudieron cargar las categorías", error);

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
  if (error) throw errorDeConsulta("No se pudieron cargar los municipios", error);

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
  if (error) throw errorDeConsulta("No se pudieron cargar los departamentos", error);
  return data;
});

const COLUMNAS_NEGOCIO = `
  id, nombre, slug, descripcion, category_id, municipio_id, localidad, direccion,
  telefono, whatsapp, email_contacto, redes_sociales, horario, logo_path, plan,
  estado, aprobado_en, updated_at, calificacion_promedio, total_resenas,
  latitud, longitud, enlace_mapa,
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
  if (error) throw errorDeConsulta("No se pudo cargar el negocio", error);
  return data;
});

export async function buscarNegocios(params: {
  texto?: string | null;
  categoria?: string | null;
  ciudad?: string | null;
  limite?: number;
  desplazamiento?: number;
  orden?: "relevancia" | "recientes";
  /** Solo los abiertos en este momento (hora de Honduras). */
  abierto?: boolean;
}) {
  const { data, error } = await crearClientePublico().rpc("buscar_negocios", {
    p_texto: params.texto || undefined,
    p_categoria: params.categoria || undefined,
    p_ciudad: params.ciudad || undefined,
    p_limite: params.limite ?? 24,
    p_desplazamiento: params.desplazamiento ?? 0,
    p_orden: params.orden ?? "relevancia",
    p_abierto: params.abierto || undefined,
  });
  if (error) throw errorDeConsulta("Error en la búsqueda", error);
  return { negocios: data, total: data[0]?.total ?? 0 };
}

/** Conteo de negocios aprobados por categoría (padre e hija) y ciudad. */
export const obtenerResumen = cache(async (categoriaSlug?: string) => {
  const { data, error } = await crearClientePublico().rpc("resumen_directorio", {
    p_categoria: categoriaSlug,
  });
  if (error) throw errorDeConsulta("No se pudo cargar el resumen", error);
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
    if (error) throw errorDeConsulta("No se pudo generar el sitemap", error);
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

/** Slug vigente de un negocio publicado a partir de uno anterior (migración 014), o null. */
export async function obtenerSlugActual(slugViejo: string): Promise<string | null> {
  const { data, error } = await crearClientePublico().rpc("slug_actual", { p_slug: slugViejo });
  if (error) {
    console.error("[slug_actual]", error.message);
    return null;
  }
  return data ?? null;
}

export type ResenaPublica = {
  id: string;
  autor_nombre: string;
  calificacion: number;
  comentario: string | null;
  respuesta: string | null;
  created_at: string;
};

/** Reseñas publicadas más recientes de un negocio (migración 015). */
export const obtenerResenasPublicas = cache(async (negocioId: string, limite = RESENAS_POR_PAGINA): Promise<ResenaPublica[]> => {
  const { data, error } = await crearClientePublico()
    .from("business_reviews")
    .select("id, autor_nombre, calificacion, comentario, respuesta, created_at")
    .eq("business_id", negocioId)
    .eq("estado", "publicada")
    .order("created_at", { ascending: false })
    .limit(limite);
  if (error) throw errorDeConsulta("No se pudieron cargar las reseñas", error);
  return data;
});
