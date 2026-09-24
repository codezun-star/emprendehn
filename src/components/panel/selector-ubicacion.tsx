"use client";

import { Crosshair, Link2, MapPin, Search, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
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
import type { NegocioInput } from "@/lib/validaciones/negocio";

/** Busca un lugar de Honduras en OpenStreetMap (Nominatim), solo cuando la persona lo pide. */
async function buscarLugar(consulta: string): Promise<Coordenadas | null> {
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&countrycodes=hn&limit=1&accept-language=es&q=${encodeURIComponent(consulta)}`;
  try {
    const respuesta = await fetch(url, { headers: { Accept: "application/json" } });
    const [lugar] = (await respuesta.json()) as { lat: string; lon: string }[];
    if (!lugar) return null;
    const c = { lat: Number(lugar.lat), lng: Number(lugar.lon) };
    return dentroDeHonduras(c) ? c : null;
  } catch {
    return null;
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
  const [busqueda, setBusqueda] = useState("");
  const [aviso, setAviso] = useState<{ ok: boolean; texto: string } | null>(null);
  const [ocupado, setOcupado] = useState<"gps" | "enlace" | "buscar" | null>(null);

  // Sin pin todavía: mostrar la ciudad elegida en el formulario.
  useEffect(() => {
    if (punto || !ciudad) return;
    let activo = true;
    buscarLugar(`${ciudad}, Honduras`).then((c) => {
      if (activo && c) setCentro({ c, zoom: 13 });
    });
    return () => {
      activo = false;
    };
    // Solo cuando cambia la ciudad (no en cada movimiento del pin).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ciudad]);

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

  async function buscar() {
    if (!busqueda.trim()) return;
    setOcupado("buscar");
    const c = await buscarLugar([busqueda, ciudad].filter(Boolean).join(", "));
    setOcupado(null);
    if (c) {
      setCentro({ c, zoom: 17 });
      if (punto) quitar();
      setAviso({ ok: true, texto: "Encontramos la zona. Ahora toca el mapa en el lugar exacto de tu negocio." });
    } else {
      setAviso({ ok: false, texto: "No encontramos ese lugar. Mueve el mapa y toca donde está tu negocio." });
    }
  }

  const errorPin = errors.latitud?.message;

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

      <div className="flex gap-2">
        <label htmlFor="buscar-lugar" className="sr-only">Buscar una colonia o lugar</label>
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
        />
        <Boton type="button" variante="secundario" cargando={ocupado === "buscar"} onClick={buscar} aria-label="Buscar">
          <Search className="size-4" aria-hidden />
        </Boton>
      </div>

      <Mapa
        punto={punto}
        centro={centro.c}
        zoomCentro={centro.zoom}
        zoom={17}
        editable
        onCambio={(c) => fijar(c)}
        etiqueta="Mapa para colocar la ubicación del negocio. Toca el mapa o arrastra el pin."
        className={`h-72 rounded-xl ring-1 ${errorPin ? "ring-red-600" : "ring-brand-dark/15"}`}
      />
      <p className="text-xs text-ink/65" aria-live="polite">
        {punto
          ? `Pin en ${punto.lat.toFixed(5)}, ${punto.lng.toFixed(5)}. Arrástralo si hace falta.`
          : "Toca el mapa en el lugar exacto de tu negocio."}
      </p>
      {errorPin && (
        <p role="alert" className="text-xs font-medium text-red-700">
          {errorPin}
        </p>
      )}

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

      {aviso && (
        <p role="status" className={`text-sm font-medium ${aviso.ok ? "text-emerald-800" : "text-red-700"}`}>
          {aviso.texto}
        </p>
      )}
    </div>
  );
}
