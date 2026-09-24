"use client";

import { useEffect, useState } from "react";

import { ahoraEnHonduras } from "@/components/directorio/estado-abierto";
import { DIAS, describirTurnos, type Horario } from "@/lib/horario";
import { cn } from "@/lib/utils";

/** Índice del día de hoy en Honduras (0 = lunes), calculado en el navegador: la página es estática. */
function useHoy(): number | null {
  const [hoy, setHoy] = useState<number | null>(null);
  useEffect(() => {
    const actualizar = () => {
      const { indiceDia } = ahoraEnHonduras();
      setHoy(indiceDia >= 0 ? indiceDia : null);
    };
    actualizar();
    const intervalo = setInterval(actualizar, 60_000);
    return () => clearInterval(intervalo);
  }, []);
  return hoy;
}

/** Semana completa, con el día de hoy resaltado. */
export function TablaHorario({ horario }: { horario: Horario }) {
  const hoy = useHoy();
  return (
    <table className="w-full text-sm">
      <tbody>
        {DIAS.map(({ clave, nombre }, i) => {
          const esHoy = i === hoy;
          const cerrado = horario[clave].length === 0;
          return (
            <tr key={clave} className={cn("border-b border-ink/5 last:border-0", esHoy && "bg-brand-light font-semibold")}>
              <th scope="row" className="py-2.5 pl-3 pr-4 text-left font-medium text-ink/80">
                {nombre}
                {esHoy && <span className="ml-2 text-xs font-semibold text-brand">Hoy</span>}
              </th>
              <td className={cn("py-2.5 pr-3 text-right", cerrado ? "text-ink/45" : "text-ink/80")}>
                {describirTurnos(horario[clave])}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

/** "Hoy: 8:00 a. m. – 5:00 p. m." para la franja de datos rápidos. */
export function HorarioHoy({ horario }: { horario: Horario }) {
  const hoy = useHoy();
  if (hoy === null) return <>Ver horario</>;
  return <>Hoy: {describirTurnos(horario[DIAS[hoy].clave])}</>;
}
