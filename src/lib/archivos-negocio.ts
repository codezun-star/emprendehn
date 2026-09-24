import "server-only";

import { BUCKET_IMAGENES } from "@/lib/storage";
import { crearClienteServidor } from "@/lib/supabase/server";

/**
 * Borra todos los archivos (fotos y logo) de la carpeta de un negocio en Storage
 * (mejor esfuerzo). Llamarla ANTES de borrar la fila: las políticas de Storage
 * verifican que el negocio exista y sea del usuario.
 */
export async function eliminarArchivosNegocio(negocioId: string) {
  const supabase = await crearClienteServidor();
  const { data: archivos } = await supabase.storage.from(BUCKET_IMAGENES).list(negocioId, { limit: 100 });
  if (archivos?.length) {
    await supabase.storage.from(BUCKET_IMAGENES).remove(archivos.map((a) => `${negocioId}/${a.name}`));
  }
}
