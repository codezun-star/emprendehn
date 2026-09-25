// Scroll con criterio: suave solo si la persona no pidió reducir el movimiento,
// y siempre llevando el foco al lugar al que se llevó la vista.

export function movimientoReducido(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function comportamientoScroll(): ScrollBehavior {
  return movimientoReducido() ? "auto" : "smooth";
}

/**
 * Lleva la vista al primer campo con error dentro de `contenedor` (en el orden de
 * la página), lo centra en la pantalla y le pone el foco. Espera a que React pinte
 * los errores recién marcados. Sirve para formularios largos: el botón de guardar
 * está abajo y el error puede estar arriba.
 */
export function irAlPrimerError(contenedor: HTMLElement | null) {
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      // Controles marcados (aria-invalid) o mensajes de error de un campo (<p role="alert">).
      // El resumen general (<div role="alert">) no cuenta: ya está arriba.
      const error = contenedor?.querySelector<HTMLElement>('[aria-invalid="true"], p[role="alert"]');
      if (!error) return;
      const control =
        error.matches("input, select, textarea")
          ? error
          : error.closest("div, fieldset")?.querySelector<HTMLElement>("input:not([type=hidden]), select, textarea, button");
      const visible = (el: HTMLElement | null | undefined): el is HTMLElement => !!el && el.getClientRects().length > 0;
      const destino = visible(control) ? control : error;
      destino.scrollIntoView({ behavior: comportamientoScroll(), block: "center" });
      if (visible(control)) control.focus({ preventScroll: true });
    }),
  );
}

/**
 * Centra horizontalmente un elemento dentro de su contenedor con scroll (pestañas
 * en el celular) sin mover la página.
 */
export function centrarEnFila(elemento: HTMLElement | null, suave = false) {
  const fila = elemento?.parentElement?.closest<HTMLElement>("[data-fila-desplazable]") ?? elemento?.parentElement;
  if (!elemento || !fila || fila.scrollWidth <= fila.clientWidth) return;
  const izquierda = elemento.offsetLeft - fila.offsetLeft - (fila.clientWidth - elemento.offsetWidth) / 2;
  fila.scrollTo({ left: Math.max(0, izquierda), behavior: suave ? comportamientoScroll() : "auto" });
}
