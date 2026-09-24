"use client";

import "leaflet/dist/leaflet.css";

import type { Map as MapaLeaflet, Marker } from "leaflet";
import { useEffect, useRef, useState } from "react";

import { COLORES } from "@/lib/marca";
import { redondear, type Coordenadas } from "@/lib/mapas";
import { cn } from "@/lib/utils";

// Mapa de OpenStreetMap con Leaflet (sin llave de API). Leaflet toca `window`,
// así que se importa dentro del efecto, solo en el navegador.

const PIN = `<svg width="34" height="44" viewBox="0 0 34 44" aria-hidden="true">
  <path d="M17 43C17 43 32 27.5 32 16.5 32 7.9 25.3 1.5 17 1.5S2 7.9 2 16.5C2 27.5 17 43 17 43Z" fill="${COLORES.accent}" stroke="${COLORES.brandDark}" stroke-width="2.5"/>
  <circle cx="17" cy="16.5" r="5.5" fill="${COLORES.brandDark}"/>
</svg>`;

export function Mapa({
  punto,
  centro,
  zoom = 16,
  zoomCentro = 13,
  editable = false,
  perezoso = false,
  onCambio,
  etiqueta,
  className,
}: {
  /** Pin del negocio (null: sin pin). */
  punto: Coordenadas | null;
  /** Dónde centrar si no hay pin (p. ej. la ciudad elegida). */
  centro: Coordenadas;
  /** Zoom del pin. */
  zoom?: number;
  /** Zoom al centrar sin pin (13 = ciudad, 16 = una calle buscada). */
  zoomCentro?: number;
  /** El pin se arrastra y un toque en el mapa lo mueve. */
  editable?: boolean;
  /** Espera a que el mapa entre en pantalla para cargar Leaflet y las teselas. */
  perezoso?: boolean;
  onCambio?: (c: Coordenadas) => void;
  etiqueta: string;
  className?: string;
}) {
  const contenedor = useRef<HTMLDivElement>(null);
  const mapa = useRef<MapaLeaflet | null>(null);
  const marcador = useRef<Marker | null>(null);
  const leaflet = useRef<typeof import("leaflet") | null>(null);
  const alCambiar = useRef(onCambio);
  const ultimoEmitido = useRef<Coordenadas | null>(null);
  const [visible, setVisible] = useState(!perezoso);
  const [listo, setListo] = useState(false);

  useEffect(() => {
    alCambiar.current = onCambio;
  }, [onCambio]);

  // Carga diferida: solo cuando el mapa está por aparecer en pantalla.
  useEffect(() => {
    if (visible || !contenedor.current) return;
    const observador = new IntersectionObserver(
      ([entrada]) => {
        if (entrada.isIntersecting) {
          setVisible(true);
          observador.disconnect();
        }
      },
      { rootMargin: "300px" },
    );
    observador.observe(contenedor.current);
    return () => observador.disconnect();
  }, [visible]);

  // Crear el mapa una sola vez.
  useEffect(() => {
    if (!visible || !contenedor.current || mapa.current) return;
    let cancelado = false;
    (async () => {
      const L = await import("leaflet");
      if (cancelado || !contenedor.current) return;
      leaflet.current = L;
      const m = L.map(contenedor.current, {
        center: [centro.lat, centro.lng],
        zoom: punto ? zoom : zoomCentro,
        scrollWheelZoom: false,
        // En el celular, un dedo desplaza la página; el mapa se mueve con dos.
        dragging: editable || !L.Browser.mobile,
      });
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(m);
      if (editable) {
        m.on("click", (e) => emitir({ lat: e.latlng.lat, lng: e.latlng.lng }));
      }
      mapa.current = m;
      setListo(true);
    })();
    return () => {
      cancelado = true;
      mapa.current?.remove();
      mapa.current = null;
      marcador.current = null;
    };
    // Solo al montar: los cambios de pin/centro se aplican en los efectos de abajo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  function emitir(c: Coordenadas) {
    const redondeado = { lat: redondear(c.lat), lng: redondear(c.lng) };
    ultimoEmitido.current = redondeado;
    alCambiar.current?.(redondeado);
  }

  // Pin: crear, mover o quitar cuando cambia desde afuera.
  useEffect(() => {
    const L = leaflet.current;
    const m = mapa.current;
    if (!listo || !L || !m) return;
    if (!punto) {
      marcador.current?.remove();
      marcador.current = null;
      return;
    }
    if (!marcador.current) {
      marcador.current = L.marker([punto.lat, punto.lng], {
        draggable: editable,
        keyboard: editable,
        title: etiqueta,
        icon: L.divIcon({ html: PIN, className: "", iconSize: [34, 44], iconAnchor: [17, 43] }),
      }).addTo(m);
      if (editable) {
        marcador.current.on("dragend", () => {
          const p = marcador.current?.getLatLng();
          if (p) emitir({ lat: p.lat, lng: p.lng });
        });
      }
    } else {
      marcador.current.setLatLng([punto.lat, punto.lng]);
    }
    // Si el cambio vino de afuera (ubicación actual, enlace), centrar en el pin.
    const propio =
      ultimoEmitido.current && ultimoEmitido.current.lat === punto.lat && ultimoEmitido.current.lng === punto.lng;
    if (!propio) m.setView([punto.lat, punto.lng], Math.max(m.getZoom(), zoom));
  }, [listo, punto, editable, etiqueta, zoom]);

  // Sin pin: seguir el centro sugerido (la ciudad o una búsqueda).
  useEffect(() => {
    if (!listo || punto || !mapa.current) return;
    mapa.current.setView([centro.lat, centro.lng], zoomCentro);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listo, centro.lat, centro.lng, zoomCentro]);

  return (
    <div
      ref={contenedor}
      role="region"
      aria-label={etiqueta}
      className={cn("relative z-0 overflow-hidden bg-brand-light", className)}
    />
  );
}
