import "server-only";

import { notFound } from "next/navigation";
import { cache } from "react";

import { RESENAS_POR_PAGINA } from "@/lib/constantes";
import { crearClienteServidor } from "@/lib/supabase/server";

// Consultas del panel del emprendedor: cliente con sesión; RLS limita a los
// negocios propios y además filtramos por owner_id explícitamente.

export async function obtenerMisNegocios(userId: string) {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase
    .from("businesses")
    .select(
      "id, nombre, slug, estado, motivo_estado, plan, category_id, municipio_id, logo_path, cambios_por_revisar, created_at, updated_at, imagenes:business_images(count)",
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

// ---------------------------------------------------------------------------
// Estadísticas (migración 012). Los días se cuentan en hora de Honduras.
// ---------------------------------------------------------------------------

/** "2026-09-24" de hoy en Honduras, menos `dias` días. */
function diaHonduras(dias = 0): string {
  const fecha = new Date(Date.now() - dias * 86_400_000);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Tegucigalpa" }).format(fecha);
}

export type TotalesEventos = { visitas: number; whatsapp: number; llamadas: number; mapa: number; redes: number };

const CEROS: TotalesEventos = { visitas: 0, whatsapp: 0, llamadas: 0, mapa: 0, redes: 0 };

function sumar(filas: TotalesEventos[]): TotalesEventos {
  return filas.reduce(
    (t, f) => ({
      visitas: t.visitas + f.visitas,
      whatsapp: t.whatsapp + f.whatsapp,
      llamadas: t.llamadas + f.llamadas,
      mapa: t.mapa + f.mapa,
      redes: t.redes + f.redes,
    }),
    CEROS,
  );
}

/** Últimos 30 días (con los días sin datos en cero) y los 30 anteriores, para comparar. */
export async function obtenerEstadisticas(negocioId: string) {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase
    .from("business_stats_daily")
    .select("dia, visitas, whatsapp, llamadas, mapa, redes")
    .eq("business_id", negocioId)
    .gte("dia", diaHonduras(59))
    .order("dia");
  if (error) throw new Error(`No se pudieron cargar las estadísticas: ${error.message}`);

  const porDia = new Map(data.map((f) => [f.dia, f]));
  const dias = Array.from({ length: 30 }, (_, i) => {
    const dia = diaHonduras(29 - i);
    return { dia, ...(porDia.get(dia) ?? CEROS) };
  });
  const inicio = dias[0].dia;
  return {
    dias,
    actual: sumar(dias),
    anterior: sumar(data.filter((f) => f.dia < inicio)),
  };
}

/** Totales de los últimos 30 días por negocio (para la lista de "Mis negocios"). */
export async function obtenerResumenEstadisticas(negocioIds: string[]) {
  const resumen = new Map<string, TotalesEventos>();
  if (negocioIds.length === 0) return resumen;
  const supabase = await crearClienteServidor();
  const { data } = await supabase
    .from("business_stats_daily")
    .select("business_id, visitas, whatsapp, llamadas, mapa, redes")
    .in("business_id", negocioIds)
    .gte("dia", diaHonduras(29));
  for (const fila of data ?? []) {
    resumen.set(fila.business_id, sumar([resumen.get(fila.business_id) ?? CEROS, fila]));
  }
  return resumen;
}

// ---------------------------------------------------------------------------
// Reseñas (migración 015). RLS deja al dueño ver todas las de sus negocios.
// ---------------------------------------------------------------------------

export async function obtenerResenasDeMiNegocio(negocioId: string, pagina = 1) {
  const supabase = await crearClienteServidor();
  const { data, count, error } = await supabase
    .from("business_reviews")
    .select("id, autor_nombre, calificacion, comentario, respuesta, respondida_en, estado, reportada, created_at", {
      count: "exact",
    })
    .eq("business_id", negocioId)
    .order("created_at", { ascending: false })
    .range((pagina - 1) * RESENAS_POR_PAGINA, pagina * RESENAS_POR_PAGINA - 1);
  if (error) throw new Error(`No se pudieron cargar las reseñas: ${error.message}`);
  return { resenas: data, total: count ?? 0 };
}

/** Reseñas publicadas sin respuesta, por negocio (para avisar en "Mis negocios"). */
export async function contarResenasSinResponder(negocioIds: string[]) {
  const conteo = new Map<string, number>();
  if (negocioIds.length === 0) return conteo;
  const supabase = await crearClienteServidor();
  const { data } = await supabase
    .from("business_reviews")
    .select("business_id")
    .in("business_id", negocioIds)
    .eq("estado", "publicada")
    .is("respuesta", null);
  for (const fila of data ?? []) conteo.set(fila.business_id, (conteo.get(fila.business_id) ?? 0) + 1);
  return conteo;
}
