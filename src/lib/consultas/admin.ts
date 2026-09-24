import "server-only";

import { notFound } from "next/navigation";

import { crearClienteServidor } from "@/lib/supabase/server";
import type { Enums } from "@/types/database.types";

// Consultas del panel de administración. Usan la sesión del admin: RLS
// (is_admin) le permite ver negocios en cualquier estado y todos los perfiles.

export const POR_PAGINA_ADMIN = 30;

/** Pestañas del listado: los cuatro estados más la cola de cambios por revisar. */
export type VistaAdmin = Enums<"business_status"> | "cambios";

export async function contarNegociosPorEstado() {
  const supabase = await crearClienteServidor();
  const estados: Enums<"business_status">[] = ["pendiente", "aprobado", "rechazado", "suspendido"];
  const conteos = await Promise.all([
    ...estados.map(async (estado) => {
      const { count } = await supabase
        .from("businesses")
        .select("id", { count: "exact", head: true })
        .eq("estado", estado);
      return [estado, count ?? 0] as const;
    }),
    (async () => {
      const { count } = await supabase
        .from("businesses")
        .select("id", { count: "exact", head: true })
        .eq("estado", "aprobado")
        .not("cambios_por_revisar_desde", "is", null);
      return ["cambios", count ?? 0] as const;
    })(),
  ]);
  return Object.fromEntries(conteos) as Record<VistaAdmin, number>;
}

export async function listarNegociosAdmin({
  vista,
  q,
  pagina,
}: {
  vista: VistaAdmin;
  q?: string;
  pagina: number;
}) {
  const supabase = await crearClienteServidor();
  let consulta = supabase
    .from("businesses")
    .select(
      "id, nombre, slug, estado, plan, created_at, updated_at, category_id, municipio_id, cambios_por_revisar, cambios_por_revisar_desde, dueno:profiles(email, nombre_completo)",
      { count: "exact" },
    )
    .eq("estado", vista === "cambios" ? "aprobado" : vista);
  // Colas (pendientes y cambios): el más antiguo primero. Resto: más recientes.
  consulta =
    vista === "cambios"
      ? consulta.not("cambios_por_revisar_desde", "is", null).order("cambios_por_revisar_desde", { ascending: true })
      : consulta.order(vista === "pendiente" ? "created_at" : "updated_at", { ascending: vista === "pendiente" });
  consulta = consulta.range((pagina - 1) * POR_PAGINA_ADMIN, pagina * POR_PAGINA_ADMIN - 1);

  if (q) consulta = consulta.ilike("nombre", `%${q.replace(/[%_\\]/g, "\\$&")}%`);

  const { data, count, error } = await consulta;
  if (error) throw new Error(`No se pudieron cargar los negocios: ${error.message}`);
  return { negocios: data, total: count ?? 0 };
}

export async function obtenerNegocioAdmin(id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase
    .from("businesses")
    .select(
      "*, dueno:profiles(email, nombre_completo, telefono, created_at), imagenes:business_images(id, storage_path, alt_text, orden)",
    )
    .eq("id", id)
    .order("orden", { referencedTable: "business_images" })
    .maybeSingle();
  if (error) throw new Error(`No se pudo cargar el negocio: ${error.message}`);
  if (!data) notFound();
  return data;
}

export async function listarPlanes() {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.from("plans").select("code, nombre, max_imagenes").order("prioridad");
  if (error) throw new Error(`No se pudieron cargar los planes: ${error.message}`);
  return data;
}

/** Todas las categorías (también inactivas) con su número de negocios. */
export async function listarCategoriasAdmin() {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase
    .from("categories")
    .select("*, negocios:businesses(count)")
    .order("orden")
    .order("nombre");
  if (error) throw new Error(`No se pudieron cargar las categorías: ${error.message}`);
  return data.map(({ negocios, ...c }) => ({ ...c, totalNegocios: negocios[0]?.count ?? 0 }));
}

export async function contarReportesAbiertos() {
  const supabase = await crearClienteServidor();
  const { count } = await supabase
    .from("business_reports")
    .select("id", { count: "exact", head: true })
    .eq("estado", "abierto");
  return count ?? 0;
}

export async function listarReportes(estado: "abierto" | "resuelto") {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase
    .from("business_reports")
    .select("id, motivo, detalle, contacto, estado, created_at, resuelto_en, negocio:businesses(id, nombre, slug, estado)")
    .eq("estado", estado)
    .order(estado === "abierto" ? "created_at" : "resuelto_en", { ascending: estado === "abierto" })
    .limit(100);
  if (error) throw new Error(`No se pudieron cargar los reportes: ${error.message}`);
  return data;
}
