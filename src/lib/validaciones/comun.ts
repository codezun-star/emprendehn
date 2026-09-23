import { z } from "zod";

/** Campo de texto opcional: "" -> null; si hay valor, se valida con `schema`. */
export function opcional<T extends z.ZodType<unknown, string>>(schema: T) {
  return z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : v))
    .pipe(schema.nullable());
}

/** Resultado estándar de las server actions. */
export type ResultadoAccion<T = undefined> =
  | { ok: true; datos?: T; mensaje?: string }
  | { ok: false; error: string; campos?: Record<string, string>; codigo?: string };

/** Convierte los issues de Zod en { campo: mensaje } (primer error por campo). */
export function erroresPorCampo(error: z.ZodError): Record<string, string> {
  const campos: Record<string, string> = {};
  for (const issue of error.issues) {
    const clave = issue.path.join(".");
    if (clave && !campos[clave]) campos[clave] = issue.message;
  }
  return campos;
}

export function falloValidacion(error: z.ZodError): ResultadoAccion<never> {
  return {
    ok: false,
    error: "Revisa los campos marcados.",
    campos: erroresPorCampo(error),
  };
}
