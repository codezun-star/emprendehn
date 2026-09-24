// Eventos que se cuentan en las estadísticas de cada negocio (migración 012).
export const EVENTOS = ["visita", "whatsapp", "llamada", "mapa", "redes"] as const;
export type Evento = (typeof EVENTOS)[number];

export function esEvento(valor: unknown): valor is Evento {
  return typeof valor === "string" && (EVENTOS as readonly string[]).includes(valor);
}
