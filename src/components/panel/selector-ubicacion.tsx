"use client";

import { Crosshair, Link2, MapPin, Maximize2, Search, Trash2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useFormContext, useWatch } from "react-hook-form";

import { Mapa } from "@/components/mapas/mapa";
import { Boton } from "@/components/ui/boton";
import { ariaCampo, Campo, Input } from "@/components/ui/campo";
import { resolverEnlaceMapa } from "@/lib/acciones/mapas";
import {
  CENTRO_HONDURAS,
  dentroDeHonduras,
  esEnlaceCorto,
  esEnlaceGoogleMaps,
  extraerCoordenadas,
  redondear,
  type Coordenadas,
} from "@/lib/mapas";
import { cn } from "@/lib/utils";
import type { NegocioInput } from "@/lib/validaciones/negocio";

type Lugar = Coordenadas & { nombre: string; detalle: string };

/**
 * Busca lugares de Honduras en OpenStreetMap (Nominatim). Solo cuando la
 * persona lo pide (Enter o botón): su política no permite buscar al teclear.
 */
async function buscarLugares(consulta: string, limite: number): Promise<Lugar[]> {
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&countrycodes=hn&limit=${limite}&accept-language=es&q=${encodeURIComponent(consulta)}`;
  try {
    const respuesta = await fetch(url, { headers: { Accept: "application/json" } });
    const lugares = (await respuesta.json()) as { lat: string; lon: string; name?: string; display_name: string }[];
    return lugares.flatMap((l) => {
      const c = { lat: Number(l.lat), lng: Number(l.lon) };
      if (!dentroDeHonduras(c)) return [];
      // "Colonia Kennedy, Tegucigalpa, Distrito Central, Francisco Morazán, 11101, Honduras"
      const partes = l.display_name.split(", ").filter((p) => p !== "Honduras" && !/^\d+$/.test(p));
      const nombre = l.name || partes[0];
      const detalle = partes.filter((p) => p !== nombre).slice(0, 3).join(", ");
      return [{ ...c, nombre, detalle }];
    });
  } catch {
    return [];
  }
}

/** "14.0818, -87.2068" (lo que Google Maps copia al mantener presionado un punto). */
function coordenadasEscritas(texto: string): Coordenadas | null {
  const m = texto.trim().match(/^(-?\d{1,2}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)$/);
  if (!m) return null;
  const c = { lat: redondear(Number(m[1])), lng: redondear(Number(m[2])) };
  return dentroDeHonduras(c) ? c : null;
}

export function SelectorUbicacion({ ciudad }: { ciudad: string | null }) {
  const {
    control,
    setValue,
    trigger,
    formState: { errors },
  } = useFormContext<NegocioInput>();
  const latitud = useWatch({ control, name: "latitud" });
  const longitud = useWatch({ control, name: "longitud" });
  const enlace = useWatch({ control, name: "enlace_mapa" }) ?? "";

  const punto = latitud && longitud ? { lat: Number(latitud), lng: Number(longitud) } : null;
  const [centro, setCentro] = useState<{ c: Coordenadas; zoom: number }>({ c: CENTRO_HONDURAS, zoom: 7 });
  const [enfoque, setEnfoque] = useState<(Coordenadas & { zoom: number }) | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [resultados, setResultados] = useState<Lugar[]>([]);
  const [aviso, setAviso] = useState<{ ok: boolean; texto: string } | null>(null);
  const [ocupado, setOcupado] = useState<"gps" | "enlace" | "buscar" | null>(null);
  const [ampliado, setAmpliado] = useState(false);
  const zona = useRef<HTMLDivElement>(null);
  const botonAmpliar = useRef<HTMLButtonElement>(null);

  // Sin pin todavía: mostrar la ciudad elegida en el formulario.
  useEffect(() => {
    if (punto || !ciudad) return;
    let activo = true;
    buscarLugares(`${ciudad}, Honduras`, 1).then(([lugar]) => {
      if (activo && lugar) setCentro({ c: lugar, zoom: 13 });
    });
    return () => {
      activo = false;
    };
    // Solo cuando cambia la ciudad (no en cada movimiento del pin).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ciudad]);

  // Pantalla completa: sin desplazar la página de fondo, Esc para salir y el
  // foco vuelve al botón "Ampliar" al cerrar.
  useEffect(() => {
    if (!ampliado) return;
    const raiz = document.documentElement;
    const desbordeAnterior = raiz.style.overflow;
    raiz.style.overflow = "hidden";
    zona.current?.focus();
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAmpliado(false);
    };
    document.addEventListener("keydown", alTeclear);
    const boton = botonAmpliar.current;
    return () => {
      raiz.style.overflow = desbordeAnterior;
      document.removeEventListener("keydown", alTeclear);
      boton?.focus();
    };
  }, [ampliado]);

  // Ambas coordenadas juntas y luego validar: validar una a la vez deja el
  // error de "par incompleto" pegado en latitud.
  function ponerCoordenadas(lat: string, lng: string) {
    setValue("latitud", lat, { shouldDirty: true });
    setValue("longitud", lng, { shouldDirty: true });
    trigger(["latitud", "longitud"]);
  }

  function fijar(c: Coordenadas, mensaje?: string) {
    ponerCoordenadas(String(c.lat), String(c.lng));
    setAviso(mensaje ? { ok: true, texto: mensaje } : null);
  }

  function quitar() {
    ponerCoordenadas("", "");
    setAviso(null);
  }

  function usarMiUbicacion() {
    if (!navigator.geolocation) {
      setAviso({ ok: false, texto: "Tu navegador no permite obtener la ubicación. Coloca el pin en el mapa." });
      return;
    }
    setOcupado("gps");
    setAviso(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setOcupado(null);
        const c = { lat: redondear(pos.coords.latitude), lng: redondear(pos.coords.longitude) };
        if (!dentroDeHonduras(c)) {
          setAviso({ ok: false, texto: "Tu ubicación actual no está en Honduras. Coloca el pin en el mapa." });
          return;
        }
        fijar(c, "Listo: usamos tu ubicación actual. Revisa que el pin quede sobre tu negocio y ajústalo si hace falta.");
      },
      (error) => {
        setOcupado(null);
        setAviso({
          ok: false,
          texto:
            error.code === error.PERMISSION_DENIED
              ? "No diste permiso para usar tu ubicación. Actívalo en tu navegador o coloca el pin en el mapa."
              : "No pudimos obtener tu ubicación. Inténtalo de nuevo o coloca el pin en el mapa.",
        });
      },
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 0 },
    );
  }

  async function usarEnlace() {
    const texto = enlace.trim();
    setAviso(null);
    if (!texto) return setAviso({ ok: false, texto: "Pega primero el enlace de Google Maps." });

    const escritas = coordenadasEscritas(texto);
    if (escritas) {
      setValue("enlace_mapa", "", { shouldDirty: true });
      return fijar(escritas, "Listo: colocamos el pin en esas coordenadas.");
    }
    if (!esEnlaceGoogleMaps(texto)) {
      return setAviso({ ok: false, texto: "Ese enlace no es de Google Maps. En Google Maps toca «Compartir» y copia el enlace." });
    }
    const directas = extraerCoordenadas(texto);
    if (directas) return fijar(directas, "Listo: tomamos la ubicación de tu enlace de Google Maps.");
    if (esEnlaceCorto(texto)) {
      setOcupado("enlace");
      const r = await resolverEnlaceMapa(texto);
      setOcupado(null);
      if (r.ok) return fijar(r.coordenadas, "Listo: tomamos la ubicación de tu enlace de Google Maps.");
      return setAviso({ ok: false, texto: r.error });
    }
    setAviso({
      ok: false,
      texto: "Guardaremos el enlace, pero no trae la ubicación exacta. Coloca también el pin en el mapa.",
    });
  }

  function irA(lugar: Coordenadas) {
    setEnfoque({ ...lugar, zoom: 17 });
    setResultados([]);
    setAviso({
      ok: true,
      texto: punto
        ? "Encontramos la zona. Toca el mapa o arrastra el pin hasta el lugar exacto de tu negocio."
        : "Encontramos la zona. Ahora toca el mapa en el lugar exacto de tu negocio.",
    });
  }

  async function buscar() {
    if (!busqueda.trim()) return;
    setOcupado("buscar");
    setAviso(null);
    setResultados([]);
    const lugares = await buscarLugares([busqueda, ciudad].filter(Boolean).join(", "), 5);
    setOcupado(null);
    if (lugares.length === 0) {
      setAviso({ ok: false, texto: "No encontramos ese lugar. Mueve el mapa y toca donde está tu negocio." });
    } else if (lugares.length === 1) {
      irA(lugares[0]);
    } else {
      setResultados(lugares);
    }
  }

  const errorPin = errors.latitud?.message;
  const textoPin = punto
    ? `Pin en ${punto.lat.toFixed(5)}, ${punto.lng.toFixed(5)}. Arrástralo si hace falta.`
    : "Toca el mapa en el lugar exacto de tu negocio.";
  const mensajeAviso = aviso && (
    <p role="status" className={cn("text-sm font-medium", aviso.ok ? "text-emerald-800" : "text-red-700")}>
      {aviso.texto}
    </p>
  );

  return (
    <div className="space-y-4 rounded-xl border border-brand-dark/10 bg-brand-light/60 p-4">
      <div>
        <p className="flex items-center gap-2 text-sm font-semibold text-brand-dark">
          <MapPin className="size-4" aria-hidden /> Ubicación exacta en el mapa
          <span className="font-normal text-ink/50">(recomendado)</span>
        </p>
        <p className="mt-1 text-xs text-ink/65">
          Con el pin exacto, el botón «Cómo llegar» lleva a tus clientes directo a tu negocio en Google Maps o
          Waze, aunque haya otros negocios con el mismo nombre.
        </p>
      </div>

      {/* Mapa y herramientas. Al ampliar, esta misma zona pasa a pantalla
          completa (el mapa no se vuelve a crear: solo cambia de tamaño). */}
      <div
        ref={zona}
        tabIndex={ampliado ? -1 : undefined}
        role={ampliado ? "dialog" : undefined}
        aria-modal={ampliado || undefined}
        aria-label={ampliado ? "Ubicación del negocio en pantalla completa" : undefined}
        className={cn(ampliado ? "fixed inset-0 z-50 m-0 flex flex-col bg-white outline-none" : "space-y-4")}
      >
        <div
          className={cn(
            "space-y-3",
            ampliado && "border-b border-ink/10 px-3 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] shadow-sm sm:px-5",
          )}
        >
          {ampliado && (
            <div className="flex items-center justify-between gap-3">
              <p className="font-bold text-brand-dark">Ubica tu negocio en el mapa</p>
              <button
                type="button"
                onClick={() => setAmpliado(false)}
                className="rounded-lg p-1.5 text-ink/70 hover:bg-brand-light hover:text-ink"
                aria-label="Salir de pantalla completa"
              >
                <X className="size-5" aria-hidden />
              </button>
            </div>
          )}

          <div className="flex gap-2">
            <label htmlFor="buscar-lugar" className="sr-only">
              Buscar una colonia o lugar
            </label>
            <Input
              id="buscar-lugar"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  buscar();
                }
              }}
              placeholder="Buscar una colonia o lugar cercano"
              enterKeyHint="search"
            />
            <Boton type="button" variante="secundario" cargando={ocupado === "buscar"} onClick={buscar} aria-label="Buscar">
              <Search className="size-4" aria-hidden />
            </Boton>
          </div>

          {resultados.length > 0 && (
            <ul
              aria-label="Lugares encontrados"
              className="divide-y divide-ink/10 overflow-hidden rounded-lg bg-white ring-1 ring-ink/10"
            >
              {resultados.map((lugar) => (
                <li key={`${lugar.lat},${lugar.lng}`}>
                  <button
                    type="button"
                    onClick={() => irA(lugar)}
                    className="flex w-full items-start gap-2 px-3 py-2.5 text-left text-sm hover:bg-brand-light"
                  >
                    <MapPin className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden />
                    <span className="min-w-0">
                      <span className="block font-semibold text-ink">{lugar.nombre}</span>
                      {lugar.detalle && <span className="block truncate text-xs text-ink/60">{lugar.detalle}</span>}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="flex flex-wrap gap-2">
            <Boton type="button" tamano="sm" variante="secundario" cargando={ocupado === "gps"} onClick={usarMiUbicacion}>
              <Crosshair className="size-4" aria-hidden /> Usar mi ubicación actual
            </Boton>
            {punto && (
              <Boton type="button" tamano="sm" variante="fantasma" onClick={quitar}>
                <Trash2 className="size-4" aria-hidden /> Quitar pin
              </Boton>
            )}
          </div>
        </div>

        <div className={cn("relative", ampliado && "min-h-0 flex-1")}>
          <Mapa
            punto={punto}
            centro={centro.c}
            zoomCentro={centro.zoom}
            zoom={17}
            editable
            zoomConRueda={ampliado}
            enfoque={enfoque}
            onCambio={(c) => fijar(c)}
            etiqueta="Mapa para colocar la ubicación del negocio. Toca el mapa o arrastra el pin."
            className={
              ampliado
                ? "absolute inset-0"
                : cn("h-72 rounded-xl ring-1", errorPin ? "ring-red-600" : "ring-brand-dark/15")
            }
          />
          {/* Oculto (no desmontado) al ampliar, para devolverle el foco al cerrar. */}
          <button
            ref={botonAmpliar}
            type="button"
            onClick={() => setAmpliado(true)}
            className={cn(
              "absolute right-2.5 top-2.5 z-10 inline-flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1.5 text-xs font-semibold text-brand-dark shadow ring-1 ring-ink/15 hover:bg-brand-light",
              ampliado && "hidden",
            )}
          >
            <Maximize2 className="size-3.5" aria-hidden /> Pantalla completa
          </button>
        </div>

        <div
          className={cn(
            "space-y-2",
            ampliado &&
              "flex flex-wrap items-center justify-between gap-3 space-y-0 border-t border-ink/10 px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-5",
          )}
        >
          <div className="min-w-0 space-y-1">
            <p className="text-xs text-ink/65" aria-live="polite">
              {textoPin}
            </p>
            {errorPin && (
              <p role="alert" className="text-xs font-medium text-red-700">
                {errorPin}
              </p>
            )}
            {ampliado && mensajeAviso}
          </div>
          {ampliado && (
            <Boton type="button" onClick={() => setAmpliado(false)} className="shrink-0">
              Listo
            </Boton>
          )}
        </div>
      </div>

      <Campo
        etiqueta={
          <span className="inline-flex items-center gap-1.5">
            <Link2 className="size-4" aria-hidden /> ¿Tu negocio ya está en Google Maps?
          </span>
        }
        htmlFor="enlace_mapa"
        opcional
        error={errors.enlace_mapa?.message}
        ayuda="En Google Maps busca tu negocio (o mantén presionado el lugar exacto), toca «Compartir» y pega aquí el enlace. Así «Ver en Google Maps» abre tu ficha con tus fotos y reseñas de Google."
      >
        <div className="flex gap-2">
          <Input
            {...ariaCampo("enlace_mapa", errors.enlace_mapa?.message)}
            value={enlace}
            onChange={(e) => setValue("enlace_mapa", e.target.value, { shouldDirty: true })}
            placeholder="https://maps.app.goo.gl/…"
            inputMode="url"
          />
          <Boton type="button" variante="secundario" cargando={ocupado === "enlace"} onClick={usarEnlace}>
            Ubicar
          </Boton>
        </div>
      </Campo>

      {!ampliado && mensajeAviso}
    </div>
  );
}
