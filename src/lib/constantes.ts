/** Correo de contacto público (páginas legales, contacto) y destino por defecto de los avisos al admin. */
export const CORREO_CONTACTO = "codezun@gmail.com";

/** Fecha de la última actualización de Privacidad y Términos (cámbiala al editarlos). */
export const ACTUALIZACION_LEGALES = "24 de septiembre de 2026";

/** Debe coincidir con max_negocios_por_cuenta en supabase/migrations/006_businesses.sql */
export const MAX_NEGOCIOS_POR_CUENTA = 3;

/** Negocios que muestra una página de categoría (el resto, en /buscar paginado). */
export const LIMITE_LISTADO = 60;

/** Resultados por página en /buscar. */
export const RESULTADOS_POR_PAGINA = 24;

/**
 * Campos que un negocio publicado cambió y el admin aún no revisa
 * (columna cambios_por_revisar, ver supabase/migrations/010_revision_de_cambios.sql).
 */
export const ETIQUETAS_CAMBIOS: Record<string, string> = {
  nombre: "Nombre",
  descripcion: "Descripción",
  categoria: "Categoría",
  ciudad: "Ciudad",
  logo: "Logo",
  redes: "Redes sociales",
  fotos: "Fotos nuevas",
};

export function describirCambios(cambios: string[]): string {
  return cambios.map((c) => ETIQUETAS_CAMBIOS[c] ?? c).join(", ");
}
