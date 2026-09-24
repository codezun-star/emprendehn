"use server";

import { z } from "zod";

import { MENSAJE_MUY_RAPIDO, revisarAntispam, type Antispam } from "@/lib/antispam";
import { programarAvisoAdmin } from "@/lib/correos/avisos-admin";
import { crearClientePublico } from "@/lib/supabase/publico";
import { falloValidacion, type ResultadoAccion } from "@/lib/validaciones/comun";
import { ETIQUETAS_MOTIVO_REPORTE, reporteSchema, type ReporteInput } from "@/lib/validaciones/reportes";

import { errorDeBaseDeDatos } from "./errores-db";

/** Cualquier visitante (con o sin cuenta) puede reportar un negocio publicado. */
export async function reportarNegocio(
  negocioId: string,
  input: ReporteInput,
  antispam: Antispam,
): Promise<ResultadoAccion> {
  if (!z.uuid().safeParse(negocioId).success) return { ok: false, error: "Negocio no encontrado." };
  const parsed = reporteSchema.safeParse(input);
  if (!parsed.success) return falloValidacion(parsed.error);
  const { motivo, detalle, contacto } = parsed.data;

  const veredicto = revisarAntispam(antispam, 3000);
  const gracias: ResultadoAccion = { ok: true, mensaje: "Gracias por avisarnos. Revisaremos este negocio." };
  if (veredicto === "bot") return gracias;
  if (veredicto === "muy-rapido") return { ok: false, error: MENSAJE_MUY_RAPIDO };

  const supabase = crearClientePublico();
  const { data: esPrimero, error } = await supabase.rpc("reportar_negocio", {
    p_business_id: negocioId,
    p_motivo: motivo,
    p_detalle: detalle || undefined,
    p_contacto: contacto || undefined,
  });
  if (error) {
    if (error.code === "P0002") return { ok: false, error: "Este negocio ya no está publicado." };
    return errorDeBaseDeDatos(error);
  }

  // Solo el primer reporte abierto de cada negocio avisa al admin.
  if (esPrimero) {
    const { data: negocio } = await supabase.from("businesses").select("nombre").eq("id", negocioId).maybeSingle();
    programarAvisoAdmin({
      tipo: "reporte",
      negocioId,
      nombre: negocio?.nombre ?? "Negocio",
      motivo: ETIQUETAS_MOTIVO_REPORTE[motivo],
      detalle: detalle || null,
    });
  }
  return gracias;
}
