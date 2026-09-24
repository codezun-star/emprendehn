import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import type { Metadata } from "next";

import { GraficoVisitas } from "@/components/panel/grafico-visitas";
import { Alerta } from "@/components/ui/alerta";
import { requerirUsuario } from "@/lib/auth";
import { obtenerEstadisticas, obtenerMiNegocio, type TotalesEventos } from "@/lib/consultas/panel";

export const metadata: Metadata = { title: "Estadísticas" };

const INDICADORES: { clave: keyof TotalesEventos; etiqueta: string }[] = [
  { clave: "visitas", etiqueta: "Visitas a tu página" },
  { clave: "whatsapp", etiqueta: "Clics en WhatsApp" },
  { clave: "llamadas", etiqueta: "Clics en Llamar" },
  { clave: "mapa", etiqueta: "Clics en Google Maps" },
  { clave: "redes", etiqueta: "Clics en redes y web" },
];

const fechaTabla = new Intl.DateTimeFormat("es-HN", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });

/** "+25 %" frente a los 30 días anteriores (null si no hay con qué comparar). */
function variacion(actual: number, anterior: number): number | null {
  if (anterior === 0) return null;
  return Math.round(((actual - anterior) / anterior) * 100);
}

export default async function PaginaEstadisticas({ params }: PageProps<"/panel/negocios/[id]/estadisticas">) {
  const { id } = await params;
  const sesion = await requerirUsuario(`/panel/negocios/${id}/estadisticas`);
  const negocio = await obtenerMiNegocio(sesion.userId, id);
  const { dias, actual, anterior } = await obtenerEstadisticas(negocio.id);
  const contactos = actual.whatsapp + actual.llamadas;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-brand-dark">Últimos 30 días</h2>
        <p className="text-sm text-ink/65">
          Solo cuentan las visitas a tu página publicada; tus propias vistas previas no suman.
        </p>
      </div>

      {negocio.estado !== "aprobado" && (
        <Alerta tono="info">Las estadísticas empiezan a contar cuando tu negocio esté publicado.</Alerta>
      )}

      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {INDICADORES.map(({ clave, etiqueta }) => {
          const cambio = variacion(actual[clave], anterior[clave]);
          return (
            <li key={clave} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-brand-dark/10">
              <p className="text-xs font-medium text-ink/65">{etiqueta}</p>
              <p className="mt-1 text-2xl font-bold text-ink">{actual[clave].toLocaleString("es-HN")}</p>
              {cambio !== null && cambio !== 0 && (
                <p className="mt-1 text-xs">
                  <span
                    className={`inline-flex items-center gap-0.5 whitespace-nowrap font-semibold ${cambio > 0 ? "text-emerald-700" : "text-red-700"}`}
                  >
                    {cambio > 0 ? <ArrowUpRight className="size-3.5" aria-hidden /> : <ArrowDownRight className="size-3.5" aria-hidden />}
                    {cambio > 0 ? "+" : ""}
                    {cambio} %
                  </span>{" "}
                  <span className="text-ink/55">vs. 30 días antes</span>
                </p>
              )}
            </li>
          );
        })}
      </ul>

      <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-brand-dark/10">
        <h3 className="font-bold text-brand-dark">Visitas por día</h3>
        {actual.visitas === 0 ? (
          <p className="py-10 text-center text-sm text-ink/60">
            Todavía no hay visitas en este periodo. Comparte el enlace de tu negocio por WhatsApp y en tus redes
            para empezar a recibirlas.
          </p>
        ) : (
          <div className="mt-4">
            <GraficoVisitas datos={dias.map(({ dia, visitas }) => ({ dia, visitas }))} />
          </div>
        )}

        <details className="mt-4 border-t border-brand-dark/10 pt-3 text-sm">
          <summary className="cursor-pointer font-semibold text-brand">Ver tabla por día</summary>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[520px] text-left tabular-nums">
              <thead className="text-xs uppercase tracking-wide text-ink/55">
                <tr>
                  <th className="py-2 pr-4">Día</th>
                  <th className="py-2 pr-4 text-right">Visitas</th>
                  <th className="py-2 pr-4 text-right">WhatsApp</th>
                  <th className="py-2 pr-4 text-right">Llamar</th>
                  <th className="py-2 pr-4 text-right">Maps</th>
                  <th className="py-2 text-right">Redes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-dark/5">
                {[...dias].reverse().map((d) => (
                  <tr key={d.dia}>
                    <td className="py-1.5 pr-4">{fechaTabla.format(new Date(`${d.dia}T12:00:00Z`))}</td>
                    <td className="py-1.5 pr-4 text-right">{d.visitas}</td>
                    <td className="py-1.5 pr-4 text-right">{d.whatsapp}</td>
                    <td className="py-1.5 pr-4 text-right">{d.llamadas}</td>
                    <td className="py-1.5 pr-4 text-right">{d.mapa}</td>
                    <td className="py-1.5 text-right">{d.redes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      </section>

      {actual.visitas > 0 && (
        <p className="text-sm text-ink/70">
          Por cada 100 visitas recibiste {Math.round((contactos / actual.visitas) * 100)} clics en WhatsApp o
          Llamar.
        </p>
      )}
    </div>
  );
}
