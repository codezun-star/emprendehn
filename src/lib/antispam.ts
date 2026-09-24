// Protección contra bots sin fricción para las personas (ver components/forms/antispam.tsx):
// · campo trampa invisible: las personas no lo ven; los bots lo llenan.
// · tiempo mínimo: nadie llena un formulario en un par de segundos.
// · CAPTCHA opcional (Cloudflare Turnstile invisible): solo si se define
//   NEXT_PUBLIC_TURNSTILE_SITE_KEY; lo valida Supabase Auth.

export type Antispam = {
  /** Valor del campo trampa. Si trae algo, es un bot. */
  trampa: string;
  /** Milisegundos desde que se mostró el formulario. */
  tiempo: number;
  /** Token de Turnstile (solo si el CAPTCHA está activo). */
  captcha?: string;
};

export type VeredictoAntispam = "ok" | "bot" | "muy-rapido";

/**
 * "bot": responder como si todo saliera bien, sin hacer nada.
 * "muy-rapido": pedir que lo intente de nuevo (puede ser una persona con autocompletado).
 */
export function revisarAntispam(a: Antispam | undefined, tiempoMinimoMs: number): VeredictoAntispam {
  if (!a || typeof a.trampa !== "string" || typeof a.tiempo !== "number") return "bot";
  if (a.trampa.length > 0) return "bot";
  return a.tiempo < tiempoMinimoMs ? "muy-rapido" : "ok";
}

export const MENSAJE_MUY_RAPIDO = "Revisa los datos y vuelve a intentarlo en unos segundos.";
