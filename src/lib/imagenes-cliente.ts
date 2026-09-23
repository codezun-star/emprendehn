// Procesamiento de imágenes en el navegador antes de subirlas:
// · redimensiona (máx. `maxLado` px) para ahorrar datos móviles y almacenamiento
// · convierte a WebP (JPEG si el navegador no sabe codificar WebP)
// · al redibujar en canvas se eliminan los metadatos EXIF (incluida la ubicación GPS)

// Sin HEIC a propósito: así iOS convierte automáticamente las fotos a JPEG al elegirlas.
export const TIPOS_ACEPTADOS = "image/jpeg,image/png,image/webp";
const MAX_BYTES_ORIGINAL = 25 * 1024 * 1024;

export type ImagenPreparada = {
  blob: Blob;
  ancho: number;
  alto: number;
  extension: "webp" | "jpg";
  contentType: "image/webp" | "image/jpeg";
};

function canvasABlob(canvas: HTMLCanvasElement, tipo: string, calidad: number) {
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, tipo, calidad));
}

export async function prepararImagen(archivo: File, maxLado = 1600): Promise<ImagenPreparada> {
  if (archivo.size > MAX_BYTES_ORIGINAL) {
    throw new Error("La imagen pesa demasiado (máximo 25 MB).");
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(archivo, { imageOrientation: "from-image" });
  } catch {
    throw new Error("No pudimos leer esta imagen. Usa una foto JPG, PNG o WebP.");
  }

  const escala = Math.min(1, maxLado / Math.max(bitmap.width, bitmap.height));
  const ancho = Math.max(1, Math.round(bitmap.width * escala));
  const alto = Math.max(1, Math.round(bitmap.height * escala));

  const canvas = document.createElement("canvas");
  canvas.width = ancho;
  canvas.height = alto;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Tu navegador no permite procesar imágenes.");
  ctx.drawImage(bitmap, 0, 0, ancho, alto);
  bitmap.close();

  const webp = await canvasABlob(canvas, "image/webp", 0.82);
  if (webp && webp.type === "image/webp") {
    return { blob: webp, ancho, alto, extension: "webp", contentType: "image/webp" };
  }
  const jpeg = await canvasABlob(canvas, "image/jpeg", 0.85);
  if (!jpeg) throw new Error("No pudimos procesar la imagen.");
  return { blob: jpeg, ancho, alto, extension: "jpg", contentType: "image/jpeg" };
}
