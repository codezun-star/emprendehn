import { SUPABASE_URL } from "@/lib/env";

export const BUCKET_IMAGENES = "business-images";

/** URL pública (CDN de Supabase) de un archivo del bucket de imágenes. */
export function urlImagen(ruta: string): string {
  const segura = ruta.split("/").map(encodeURIComponent).join("/");
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET_IMAGENES}/${segura}`;
}
