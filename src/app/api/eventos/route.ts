import { z } from "zod";

import { esEvento } from "@/lib/eventos";
import { crearClientePublico } from "@/lib/supabase/publico";

// Recibe los eventos de la página pública de un negocio (visita y clics de
// contacto) con navigator.sendBeacon. Responde 204 siempre: es mejor perder un
// conteo que mostrarle un error a quien visita.

const BOTS = /bot|crawl|spider|slurp|facebookexternalhit|whatsapp|preview|headless|lighthouse/i;

export async function POST(request: Request) {
  if (BOTS.test(request.headers.get("user-agent") ?? "")) return new Response(null, { status: 204 });

  let cuerpo: unknown;
  try {
    cuerpo = await request.json();
  } catch {
    return new Response(null, { status: 204 });
  }
  const { negocioId, evento } = (cuerpo ?? {}) as { negocioId?: unknown; evento?: unknown };
  if (!z.uuid().safeParse(negocioId).success || !esEvento(evento)) return new Response(null, { status: 204 });

  const { error } = await crearClientePublico().rpc("registrar_evento", {
    p_business_id: negocioId as string,
    p_evento: evento,
  });
  if (error) console.error("[eventos]", error.message);
  return new Response(null, { status: 204 });
}
