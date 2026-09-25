"use client";

import { useEffect, useRef, useState } from "react";

import { Boton } from "@/components/ui/boton";
import { RESENAS_POR_PAGINA } from "@/lib/constantes";
import type { ResenaPublica } from "@/lib/consultas/directorio";
import { crearClienteNavegador } from "@/lib/supabase/client";

import { ItemResena } from "./item-resena";

/**
 * "Ver más reseñas" en la página del negocio. La página es estática (ISR) con
 * las más recientes; las siguientes se piden desde el navegador de a
 * RESENAS_POR_PAGINA (RLS solo deja leer las publicadas).
 */
export function MasResenas({ negocioId, cargadas, total }: { negocioId: string; cargadas: number; total: number }) {
  const [extra, setExtra] = useState<ResenaPublica[]>([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(false);
  const [agotadas, setAgotadas] = useState(false);
  const mostradas = cargadas + extra.length;
  const lista = useRef<HTMLUListElement>(null);
  const primeraNueva = useRef<number | null>(null);

  // Teclado y lectores de pantalla siguen leyendo desde la primera reseña nueva;
  // la vista no se mueve (preventScroll).
  useEffect(() => {
    const indice = primeraNueva.current;
    if (indice === null) return;
    primeraNueva.current = null;
    const item = lista.current?.children[indice] as HTMLElement | undefined;
    if (!item) return;
    item.tabIndex = -1;
    item.focus({ preventScroll: true });
  }, [extra]);

  async function cargarMas() {
    setCargando(true);
    setError(false);
    const { data, error } = await crearClienteNavegador()
      .from("business_reviews")
      .select("id, autor_nombre, calificacion, comentario, respuesta, created_at")
      .eq("business_id", negocioId)
      .eq("estado", "publicada")
      .order("created_at", { ascending: false })
      .range(mostradas, mostradas + RESENAS_POR_PAGINA - 1);
    setCargando(false);
    if (error) return setError(true);
    primeraNueva.current = data.length > 0 ? extra.length : null;
    // Evitar repetidas si entró una reseña nueva desde que se generó la página.
    setExtra((previas) => {
      const vistas = new Set(previas.map((r) => r.id));
      return [...previas, ...data.filter((r) => !vistas.has(r.id))];
    });
    // El total viene de la página estática: si ya no llegan más, no insistir.
    if (data.length < RESENAS_POR_PAGINA) setAgotadas(true);
  }

  const quedan = agotadas ? 0 : Math.max(0, total - mostradas);
  return (
    <>
      {extra.length > 0 && (
        <ul ref={lista} className="divide-y divide-brand-dark/10 border-t border-brand-dark/10 pt-4">
          {extra.map((r) => (
            <ItemResena key={r.id} resena={r} />
          ))}
        </ul>
      )}
      {quedan > 0 && (
        <div className="text-center">
          <Boton variante="secundario" cargando={cargando} onClick={cargarMas}>
            Ver más reseñas ({quedan})
          </Boton>
          {error && (
            <p role="alert" className="mt-2 text-sm text-red-700">
              No pudimos cargar más reseñas. Inténtalo de nuevo.
            </p>
          )}
        </div>
      )}
    </>
  );
}
