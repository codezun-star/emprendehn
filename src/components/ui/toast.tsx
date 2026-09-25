"use client";

import { CircleAlert, CircleCheck, Info, Loader2, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore, type PointerEvent } from "react";

import { cn } from "@/lib/utils";

// Notificaciones flotantes ("toasts") para confirmar una acción sin mover la
// página: "Cambios guardados", "Foto eliminada", "Enlace copiado"…
// Uso desde cualquier componente cliente:
//   toast.exito("Cambios guardados")
//   toast.error("No se pudo subir la foto", { descripcion: "Revisa tu conexión." })
//   const id = toast.cargando("Subiendo 3 fotos…"); … toast.exito("Listo", { id })
// El <Toaster /> vive en el layout raíz. Los errores de un campo siguen junto
// al campo: el toast es para el resultado de la acción.

type Tipo = "exito" | "error" | "info" | "cargando";

type Accion = { etiqueta: string; href: string };

type Opciones = {
  descripcion?: string;
  accion?: Accion;
  /** ms; por defecto 5 s (errores 8 s, "cargando" hasta que se actualice). */
  duracion?: number;
  /** Reemplaza un toast existente (p. ej. el de "cargando") en vez de crear otro. */
  id?: number;
};

type ToastDatos = {
  id: number;
  tipo: Tipo;
  titulo: string;
  descripcion?: string;
  accion?: Accion;
  duracion: number;
  /** Cambia al actualizar el toast: reinicia su tiempo. */
  version: number;
  saliendo: boolean;
};

const MAXIMO_VISIBLES = 3;
const DURACION: Record<Tipo, number> = { exito: 5000, info: 5000, error: 8000, cargando: Infinity };
const DURACION_SALIDA = 180;

let lista: ToastDatos[] = [];
let ultimoId = 0;
const oyentes = new Set<() => void>();

function publicar(nueva: ToastDatos[]) {
  lista = nueva;
  oyentes.forEach((oyente) => oyente());
}

function cerrar(id: number) {
  if (!lista.some((t) => t.id === id && !t.saliendo)) return;
  publicar(lista.map((t) => (t.id === id ? { ...t, saliendo: true } : t)));
  setTimeout(() => publicar(lista.filter((t) => t.id !== id)), DURACION_SALIDA);
}

/**
 * Los mensajes de las server actions vienen como "Primera frase. Detalle.": la
 * primera frase es el título y el resto la descripción. Sin punto final en el título.
 */
function dividir(texto: string, descripcion?: string) {
  const partes = descripcion === undefined ? /^(.+?[.!?])\s+(\S[\s\S]*)$/.exec(texto.trim()) : null;
  const titulo = (partes ? partes[1] : texto).trim().replace(/(?<!\.)\.$/, "");
  return { titulo, descripcion: partes ? partes[2] : descripcion };
}

function mostrar(tipo: Tipo, texto: string, opciones: Opciones = {}): number {
  const { id, duracion = DURACION[tipo], ...otras } = opciones;
  const { titulo, descripcion } = dividir(texto, otras.descripcion);
  const resto = { ...otras, descripcion };
  const existente =
    id !== undefined
      ? lista.find((t) => t.id === id)
      : // Doble clic o el mismo aviso dos veces: se reinicia el que ya está.
        lista.find((t) => !t.saliendo && t.tipo === tipo && t.titulo === titulo && t.descripcion === resto.descripcion);

  if (existente) {
    publicar(
      lista.map((t) =>
        t.id === existente.id
          ? { ...t, ...resto, tipo, titulo, duracion, version: t.version + 1, saliendo: false }
          : t,
      ),
    );
    return existente.id;
  }

  const nuevo: ToastDatos = { id: ++ultimoId, tipo, titulo, duracion, version: 0, saliendo: false, ...resto };
  publicar([...lista, nuevo]);
  // Máximo 3 a la vez: se va el más antiguo.
  const visibles = lista.filter((t) => !t.saliendo);
  if (visibles.length > MAXIMO_VISIBLES) cerrar(visibles[0].id);
  return nuevo.id;
}

export const toast = {
  exito: (titulo: string, opciones?: Opciones) => mostrar("exito", titulo, opciones),
  error: (titulo: string, opciones?: Opciones) => mostrar("error", titulo, opciones),
  info: (titulo: string, opciones?: Opciones) => mostrar("info", titulo, opciones),
  cargando: (titulo: string, opciones?: Opciones) => mostrar("cargando", titulo, opciones),
  cerrar,
};

const SIN_TOASTS: ToastDatos[] = [];
function suscribir(oyente: () => void) {
  oyentes.add(oyente);
  return () => oyentes.delete(oyente);
}

/**
 * Región de notificaciones: arriba al centro en el celular (no la tapa el teclado
 * ni la barra de contacto), abajo a la derecha en la computadora, por encima del
 * botón "Volver arriba" y de las barras fijas (--espacio-inferior).
 */
export function Toaster() {
  const toasts = useSyncExternalStore(suscribir, () => lista, () => SIN_TOASTS);
  return (
    <section
      aria-label="Notificaciones"
      aria-live="polite"
      aria-relevant="additions text"
      className="pointer-events-none fixed inset-x-0 top-0 z-[60] px-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:inset-x-auto sm:top-auto sm:right-0 sm:bottom-0 sm:px-5 sm:pt-0 sm:pb-[calc(5rem+var(--espacio-inferior,0px))]"
    >
      <ol className="flex flex-col-reverse items-center gap-2 sm:flex-col sm:items-end">
        {toasts.map((t) => (
          <TarjetaToast key={t.id} toast={t} />
        ))}
      </ol>
    </section>
  );
}

const ESTILOS: Record<Tipo, { icono: typeof Info; circulo: string; barra: string }> = {
  exito: { icono: CircleCheck, circulo: "bg-emerald-100 text-emerald-700", barra: "bg-emerald-500" },
  error: { icono: CircleAlert, circulo: "bg-red-100 text-red-700", barra: "bg-red-500" },
  info: { icono: Info, circulo: "bg-brand/10 text-brand", barra: "bg-brand" },
  cargando: { icono: Loader2, circulo: "bg-brand/10 text-brand", barra: "bg-brand" },
};

function TarjetaToast({ toast: t }: { toast: ToastDatos }) {
  const [pausado, setPausado] = useState(false);
  const [arrastre, setArrastre] = useState(0);
  const inicioArrastre = useRef<number | null>(null);
  const restante = useRef(t.duracion);
  const versionMedida = useRef(t.version);
  const temporal = Number.isFinite(t.duracion);

  // Se cierra solo; el tiempo se detiene con el mouse encima, con el foco
  // dentro o con la pestaña en segundo plano.
  useEffect(() => {
    // Al actualizarse (p. ej. de "cargando" a "éxito") el tiempo vuelve a empezar.
    if (versionMedida.current !== t.version) {
      versionMedida.current = t.version;
      restante.current = t.duracion;
    }
    if (!temporal || pausado || document.visibilityState === "hidden") return;
    const inicio = Date.now();
    const temporizador = setTimeout(() => cerrar(t.id), restante.current);
    return () => {
      clearTimeout(temporizador);
      restante.current = Math.max(0, restante.current - (Date.now() - inicio));
    };
  }, [t.id, t.version, t.duracion, temporal, pausado]);

  useEffect(() => {
    const alCambiar = () => setPausado(document.visibilityState === "hidden");
    document.addEventListener("visibilitychange", alCambiar);
    return () => document.removeEventListener("visibilitychange", alCambiar);
  }, []);

  // Deslizar hacia un lado para descartar (celular).
  function alPresionar(e: PointerEvent<HTMLLIElement>) {
    if (e.pointerType === "mouse" || (e.target as HTMLElement).closest("a, button")) return;
    inicioArrastre.current = e.clientX;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // El dedo ya se levantó: el arrastre sigue funcionando sin captura.
    }
  }
  function alMover(e: PointerEvent<HTMLLIElement>) {
    if (inicioArrastre.current !== null) setArrastre(e.clientX - inicioArrastre.current);
  }
  function alSoltar() {
    if (inicioArrastre.current === null) return;
    inicioArrastre.current = null;
    if (Math.abs(arrastre) > 80) cerrar(t.id);
    else setArrastre(0);
  }

  const { icono: Icono, circulo, barra } = ESTILOS[t.tipo];
  return (
    <li
      role={t.tipo === "error" ? "alert" : "status"}
      aria-atomic="true"
      onMouseEnter={() => setPausado(true)}
      onMouseLeave={() => setPausado(false)}
      onFocus={() => setPausado(true)}
      onBlur={() => setPausado(false)}
      onPointerDown={alPresionar}
      onPointerMove={alMover}
      onPointerUp={alSoltar}
      onPointerCancel={alSoltar}
      style={arrastre ? { transform: `translateX(${arrastre}px)`, opacity: Math.max(0, 1 - Math.abs(arrastre) / 200) } : undefined}
      className={cn(
        "pointer-events-auto relative w-full max-w-sm touch-pan-y overflow-hidden rounded-2xl bg-white shadow-lg ring-1 shadow-brand-dark/10 ring-brand-dark/10 sm:w-96 sm:[--toast-desde:0.75rem]",
        t.saliendo ? "animate-toast-salir" : "animate-toast-entrar",
        !arrastre && "transition-transform",
      )}
    >
      <div className="flex items-start gap-3 py-3.5 pr-11 pl-3.5">
        <span className={cn("grid size-8 shrink-0 place-items-center rounded-full", circulo)}>
          <Icono className={cn("size-[1.15rem]", t.tipo === "cargando" && "animate-spin")} aria-hidden />
        </span>
        <div className="min-w-0 flex-1 pt-1">
          <p className="text-sm leading-snug font-semibold text-ink">{t.titulo}</p>
          {t.descripcion && <p className="mt-0.5 text-sm leading-snug text-ink/70">{t.descripcion}</p>}
          {t.accion && (
            <Link
              href={t.accion.href}
              onClick={() => cerrar(t.id)}
              className="mt-2 inline-block text-sm font-semibold text-brand underline-offset-2 hover:underline"
            >
              {t.accion.etiqueta}
            </Link>
          )}
        </div>
      </div>
      <button
        type="button"
        onClick={() => cerrar(t.id)}
        aria-label="Cerrar notificación"
        className="absolute top-2.5 right-2.5 rounded-lg p-1.5 text-ink/40 hover:bg-brand-light hover:text-ink"
      >
        <X className="size-4" aria-hidden />
      </button>
      {temporal && (
        <span
          key={t.version}
          aria-hidden
          style={{ animationDuration: `${t.duracion}ms`, animationPlayState: pausado ? "paused" : "running" }}
          className={cn("absolute inset-x-0 bottom-0 h-0.5 origin-left animate-toast-tiempo opacity-60", barra)}
        />
      )}
    </li>
  );
}
