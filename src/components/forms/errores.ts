import type { FieldValues, Path, UseFormReturn } from "react-hook-form";

/** Muestra en el formulario los errores devueltos por una server action. */
export function aplicarErroresServidor<T extends FieldValues>(
  form: Pick<UseFormReturn<T>, "setError">,
  resultado: { error: string; campos?: Record<string, string> },
) {
  for (const [campo, mensaje] of Object.entries(resultado.campos ?? {})) {
    form.setError(campo as Path<T>, { type: "servidor", message: mensaje });
  }
  form.setError("root.servidor", { type: "servidor", message: resultado.error });
}
