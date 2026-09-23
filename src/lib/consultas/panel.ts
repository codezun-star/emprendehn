import "server-only";

import { notFound } from "next/navigation";
import { cache } from "react";

import { crearClienteServidor } from "@/lib/supabase/server";

// Consultas del panel del emprendedor: cliente con sesión; RLS limita a los
// negocios propios y además filtramos por owner_id explícitamente.

export async function obtenerMisNegocios(userId: string) {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase
    .from("businesses")
    .select(
      "id, nombre, slug, estado, motivo_estado, plan, category_id, municipio_id, logo_path, created_at, updated_at, imagenes:business_images(count)",
    )
    .eq("owner_id", userId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(`No se pudieron cargar tus negocios: ${error.message}`);
  return data.map(({ imagenes, ...negocio }) => ({
    ...negocio,
    totalImagenes: imagenes[0]?.count ?? 0,
  }));
}

/** Negocio propio con plan e imágenes. Memoizado por request (layout + página). */
export const obtenerMiNegocio = cache(async (userId: string, id: string) => {
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase
    .from("businesses")
    .select("*, plan_info:plans(max_imagenes, nombre), imagenes:business_images(id, storage_path, alt_text, orden, ancho, alto)")
    .eq("id", id)
    .eq("owner_id", userId)
    .order("orden", { referencedTable: "business_images" })
    .maybeSingle();
  if (error) throw new Error(`No se pudo cargar el negocio: ${error.message}`);
  if (!data) notFound();
  return data;
});

export type MiNegocio = Awaited<ReturnType<typeof obtenerMiNegocio>>;
