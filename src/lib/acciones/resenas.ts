"use server";

import { z } from "zod";

import { obtenerSesion } from "@/lib/auth";
import { programarAvisoAdmin } from "@/lib/correos/avisos-admin";
import { revalidarDirectorio } from "@/lib/revalidacion";
import { crearClienteServidor } from "@/lib/supabase/server";
import { falloValidacion, type ResultadoAccion } from "@/lib/validaciones/comun";
import { resenaSchema, respuestaSchema, type ResenaInput } from "@/lib/validaciones/resenas";

import { errorDeBaseDeDatos, SIN_SESION } from "./errores-db";

// Reseñas (migración 015). Las reglas de quién puede hacer qué viven en la base
// de datos (trigger guardián + RLS); aquí se valida y se revalidan las páginas.

type Cliente = Awaited<ReturnType<typeof crearClienteServidor>>;

/** La página del negocio y los listados muestran la calificación: se regeneran. */
async function revalidarNegocio(supabase: Cliente, negocioId: string) {
  const { data } = await supabase
    .from("businesses")
    .select("slug, category_id, municipio_id, estado")
    .eq("id", negocioId)
    .maybeSingle();
  if (data?.estado === "aprobado") await revalidarDirectorio(data);
}

/** Crea o actualiza la reseña propia sobre un negocio. */
export async function guardarResena(negocioId: string, input: ResenaInput): Promise<ResultadoAccion> {
  const sesion = await obtenerSesion();
  if (!sesion) return SIN_SESION;
  if (!z.uuid().safeParse(negocioId).success) return { ok: false, error: "Negocio no encontrado." };
  const parsed = resenaSchema.safeParse(input);
  if (!parsed.success) return falloValidacion(parsed.error);
  const { calificacion, comentario } = parsed.data;

  const supabase = await crearClienteServidor();
  const { data: existente } = await supabase
    .from("business_reviews")
    .select("id")
    .eq("business_id", negocioId)
    .eq("user_id", sesion.userId)
    .maybeSingle();

  const { error } = existente
    ? await supabase.from("business_reviews").update({ calificacion, comentario: comentario || null }).eq("id", existente.id)
    : await supabase.from("business_reviews").insert({ business_id: negocioId, calificacion, comentario: comentario || null });
  if (error) return errorDeBaseDeDatos(error);

  await revalidarNegocio(supabase, negocioId);
  return { ok: true, mensaje: existente ? "Tu reseña se actualizó." : "¡Gracias! Tu reseña ya está publicada." };
}

export async function eliminarMiResena(negocioId: string): Promise<ResultadoAccion> {
  const sesion = await obtenerSesion();
  if (!sesion) return SIN_SESION;
  if (!z.uuid().safeParse(negocioId).success) return { ok: false, error: "Negocio no encontrado." };

  const supabase = await crearClienteServidor();
  const { error } = await supabase
    .from("business_reviews")
    .delete()
    .eq("business_id", negocioId)
    .eq("user_id", sesion.userId);
  if (error) return errorDeBaseDeDatos(error);

  await revalidarNegocio(supabase, negocioId);
  return { ok: true, mensaje: "Tu reseña se eliminó." };
}

/** Dueño: responde (o borra su respuesta si queda vacía). */
export async function responderResena(resenaId: string, respuesta: string): Promise<ResultadoAccion> {
  const sesion = await obtenerSesion();
  if (!sesion) return SIN_SESION;
  if (!z.uuid().safeParse(resenaId).success) return { ok: false, error: "Reseña no encontrada." };
  const parsed = respuestaSchema.safeParse(respuesta);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Respuesta inválida." };

  const supabase = await crearClienteServidor();
  const { data, error } = await supabase
    .from("business_reviews")
    .update({ respuesta: parsed.data || null })
    .eq("id", resenaId)
    .select("business_id")
    .maybeSingle();
  if (error) return errorDeBaseDeDatos(error);
  if (!data) return { ok: false, error: "Reseña no encontrada." };

  await revalidarNegocio(supabase, data.business_id);
  return { ok: true, mensaje: parsed.data ? "Respuesta publicada." : "Respuesta eliminada." };
}

/** Dueño: avisa al admin de una reseña abusiva (el admin decide si la oculta). */
export async function reportarResena(resenaId: string): Promise<ResultadoAccion> {
  const sesion = await obtenerSesion();
  if (!sesion) return SIN_SESION;
  if (!z.uuid().safeParse(resenaId).success) return { ok: false, error: "Reseña no encontrada." };

  const supabase = await crearClienteServidor();
  const { data, error } = await supabase
    .from("business_reviews")
    .update({ reportada: true })
    .eq("id", resenaId)
    .select("business_id, calificacion, comentario, negocio:businesses(nombre)")
    .maybeSingle();
  if (error) return errorDeBaseDeDatos(error);
  if (!data) return { ok: false, error: "Reseña no encontrada." };

  programarAvisoAdmin({
    tipo: "resena",
    negocioId: data.business_id,
    nombre: data.negocio?.nombre ?? "Negocio",
    calificacion: data.calificacion,
    comentario: data.comentario,
  });
  return { ok: true, mensaje: "Gracias. El equipo de EmprendeHN revisará la reseña." };
}
