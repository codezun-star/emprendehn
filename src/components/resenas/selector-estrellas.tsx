"use client";

import { Star } from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/utils";

const ETIQUETAS = ["", "Muy malo", "Malo", "Regular", "Bueno", "Excelente"];

/** Grupo de radios accesible con forma de estrellas (teclado: flechas). */
export function SelectorEstrellas({
  valor,
  onChange,
  nombre = "calificacion",
}: {
  valor: number;
  onChange: (valor: number) => void;
  nombre?: string;
}) {
  const [encima, setEncima] = useState(0);
  const mostrado = encima || valor;

  return (
    <div className="flex items-center gap-3">
      <div role="radiogroup" aria-label="Calificación" className="flex" onPointerLeave={() => setEncima(0)}>
        {[1, 2, 3, 4, 5].map((i) => (
          <label key={i} className="cursor-pointer p-0.5" onPointerEnter={() => setEncima(i)}>
            <input
              type="radio"
              name={nombre}
              value={i}
              checked={valor === i}
              onChange={() => onChange(i)}
              className="peer sr-only"
              aria-label={`${i} ${i === 1 ? "estrella" : "estrellas"}: ${ETIQUETAS[i]}`}
            />
            <Star
              aria-hidden
              className={cn(
                "size-8 rounded peer-focus-visible:ring-2 peer-focus-visible:ring-brand",
                i <= mostrado ? "fill-accent text-accent" : "fill-transparent text-ink/25",
              )}
            />
          </label>
        ))}
      </div>
      <span className="text-sm font-medium text-ink/70">{ETIQUETAS[mostrado]}</span>
    </div>
  );
}
