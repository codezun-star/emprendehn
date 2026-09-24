import { z } from "zod";

import { DIAS, type ClaveDia } from "@/lib/horario";
import { dentroDeHonduras, esEnlaceGoogleMaps, redondear } from "@/lib/mapas";
import { extraerDigitosHN } from "@/lib/telefono";

import { opcional } from "./comun";

// Esquema compartido: el formulario lo usa para validar en el navegador y la
// server action lo vuelve a aplicar sobre los mismos valores crudos (nunca
// confiar en el cliente). Las transformaciones normalizan para la base de datos.

const telefono = z.string().transform((v, ctx) => {
  const digitos = extraerDigitosHN(v);
  if (!digitos) {
    ctx.addIssue({ code: "custom", message: "Número hondureño de 8 dígitos, ej. 9999-8888" });
    return z.NEVER;
  }
  return `+504${digitos}`;
});

/** Acepta "facebook.com/minegocio" o "https://…" y devuelve una URL https válida. */
const url = z.string().transform((v, ctx) => {
  const conProtocolo = /^https?:\/\//i.test(v) ? v : `https://${v}`;
  try {
    const u = new URL(conProtocolo);
    if (!u.hostname.includes(".")) throw new Error();
    return u.toString();
  } catch {
    ctx.addIssue({ code: "custom", message: "Enlace inválido" });
    return z.NEVER;
  }
});

/** "@usuario" o URL -> URL completa de la red social. */
function redSocial(base: string) {
  return z.string().transform((v, ctx) => {
    if (/^@?[\w.]{1,50}$/.test(v)) return `${base}${v.replace(/^@/, "")}`;
    const resultado = url.safeParse(v);
    if (!resultado.success) {
      ctx.addIssue({ code: "custom", message: "Escribe tu usuario (@minegocio) o el enlace" });
      return z.NEVER;
    }
    return resultado.data;
  });
}

/** Coordenada del pin ("" = sin ubicación exacta). */
const coordenada = z
  .string()
  .trim()
  .transform((v, ctx) => {
    if (v === "") return null;
    const n = Number(v);
    if (!Number.isFinite(n)) {
      ctx.addIssue({ code: "custom", message: "Coordenada inválida" });
      return z.NEVER;
    }
    return redondear(n);
  });

const hora = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Hora inválida");

const turno = z
  .object({ abre: hora, cierra: hora })
  .refine((t) => t.abre !== t.cierra, { error: "La hora de cierre debe ser distinta a la de apertura" });

const horario = z
  .object({
    ...(Object.fromEntries(DIAS.map(({ clave }) => [clave, z.array(turno).max(3)])) as Record<
      ClaveDia,
      z.ZodArray<typeof turno>
    >),
    nota: z.string().trim().max(200, "Máximo 200 caracteres").optional(),
  })
  .nullable();

export const negocioSchema = z
  .object({
    nombre: z
      .string()
      .trim()
      .min(2, "Escribe el nombre del negocio")
      .max(100, "Máximo 100 caracteres"),
    category_id: z.uuid("Elige una categoría"),
    descripcion: z
      .string()
      .trim()
      .min(30, "Cuenta un poco más: mínimo 30 caracteres")
      .max(3000, "Máximo 3000 caracteres"),
    municipio_id: z
      .string()
      .regex(/^\d+$/, "Elige la ciudad o municipio")
      .transform(Number),
    localidad: opcional(z.string().max(100, "Máximo 100 caracteres")),
    direccion: opcional(z.string().max(300, "Máximo 300 caracteres")),
    telefono: opcional(telefono),
    whatsapp: opcional(telefono),
    email_contacto: opcional(z.email("Correo electrónico inválido").max(254)),
    redes_sociales: z.object({
      facebook: opcional(redSocial("https://www.facebook.com/")),
      instagram: opcional(redSocial("https://www.instagram.com/")),
      tiktok: opcional(redSocial("https://www.tiktok.com/@")),
      sitio_web: opcional(url),
    }),
    horario,
    latitud: coordenada,
    longitud: coordenada,
    enlace_mapa: opcional(
      z.string().refine(esEnlaceGoogleMaps, "Pega un enlace de Google Maps (https://maps.app.goo.gl/… o https://www.google.com/maps/…)"),
    ),
  })
  .superRefine((d, ctx) => {
    if ((d.latitud === null) !== (d.longitud === null)) {
      ctx.addIssue({ code: "custom", path: ["latitud"], message: "Coloca el pin en el mapa" });
    } else if (d.latitud !== null && d.longitud !== null && !dentroDeHonduras({ lat: d.latitud, lng: d.longitud })) {
      ctx.addIssue({ code: "custom", path: ["latitud"], message: "El pin debe estar dentro de Honduras" });
    }
    if (!d.telefono && !d.whatsapp) {
      ctx.addIssue({
        code: "custom",
        path: ["telefono"],
        message: "Agrega al menos un teléfono o WhatsApp para que te contacten",
      });
    }
  });

export type NegocioInput = z.input<typeof negocioSchema>;
export type NegocioOutput = z.output<typeof negocioSchema>;

/** Quita las redes vacías para guardar un jsonb limpio. */
export function limpiarRedes(redes: NegocioOutput["redes_sociales"]): Record<string, string> {
  return Object.fromEntries(
    Object.entries(redes).filter((par): par is [string, string] => typeof par[1] === "string"),
  );
}
