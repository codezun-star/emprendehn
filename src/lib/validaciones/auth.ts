import { z } from "zod";

const email = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, "Escribe tu correo electrónico")
  .pipe(z.email("Correo electrónico inválido"));

const password = z
  .string()
  .min(8, "La contraseña debe tener al menos 8 caracteres")
  .max(72, "La contraseña no puede tener más de 72 caracteres");

export const registroSchema = z
  .object({
    nombre_completo: z
      .string()
      .trim()
      .min(2, "Escribe tu nombre")
      .max(120, "Máximo 120 caracteres"),
    email,
    password,
    confirmar: z.string(),
  })
  .refine((d) => d.password === d.confirmar, {
    path: ["confirmar"],
    error: "Las contraseñas no coinciden",
  });

export const ingresoSchema = z.object({
  email,
  password: z.string().min(1, "Escribe tu contraseña"),
  siguiente: z.string().optional(),
});

export const recuperacionSchema = z.object({ email });

export const nuevaContrasenaSchema = z
  .object({ password, confirmar: z.string() })
  .refine((d) => d.password === d.confirmar, {
    path: ["confirmar"],
    error: "Las contraseñas no coinciden",
  });

export type RegistroInput = z.input<typeof registroSchema>;
export type IngresoInput = z.input<typeof ingresoSchema>;
export type RecuperacionInput = z.input<typeof recuperacionSchema>;
export type NuevaContrasenaInput = z.input<typeof nuevaContrasenaSchema>;
