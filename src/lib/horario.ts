import type { Json } from "@/types/database.types";

// Formato guardado en businesses.horario (jsonb):
// { "lun": [{ "abre": "08:00", "cierra": "17:00" }], ..., "dom": [], "nota": "…" }
// Día ausente o [] = cerrado. horario = null = "no especificado".

export const DIAS = [
  { clave: "lun", nombre: "Lunes", schemaOrg: "Monday" },
  { clave: "mar", nombre: "Martes", schemaOrg: "Tuesday" },
  { clave: "mie", nombre: "Miércoles", schemaOrg: "Wednesday" },
  { clave: "jue", nombre: "Jueves", schemaOrg: "Thursday" },
  { clave: "vie", nombre: "Viernes", schemaOrg: "Friday" },
  { clave: "sab", nombre: "Sábado", schemaOrg: "Saturday" },
  { clave: "dom", nombre: "Domingo", schemaOrg: "Sunday" },
] as const;

export type ClaveDia = (typeof DIAS)[number]["clave"];
export type Turno = { abre: string; cierra: string };
export type Horario = Record<ClaveDia, Turno[]> & { nota?: string };

const HORA = /^([01]\d|2[0-3]):[0-5]\d$/;

export function horarioVacio(): Horario {
  return { lun: [], mar: [], mie: [], jue: [], vie: [], sab: [], dom: [], nota: "" };
}

/** Lee de forma defensiva el JSON de la base de datos. */
export function parsearHorario(valor: Json | null | undefined): Horario | null {
  if (!valor || typeof valor !== "object" || Array.isArray(valor)) return null;
  const horario = horarioVacio();
  for (const { clave } of DIAS) {
    const turnos = (valor as Record<string, Json | undefined>)[clave];
    if (Array.isArray(turnos)) {
      horario[clave] = turnos.flatMap((t) => {
        if (t && typeof t === "object" && !Array.isArray(t)) {
          const { abre, cierra } = t as Record<string, Json | undefined>;
          if (typeof abre === "string" && typeof cierra === "string" && HORA.test(abre) && HORA.test(cierra)) {
            return [{ abre, cierra }];
          }
        }
        return [];
      });
    }
  }
  const nota = (valor as Record<string, Json | undefined>).nota;
  horario.nota = typeof nota === "string" ? nota : "";
  return horario;
}

/** "13:30" -> "1:30 p. m." */
export function formatearHora(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const sufijo = h < 12 ? "a. m." : "p. m.";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${sufijo}`;
}

export function describirTurnos(turnos: Turno[]): string {
  if (turnos.length === 0) return "Cerrado";
  return turnos
    .map((t) =>
      t.abre === "00:00" && t.cierra === "23:59"
        ? "Abierto 24 horas"
        : `${formatearHora(t.abre)} – ${formatearHora(t.cierra)}`,
    )
    .join(", ");
}

export function tieneAlgunTurno(horario: Horario | null): boolean {
  return !!horario && DIAS.some(({ clave }) => horario[clave].length > 0);
}

/** Convierte al formato schema.org OpeningHoursSpecification, agrupando días iguales. */
export function aOpeningHoursSpecification(horario: Horario) {
  const grupos = new Map<string, { opens: string; closes: string; dias: string[] }>();
  for (const { clave, schemaOrg } of DIAS) {
    for (const turno of horario[clave]) {
      const llave = `${turno.abre}-${turno.cierra}`;
      const grupo = grupos.get(llave) ?? { opens: turno.abre, closes: turno.cierra, dias: [] };
      grupo.dias.push(`https://schema.org/${schemaOrg}`);
      grupos.set(llave, grupo);
    }
  }
  return [...grupos.values()].map((g) => ({
    "@type": "OpeningHoursSpecification",
    dayOfWeek: g.dias,
    opens: g.opens,
    closes: g.closes,
  }));
}
