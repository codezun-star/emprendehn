import "server-only";

import type { PostgrestError } from "@supabase/supabase-js";

import type { ResultadoAccion } from "@/lib/validaciones/comun";

/** Traduce errores de Postgres/PostgREST a mensajes para el usuario. */
export function errorDeBaseDeDatos(error: PostgrestError): ResultadoAccion<never> {
  // Errores de negocio lanzados por nuestros triggers (mensaje ya en español).
  const PROPIOS = [
    "limite_negocios", "limite_imagenes", "limite_reportes", "cuenta_admin",
    "resena_propia", "resena_no_publicado", "limite_resenas",
  ];
  if (PROPIOS.includes(error.hint ?? "")) {
    return { ok: false, error: error.message, codigo: error.hint };
  }
  switch (error.code) {
    case "42501":
      return { ok: false, error: "No tienes permiso para realizar esta acción.", codigo: error.code };
    case "23503":
      return { ok: false, error: "La categoría o la ciudad elegida no existe.", codigo: error.code };
    case "23505":
      return { ok: false, error: "Ya existe un registro con esos datos.", codigo: error.code };
    case "23514":
      return { ok: false, error: "Algún dato no tiene el formato correcto.", codigo: error.code };
    case "PGRST116":
      return { ok: false, error: "No se encontró el registro.", codigo: error.code };
    default:
      console.error("[supabase]", error);
      return { ok: false, error: "Ocurrió un error inesperado. Inténtalo de nuevo.", codigo: error.code };
  }
}

export const SIN_SESION: ResultadoAccion<never> = {
  ok: false,
  error: "Tu sesión expiró. Vuelve a ingresar.",
  codigo: "sin_sesion",
};
