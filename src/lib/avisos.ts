// Avisos que llegan en la URL después de una redirección del servidor
// (`?aviso=clave`) y se muestran como toast (components/ui/aviso-url.tsx).
// Una server action que redirige no puede mostrar un toast por sí misma.

export type AvisoUrl = { tipo: "exito" | "info"; titulo: string; descripcion?: string };

export const AVISOS_URL = {
  "cuenta-confirmada": {
    tipo: "exito",
    titulo: "¡Tu cuenta está confirmada!",
    descripcion: "Ya puedes registrar tu negocio.",
  },
  "contrasena-actualizada": { tipo: "exito", titulo: "Tu contraseña se actualizó" },
  "negocio-eliminado": { tipo: "info", titulo: "El negocio fue eliminado" },
  "categoria-guardada": { tipo: "exito", titulo: "Categoría guardada" },
  "categoria-eliminada": { tipo: "info", titulo: "Categoría eliminada" },
  "sesion-cerrada": { tipo: "info", titulo: "Cerraste sesión", descripcion: "¡Vuelve pronto!" },
  "sesiones-cerradas": {
    tipo: "exito",
    titulo: "Cerraste la sesión en todos tus dispositivos",
    descripcion: "Vuelve a ingresar en este.",
  },
} satisfies Record<string, AvisoUrl>;

export type ClaveAviso = keyof typeof AVISOS_URL;

/** `ruta?aviso=clave` conservando la query que ya tuviera la ruta. */
export function conAviso(ruta: string, clave: ClaveAviso): string {
  return `${ruta}${ruta.includes("?") ? "&" : "?"}aviso=${clave}`;
}
