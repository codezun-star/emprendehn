"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { obtenerSesion } from "@/lib/auth";
import { revalidarDirectorio } from "@/lib/revalidacion";
import { BUCKET_IMAGENES } from "@/lib/storage";
import { crearClienteServidor } from "@/lib/supabase/server";
import { falloValidacion, type ResultadoAccion } from "@/lib/validaciones/comun";
import { limpiarRedes, negocioSchema, type NegocioInput, type NegocioOutput } from "@/lib/validaciones/negocio";

import { errorDeBaseDeDatos, SIN_SESION } from "./errores-db";

const idSchema = z.uuid();

function aFila(d: NegocioOutput) {
  return {
    nombre: d.nombre,
    descripcion: d.descripcion,
    category_id: d.category_id,
    municipio_id: d.municipio_id,
    localidad: d.localidad,
    direccion: d.direccion,
    telefono: d.telefono,
    whatsapp: d.whatsapp,
    email_contacto: d.email_contacto,
    redes_sociales: limpiarRedes(d.redes_sociales),
    horario: d.horario,
  };
}

export async function crearNegocio(input: NegocioInput): Promise<ResultadoAccion> {
  const sesion = await obtenerSesion();
  if (!sesion) return SIN_SESION;

  const parsed = negocioSchema.safeParse(input);
  if (!parsed.success) return falloValidacion(parsed.error);

  const supabase = await crearClienteServidor();
  const { data, error } = await supabase
    .from("businesses")
    // slug, estado, plan y owner los fija la base de datos (triggers).
    .insert({ ...aFila(parsed.data), owner_id: sesion.userId, slug: "" })
    .select("id")
    .single();
  if (error) return errorDeBaseDeDatos(error);

  redirect(`/panel/negocios/${data.id}/galeria?nuevo=1`);
}

export async function actualizarNegocio(id: string, input: NegocioInput): Promise<ResultadoAccion> {
  const sesion = await obtenerSesion();
  if (!sesion) return SIN_SESION;
  if (!idSchema.safeParse(id).success) return { ok: false, error: "Negocio no encontrado." };

  const parsed = negocioSchema.safeParse(input);
  if (!parsed.success) return falloValidacion(parsed.error);

  const supabase = await crearClienteServidor();
  const { data: anterior, error: errorLectura } = await supabase
    .from("businesses")
    .select("slug, category_id, municipio_id, estado")
    .eq("id", id)
    .eq("owner_id", sesion.userId)
    .maybeSingle();
  if (errorLectura) return errorDeBaseDeDatos(errorLectura);
  if (!anterior) return { ok: false, error: "Negocio no encontrado." };

  const { data: nuevo, error } = await supabase
    .from("businesses")
    .update(aFila(parsed.data))
    .eq("id", id)
    .eq("owner_id", sesion.userId)
    .select("slug, category_id, municipio_id, estado")
    .single();
  if (error) return errorDeBaseDeDatos(error);

  if (anterior.estado === "aprobado") await revalidarDirectorio(anterior, nuevo);

  // Rechazado o suspendido: el trigger lo devuelve a revisión (migración 010).
  const mensaje =
    nuevo.estado === "pendiente" && anterior.estado !== "pendiente"
      ? "Cambios guardados. Tu negocio volvió a revisión."
      : nuevo.estado === "aprobado"
        ? "Cambios guardados y publicados."
        : "Cambios guardados.";
  return { ok: true, mensaje };
}

export async function eliminarNegocio(id: string): Promise<ResultadoAccion> {
  const sesion = await obtenerSesion();
  if (!sesion) return SIN_SESION;
  if (!idSchema.safeParse(id).success) return { ok: false, error: "Negocio no encontrado." };

  const supabase = await crearClienteServidor();
  const { data: negocio } = await supabase
    .from("businesses")
    .select("slug, category_id, municipio_id, estado")
    .eq("id", id)
    .eq("owner_id", sesion.userId)
    .maybeSingle();
  if (!negocio) return { ok: false, error: "Negocio no encontrado." };

  // Primero los archivos: las políticas de Storage verifican que el negocio
  // exista y sea tuyo, así que después de borrar la fila ya no se podría.
  await eliminarCarpeta(id);

  const { error } = await supabase.from("businesses").delete().eq("id", id).eq("owner_id", sesion.userId);
  if (error) return errorDeBaseDeDatos(error);

  if (negocio.estado === "aprobado") await revalidarDirectorio(negocio);
  redirect("/panel?aviso=negocio-eliminado");
}

/** Borra todos los archivos de la carpeta del negocio en Storage (mejor esfuerzo). */
async function eliminarCarpeta(negocioId: string) {
  const supabase = await crearClienteServidor();
  const { data: archivos } = await supabase.storage.from(BUCKET_IMAGENES).list(negocioId, { limit: 100 });
  if (archivos?.length) {
    await supabase.storage.from(BUCKET_IMAGENES).remove(archivos.map((a) => `${negocioId}/${a.name}`));
  }
}
