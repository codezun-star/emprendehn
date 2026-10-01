// "Instalar la app": en Android/Chrome el navegador avisa con `beforeinstallprompt`
// que el sitio se puede instalar; guardamos ese evento para abrir el diálogo
// nativo desde el menú. En el iPhone no existe ese evento: se explica cómo
// agregarla desde el botón Compartir. Ya instalada (o abierta como app), no se ofrece.

type EventoInstalacion = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

/** Cómo se puede instalar en este dispositivo. */
export type FormaInstalacion = "dialogo" | "ios" | "no";

let evento: EventoInstalacion | null = null;
let instalada = false;
const oyentes = new Set<() => void>();

function avisar() {
  oyentes.forEach((oyente) => oyente());
}

/** Se llama una vez, antes de hidratar (instrumentation-client.ts): el evento puede llegar temprano. */
export function escucharInstalacion() {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    evento = e as EventoInstalacion;
    avisar();
  });
  window.addEventListener("appinstalled", () => {
    evento = null;
    instalada = true;
    avisar();
  });
}

/** Abierta desde el ícono de la app (sin la barra del navegador). */
export function enModoApp(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function esIOS(): boolean {
  // El iPad con iPadOS se presenta como Mac: se distingue por la pantalla táctil.
  return /iP(hone|od|ad)/.test(navigator.userAgent) || (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1);
}

export function formaInstalacion(): FormaInstalacion {
  if (instalada || enModoApp()) return "no";
  if (evento) return "dialogo";
  return esIOS() ? "ios" : "no";
}

export function suscribirInstalacion(oyente: () => void) {
  oyentes.add(oyente);
  return () => oyentes.delete(oyente);
}

/** Abre el diálogo de instalación del navegador. true si la persona aceptó. */
export async function instalarApp(): Promise<boolean> {
  if (!evento) return false;
  const actual = evento;
  // El evento sirve una sola vez.
  evento = null;
  try {
    await actual.prompt();
    return (await actual.userChoice).outcome === "accepted";
  } catch {
    return false;
  } finally {
    avisar();
  }
}
