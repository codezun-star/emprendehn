import { twMerge } from "tailwind-merge";

/**
 * Une clases de Tailwind ignorando valores falsy. Si dos clases chocan
 * (p. ej. "w-full" y "w-32"), gana la última.
 */
export function cn(...clases: Array<string | false | null | undefined>): string {
  return twMerge(clases.filter(Boolean).join(" "));
}

/**
 * Evita redirecciones abiertas: solo acepta rutas internas ("/panel?x=1").
 * Rechaza "//evil.com", "/\evil.com", "https://…" y los trucos con caracteres
 * de control: el navegador borra tabs y saltos de línea de las URLs, así que
 * "/\t/evil.com" terminaría siendo "//evil.com".
 */
export function rutaSegura(ruta: string | null | undefined, porDefecto = "/panel"): string {
  const interna = (r: string) => /^\/(?![/\\])/.test(r) && !/[\p{Cc}\\]/u.test(r);
  if (!ruta || ruta.length > 2000 || !interna(ruta)) return porDefecto;
  // Última red: resuelta contra un origen cualquiera, debe seguir en ese origen
  // y la ruta ya normalizada tampoco puede empezar con "//" ("/..//evil.com").
  const base = "https://emprendehn.invalid";
  try {
    const url = new URL(ruta, base);
    const normalizada = url.pathname + url.search + url.hash;
    return url.origin === base && interna(normalizada) ? normalizada : porDefecto;
  } catch {
    return porDefecto;
  }
}

/** Recorta un texto a `max` caracteres sin cortar palabras. */
export function resumir(texto: string, max = 160): string {
  const limpio = texto.replace(/\s+/g, " ").trim();
  if (limpio.length <= max) return limpio;
  const corte = limpio.slice(0, max - 1);
  const ultimoEspacio = corte.lastIndexOf(" ");
  return `${corte.slice(0, ultimoEspacio > max * 0.6 ? ultimoEspacio : corte.length).trimEnd()}…`;
}

/** Número de página desde la URL (?pagina=3): entero de 1 a 1000; cualquier otra cosa es 1. */
export function numeroDePagina(valor: string | string[] | undefined): number {
  const n = Number.parseInt((Array.isArray(valor) ? valor[0] : valor) ?? "", 10);
  return Number.isInteger(n) && n >= 1 ? Math.min(n, 1000) : 1;
}

export function totalDePaginas(total: number, porPagina: number): number {
  return Math.max(1, Math.ceil(total / porPagina));
}

export function formatearFecha(iso: string): string {
  return new Intl.DateTimeFormat("es-HN", { dateStyle: "medium" }).format(new Date(iso));
}
