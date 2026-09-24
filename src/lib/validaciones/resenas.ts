import { z } from "zod";

export const resenaSchema = z.object({
  calificacion: z.number("Elige de 1 a 5 estrellas").int().min(1, "Elige de 1 a 5 estrellas").max(5),
  comentario: z.string().trim().max(1000, "Máximo 1000 caracteres"),
});

export const respuestaSchema = z.string().trim().max(1000, "Máximo 1000 caracteres");

export type ResenaInput = z.input<typeof resenaSchema>;
