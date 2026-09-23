import { twMerge } from "tailwind-merge";

/**
 * Une clases de Tailwind ignorando valores falsy. Si dos clases chocan
 * (p. ej. "w-full" y "w-32"), gana la última.
 */
export function cn(...clases: Array<string | false | null | undefined>): string {
  return twMerge(clases.filter(Boolean).join(" "));
}

/**
 * Evita redirecciones abiertas: solo acepta rutas internas ("/panel", no
 * "//evil.com" ni "https://…").
 */
export function rutaSegura(ruta: string | null | undefined, porDefecto = "/panel"): string {
  if (!ruta || !ruta.startsWith("/") || ruta.startsWith("//") || ruta.startsWith("/\\")) {
    return porDefecto;
  }
  return ruta;
}

/** Recorta un texto a `max` caracteres sin cortar palabras. */
export function resumir(texto: string, max = 160): string {
  const limpio = texto.replace(/\s+/g, " ").trim();
  if (limpio.length <= max) return limpio;
  const corte = limpio.slice(0, max - 1);
  const ultimoEspacio = corte.lastIndexOf(" ");
  return `${corte.slice(0, ultimoEspacio > max * 0.6 ? ultimoEspacio : corte.length).trimEnd()}…`;
}

export function formatearFecha(iso: string): string {
  return new Intl.DateTimeFormat("es-HN", { dateStyle: "medium" }).format(new Date(iso));
}
