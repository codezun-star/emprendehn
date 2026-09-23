import { parsearHorario } from "@/lib/horario";
import { formatearTelefono } from "@/lib/telefono";
import type { NegocioInput } from "@/lib/validaciones/negocio";
import type { Json, Tables } from "@/types/database.types";

function texto(redes: Json, clave: string): string {
  if (redes && typeof redes === "object" && !Array.isArray(redes)) {
    const valor = (redes as Record<string, Json | undefined>)[clave];
    if (typeof valor === "string") return valor;
  }
  return "";
}

/** Valores iniciales del formulario a partir de la fila de la base de datos. */
export function valoresDesdeNegocio(n: Tables<"businesses">): NegocioInput {
  return {
    nombre: n.nombre,
    category_id: n.category_id,
    descripcion: n.descripcion,
    municipio_id: String(n.municipio_id),
    localidad: n.localidad ?? "",
    direccion: n.direccion ?? "",
    telefono: n.telefono ? formatearTelefono(n.telefono) : "",
    whatsapp: n.whatsapp ? formatearTelefono(n.whatsapp) : "",
    email_contacto: n.email_contacto ?? "",
    redes_sociales: {
      facebook: texto(n.redes_sociales, "facebook"),
      instagram: texto(n.redes_sociales, "instagram"),
      tiktok: texto(n.redes_sociales, "tiktok"),
      sitio_web: texto(n.redes_sociales, "sitio_web"),
    },
    horario: parsearHorario(n.horario),
  };
}
