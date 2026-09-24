"use server";

import { z } from "zod";

import { obtenerSesion } from "@/lib/auth";
import { avisoPorCambio, programarAvisoAdmin } from "@/lib/correos/avisos-admin";
import { revalidarDirectorio } from "@/lib/revalidacion";
import { BUCKET_IMAGENES } from "@/lib/storage";
import { crearClienteServidor } from "@/lib/supabase/server";
import { falloValidacion, type ResultadoAccion } from "@/lib/validaciones/comun";

import { errorDeBaseDeDatos, SIN_SESION } from "./errores-db";

// Flujo de subida: el navegador redimensiona la foto y la sube directo a
// Storage (protegido por políticas RLS de Storage); luego llama a
// registrarImagen para crear la fila (el trigger aplica el límite del plan).

const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";

const registroSchema = z
  .object({
    negocioId: z.uuid(),
    ruta: z.string().regex(new RegExp(`^${UUID}/${UUID}\\.(webp|jpg)$`)),
    ancho: z.number().int().positive().max(10000),
    alto: z.number().int().positive().max(10000),
  })
  .refine((d) => d.ruta.startsWith(`${d.negocioId}/`), { error: "Ruta inválida" });

const logoSchema = z
  .object({
    negocioId: z.uuid(),
    ruta: z.string().regex(new RegExp(`^${UUID}/logo-${UUID}\\.(webp|jpg)$`)),
  })
  .refine((d) => d.ruta.startsWith(`${d.negocioId}/`), { error: "Ruta inválida" });

type Contexto = Awaited<ReturnType<typeof contexto>>;

async function contexto() {
  const sesion = await obtenerSesion();
  const supabase = await crearClienteServidor();
  return { sesion, supabase };
}

/** Negocio propio (o null). Incluye lo necesario para revalidar. */
async function negocioPropio({ sesion, supabase }: Contexto, negocioId: string) {
  if (!sesion) return null;
  const { data } = await supabase
    .from("businesses")
    .select("id, nombre, slug, category_id, municipio_id, estado, logo_path, cambios_por_revisar_desde")
    .eq("id", negocioId)
    .eq("owner_id", sesion.userId)
    .maybeSingle();
  return data;
}

async function revalidarSiPublicado(negocio: { estado: string; slug: string; category_id: string; municipio_id: number }) {
  if (negocio.estado === "aprobado") await revalidarDirectorio(negocio);
}

/**
 * Tras una foto o un logo nuevo: avisa al admin si el negocio volvió a revisión
 * o si es el primer cambio sin revisar de un negocio publicado (migración 010).
 */
async function avisarSiCambio(ctx: Contexto, antes: NonNullable<Awaited<ReturnType<typeof negocioPropio>>>) {
  const { data: despues } = await ctx.supabase
    .from("businesses")
    .select("estado, cambios_por_revisar, cambios_por_revisar_desde")
    .eq("id", antes.id)
    .maybeSingle();
  if (!despues) return;
  const tipo = avisoPorCambio(antes, despues);
  if (tipo === "reenviado") programarAvisoAdmin({ tipo, negocioId: antes.id, nombre: antes.nombre });
  if (tipo === "cambios") {
    programarAvisoAdmin({ tipo, negocioId: antes.id, nombre: antes.nombre, cambios: despues.cambios_por_revisar });
  }
}

export async function registrarImagen(input: z.input<typeof registroSchema>): Promise<ResultadoAccion> {
  const ctx = await contexto();
  if (!ctx.sesion) return SIN_SESION;
  const parsed = registroSchema.safeParse(input);
  if (!parsed.success) return falloValidacion(parsed.error);
  const { negocioId, ruta, ancho, alto } = parsed.data;

  const negocio = await negocioPropio(ctx, negocioId);
  if (!negocio) return { ok: false, error: "Negocio no encontrado." };

  const { error } = await ctx.supabase
    .from("business_images")
    .insert({ business_id: negocioId, storage_path: ruta, ancho, alto });
  if (error) {
    // No dejar archivos huérfanos (p. ej. si se superó el límite del plan).
    await ctx.supabase.storage.from(BUCKET_IMAGENES).remove([ruta]);
    return errorDeBaseDeDatos(error);
  }

  await revalidarSiPublicado(negocio);
  await avisarSiCambio(ctx, negocio);
  return { ok: true };
}

async function imagenPropia(ctx: Contexto, imagenId: string) {
  if (!ctx.sesion || !z.uuid().safeParse(imagenId).success) return null;
  const { data } = await ctx.supabase
    .from("business_images")
    .select("id, business_id, storage_path, orden")
    .eq("id", imagenId)
    .maybeSingle();
  if (!data) return null;
  const negocio = await negocioPropio(ctx, data.business_id);
  return negocio ? { imagen: data, negocio } : null;
}

export async function eliminarImagen(imagenId: string): Promise<ResultadoAccion> {
  const ctx = await contexto();
  if (!ctx.sesion) return SIN_SESION;
  const propia = await imagenPropia(ctx, imagenId);
  if (!propia) return { ok: false, error: "Imagen no encontrada." };

  // Primero la fila (si falla, la foto sigue visible y consistente), luego el archivo.
  const { error } = await ctx.supabase.from("business_images").delete().eq("id", imagenId);
  if (error) return errorDeBaseDeDatos(error);
  await ctx.supabase.storage.from(BUCKET_IMAGENES).remove([propia.imagen.storage_path]);

  await revalidarSiPublicado(propia.negocio);
  return { ok: true };
}

export async function moverImagen(imagenId: string, direccion: -1 | 1): Promise<ResultadoAccion> {
  const ctx = await contexto();
  if (!ctx.sesion) return SIN_SESION;
  const propia = await imagenPropia(ctx, imagenId);
  if (!propia) return { ok: false, error: "Imagen no encontrada." };

  const { data: imagenes, error: errorLectura } = await ctx.supabase
    .from("business_images")
    .select("id, orden")
    .eq("business_id", propia.negocio.id)
    .order("orden")
    .order("created_at");
  if (errorLectura) return errorDeBaseDeDatos(errorLectura);

  const indice = imagenes.findIndex((i) => i.id === imagenId);
  const destino = indice + (direccion === 1 ? 1 : -1);
  if (indice < 0 || destino < 0 || destino >= imagenes.length) return { ok: true };

  // Normaliza el orden (0..n-1) aplicando el intercambio.
  const nuevoOrden = imagenes.map((i) => i.id);
  [nuevoOrden[indice], nuevoOrden[destino]] = [nuevoOrden[destino], nuevoOrden[indice]];
  for (const [orden, id] of nuevoOrden.entries()) {
    const { error } = await ctx.supabase.from("business_images").update({ orden }).eq("id", id);
    if (error) return errorDeBaseDeDatos(error);
  }

  await revalidarSiPublicado(propia.negocio);
  return { ok: true };
}

export async function actualizarTextoAlternativo(imagenId: string, texto: string): Promise<ResultadoAccion> {
  const ctx = await contexto();
  if (!ctx.sesion) return SIN_SESION;
  const parsed = z.string().trim().max(200, "Máximo 200 caracteres").safeParse(texto);
  if (!parsed.success) return falloValidacion(parsed.error);
  const propia = await imagenPropia(ctx, imagenId);
  if (!propia) return { ok: false, error: "Imagen no encontrada." };

  const { error } = await ctx.supabase
    .from("business_images")
    .update({ alt_text: parsed.data || null })
    .eq("id", imagenId);
  if (error) return errorDeBaseDeDatos(error);

  await revalidarSiPublicado(propia.negocio);
  return { ok: true };
}

export async function actualizarLogo(input: z.input<typeof logoSchema>): Promise<ResultadoAccion> {
  const ctx = await contexto();
  if (!ctx.sesion) return SIN_SESION;
  const parsed = logoSchema.safeParse(input);
  if (!parsed.success) return falloValidacion(parsed.error);

  const negocio = await negocioPropio(ctx, parsed.data.negocioId);
  if (!negocio) {
    await ctx.supabase.storage.from(BUCKET_IMAGENES).remove([parsed.data.ruta]);
    return { ok: false, error: "Negocio no encontrado." };
  }

  const { error } = await ctx.supabase
    .from("businesses")
    .update({ logo_path: parsed.data.ruta })
    .eq("id", negocio.id);
  if (error) return errorDeBaseDeDatos(error);
  if (negocio.logo_path) await ctx.supabase.storage.from(BUCKET_IMAGENES).remove([negocio.logo_path]);

  await revalidarSiPublicado(negocio);
  await avisarSiCambio(ctx, negocio);
  return { ok: true };
}

export async function quitarLogo(negocioId: string): Promise<ResultadoAccion> {
  const ctx = await contexto();
  if (!ctx.sesion) return SIN_SESION;
  const negocio = await negocioPropio(ctx, negocioId);
  if (!negocio) return { ok: false, error: "Negocio no encontrado." };
  if (!negocio.logo_path) return { ok: true };

  const { error } = await ctx.supabase.from("businesses").update({ logo_path: null }).eq("id", negocio.id);
  if (error) return errorDeBaseDeDatos(error);
  await ctx.supabase.storage.from(BUCKET_IMAGENES).remove([negocio.logo_path]);

  await revalidarSiPublicado(negocio);
  return { ok: true };
}
