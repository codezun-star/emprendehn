import { z } from "zod";

export const MOTIVOS_REPORTE = [
  "informacion_falsa",
  "no_existe",
  "estafa",
  "contenido_indebido",
  "duplicado",
  "otro",
] as const;

export type MotivoReporte = (typeof MOTIVOS_REPORTE)[number];

/** Debe coincidir con el CHECK de business_reports.motivo (migración 011). */
export const ETIQUETAS_MOTIVO_REPORTE: Record<MotivoReporte, string> = {
  informacion_falsa: "Datos falsos o incorrectos (teléfono, dirección…)",
  no_existe: "El negocio cerró o no existe",
  estafa: "Posible estafa o fraude",
  contenido_indebido: "Fotos o contenido inapropiado",
  duplicado: "Está publicado más de una vez",
  otro: "Otro motivo",
};

export const reporteSchema = z
  .object({
    motivo: z.enum(MOTIVOS_REPORTE, "Elige un motivo"),
    detalle: z.string().trim().max(1000, "Máximo 1000 caracteres"),
    contacto: z.union([z.literal(""), z.string().trim().toLowerCase().pipe(z.email("Correo electrónico inválido"))]),
  })
  .superRefine((d, ctx) => {
    if (d.motivo === "otro" && d.detalle.length < 10) {
      ctx.addIssue({ code: "custom", path: ["detalle"], message: "Cuéntanos qué pasa (mínimo 10 caracteres)." });
    }
  });

export type ReporteInput = z.input<typeof reporteSchema>;
