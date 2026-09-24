"use client";

import { useEffect, useRef, useState } from "react";

// Columnas de visitas por día (una sola serie: el título la nombra, sin leyenda).
// Barras de ≤ 24 px con punta redondeada de 4 px, 2 px de aire entre barras,
// cuadrícula hairline y tooltip por barra. Los valores también están en la tabla.

type Punto = { dia: string; visitas: number };

const ALTO = 200;
const MARGEN = { arriba: 12, derecha: 4, abajo: 26, izquierda: 32 };
const COLOR_BARRA = "#1b6fa8"; // brand (validado contra el fondo blanco)
const COLOR_ACTIVA = "#0f3d5e"; // brand-dark
const COLOR_REJILLA = "#e1e8ed";

/** Techo y marcas "redondas" del eje (0, 5, 10… / 0, 20, 40…). */
function escala(maximo: number) {
  const bruto = Math.max(maximo, 4) / 4;
  const magnitud = 10 ** Math.floor(Math.log10(bruto));
  const paso = [1, 2, 5, 10].map((m) => m * magnitud).find((p) => p >= bruto) ?? 10 * magnitud;
  const techo = paso * Math.ceil(Math.max(maximo, 1) / paso);
  return { techo, marcas: Array.from({ length: techo / paso + 1 }, (_, i) => i * paso) };
}

const fechaCorta = new Intl.DateTimeFormat("es-HN", { day: "numeric", month: "short", timeZone: "UTC" });
const fechaLarga = new Intl.DateTimeFormat("es-HN", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
const aFecha = (dia: string) => new Date(`${dia}T12:00:00Z`);

export function GraficoVisitas({ datos }: { datos: Punto[] }) {
  const contenedor = useRef<HTMLDivElement>(null);
  const [ancho, setAncho] = useState(0);
  const [activo, setActivo] = useState<number | null>(null);

  useEffect(() => {
    const el = contenedor.current;
    if (!el) return;
    const observador = new ResizeObserver(([entrada]) => setAncho(Math.floor(entrada.contentRect.width)));
    observador.observe(el);
    return () => observador.disconnect();
  }, []);

  const { techo, marcas } = escala(Math.max(...datos.map((d) => d.visitas)));
  const anchoGrafico = Math.max(ancho - MARGEN.izquierda - MARGEN.derecha, 0);
  const altoGrafico = ALTO - MARGEN.arriba - MARGEN.abajo;
  const ranura = datos.length > 0 ? anchoGrafico / datos.length : 0;
  const barra = Math.max(Math.min(24, ranura - 2), 2);
  const y = (v: number) => MARGEN.arriba + altoGrafico - (v / techo) * altoGrafico;
  const etiquetasX = new Set([0, 7, 14, 21, datos.length - 1]);
  const puntoActivo = activo === null ? null : datos[activo];

  return (
    <div ref={contenedor} className="relative select-none" onPointerLeave={() => setActivo(null)}>
      {ancho > 0 && (
        <svg
          width={ancho}
          height={ALTO}
          role="img"
          aria-label={`Visitas por día en los últimos ${datos.length} días. Los valores están en la tabla de abajo.`}
        >
          {marcas.map((m) => (
            <g key={m}>
              <line x1={MARGEN.izquierda} x2={ancho - MARGEN.derecha} y1={y(m)} y2={y(m)} stroke={COLOR_REJILLA} strokeWidth={1} />
              <text x={MARGEN.izquierda - 6} y={y(m)} dy="0.32em" textAnchor="end" className="fill-ink/55 text-[11px] tabular-nums">
                {m.toLocaleString("es-HN")}
              </text>
            </g>
          ))}
          {datos.map((d, i) => {
            const x = MARGEN.izquierda + i * ranura + (ranura - barra) / 2;
            const tope = y(d.visitas);
            const alto = y(0) - tope;
            const radio = Math.min(4, alto, barra / 2);
            return (
              <g key={d.dia}>
                {d.visitas > 0 && (
                  <path
                    d={`M${x},${y(0)} V${tope + radio} Q${x},${tope} ${x + radio},${tope} H${x + barra - radio} Q${x + barra},${tope} ${x + barra},${tope + radio} V${y(0)} Z`}
                    fill={activo === i ? COLOR_ACTIVA : COLOR_BARRA}
                  />
                )}
                {etiquetasX.has(i) && (
                  <text
                    x={i === 0 ? x : i === datos.length - 1 ? x + barra : x + barra / 2}
                    y={ALTO - 8}
                    textAnchor={i === 0 ? "start" : i === datos.length - 1 ? "end" : "middle"}
                    className="fill-ink/55 text-[11px]"
                  >
                    {fechaCorta.format(aFecha(d.dia))}
                  </text>
                )}
                {/* Área sensible: toda la columna, más grande que la barra. */}
                <rect
                  x={MARGEN.izquierda + i * ranura}
                  y={MARGEN.arriba}
                  width={ranura}
                  height={altoGrafico}
                  fill="transparent"
                  onPointerEnter={() => setActivo(i)}
                />
              </g>
            );
          })}
        </svg>
      )}
      {puntoActivo && activo !== null && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-lg bg-white px-3 py-2 text-xs shadow-lg ring-1 ring-brand-dark/10"
          style={{
            left: Math.min(Math.max(MARGEN.izquierda + (activo + 0.5) * ranura, 60), ancho - 60),
            top: Math.max(y(puntoActivo.visitas) - 8, 40),
          }}
        >
          <p className="text-sm font-bold text-ink">
            {puntoActivo.visitas.toLocaleString("es-HN")} {puntoActivo.visitas === 1 ? "visita" : "visitas"}
          </p>
          <p className="text-ink/60">{fechaLarga.format(aFecha(puntoActivo.dia))}</p>
        </div>
      )}
    </div>
  );
}
