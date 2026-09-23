import { z } from "zod";

import { opcional } from "./comun";

export const ESTADOS = ["pendiente", "aprobado", "rechazado", "suspendido"] as const;

export const moderacionSchema = z
  .object({
    estado: z.enum(ESTADOS),
    motivo: z.string().trim().max(500, "Máximo 500 caracteres"),
  })
  .superRefine((d, ctx) => {
    if ((d.estado === "rechazado" || d.estado === "suspendido") && d.motivo.length < 10) {
      ctx.addIssue({
        code: "custom",
        path: ["motivo"],
        message: "Explica al emprendedor el motivo (mínimo 10 caracteres): lo verá en su panel.",
      });
    }
  });

export const planSchema = z.object({
  plan: z.string().regex(/^[a-z_]+$/, "Plan inválido"),
});

// Tipos schema.org permitidos para categorías (subtipos de LocalBusiness).
export const TIPOS_SCHEMA = [
  "LocalBusiness", "Store", "FoodEstablishment", "Restaurant", "Bakery", "CafeOrCoffeeShop",
  "FastFoodRestaurant", "HealthAndBeautyBusiness", "BeautySalon", "HairSalon", "NailSalon", "DaySpa",
  "HomeAndConstructionBusiness", "Plumber", "Electrician", "GeneralContractor", "HVACBusiness",
  "HousePainter", "Locksmith", "MovingCompany", "ConvenienceStore", "ClothingStore", "HardwareStore",
  "MobilePhoneStore", "ElectronicsStore", "Florist", "FurnitureStore", "BookStore", "PetStore",
  "MedicalBusiness", "MedicalClinic", "Dentist", "Pharmacy", "Optician", "AutomotiveBusiness",
  "AutoRepair", "AutoWash", "AutoPartsStore", "TireShop", "ProfessionalService", "Attorney",
  "AccountingService", "RealEstateAgent", "FinancialService", "EntertainmentBusiness", "InternetCafe",
  "LodgingBusiness", "Hotel", "TravelAgency", "ChildCare", "SportsActivityLocation",
] as const;

export const categoriaSchema = z.object({
  nombre: z.string().trim().min(2, "Mínimo 2 caracteres").max(80, "Máximo 80 caracteres"),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .max(80, "Máximo 80 caracteres")
    .regex(/^([a-z0-9]+(-[a-z0-9]+)*)?$/, "Solo minúsculas, números y guiones (ej. comida-tipica)"),
  parent_id: opcional(z.uuid("Categoría padre inválida")),
  descripcion: opcional(z.string().max(1000, "Máximo 1000 caracteres")),
  schema_type: z.enum(TIPOS_SCHEMA, "Elige un tipo de schema.org"),
  icono: opcional(z.string().regex(/^[a-z0-9-]+$/)),
  orden: z
    .string()
    .regex(/^\d{1,3}$/, "Número entre 0 y 999")
    .transform(Number),
  destacada: z.boolean(),
  activa: z.boolean(),
});

export type CategoriaInput = z.input<typeof categoriaSchema>;
export type CategoriaOutput = z.output<typeof categoriaSchema>;
