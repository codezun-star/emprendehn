// Ubicación exacta de los negocios (migración 016). Sin dependencias: se usa
// en el navegador (formulario, mapa) y en el servidor (validación, JSON-LD).

export type Coordenadas = { lat: number; lng: number };

/** Debe coincidir con businesses_coordenadas_en_honduras (incluye islas). */
export const LIMITES_HONDURAS = { latMin: 12.9, latMax: 17.5, lngMin: -89.4, lngMax: -83.0 } as const;

/** Centro aproximado del país para el mapa cuando aún no hay pin. */
export const CENTRO_HONDURAS: Coordenadas = { lat: 14.75, lng: -86.6 };

export function dentroDeHonduras({ lat, lng }: Coordenadas): boolean {
  const l = LIMITES_HONDURAS;
  return lat >= l.latMin && lat <= l.latMax && lng >= l.lngMin && lng <= l.lngMax;
}

/** 6 decimales ≈ 10 cm: más que suficiente para un local. */
export function redondear(valor: number): number {
  return Math.round(valor * 1e6) / 1e6;
}

/** Dominio de Google con su terminación real: google.com, google.hn, google.com.hn, google.co.uk… */
export const DOMINIO_GOOGLE = String.raw`google\.(?:com(?:\.[a-z]{2})?|co\.[a-z]{2}|[a-z]{2})`;

/** Debe coincidir con businesses_enlace_mapa_google (migración 016). */
const ENLACE_GOOGLE_MAPS = new RegExp(
  String.raw`^https://(?:maps\.app\.goo\.gl/|goo\.gl/maps/|(?:www\.)?${DOMINIO_GOOGLE}/maps|maps\.${DOMINIO_GOOGLE}/)`,
  "i",
);

export function esEnlaceGoogleMaps(url: string): boolean {
  return url.length <= 500 && ENLACE_GOOGLE_MAPS.test(url);
}

/** Enlaces cortos que hay que abrir (seguir la redirección) para ver las coordenadas. */
export function esEnlaceCorto(url: string): boolean {
  return /^https:\/\/(maps\.app\.goo\.gl|goo\.gl)\//i.test(url);
}

const NUM = String.raw`(-?\d{1,3}\.\d+)`;
// En orden de precisión: el pin del lugar (!3d…!4d…) es más exacto que el
// centro de la vista (@lat,lng).
const PATRONES = [
  new RegExp(String.raw`!3d${NUM}!4d${NUM}`),
  new RegExp(String.raw`[?&](?:q|query|ll|destination|daddr|center)=${NUM}\s*,\s*\+?${NUM}`),
  new RegExp(String.raw`/(?:place|search|dir/[^/]*)/${NUM}\s*,\s*\+?${NUM}`),
  new RegExp(String.raw`@${NUM},${NUM}`),
];

/** Lee las coordenadas de un enlace de Google Maps largo (null si no trae o no son de Honduras). */
export function extraerCoordenadas(url: string): Coordenadas | null {
  let texto = url;
  try {
    texto = decodeURIComponent(url);
  } catch {
    // enlace con % mal formados: se usa tal cual
  }
  for (const patron of PATRONES) {
    const m = texto.match(patron);
    if (m) {
      const coordenadas = { lat: redondear(Number(m[1])), lng: redondear(Number(m[2])) };
      if (dentroDeHonduras(coordenadas)) return coordenadas;
    }
  }
  return null;
}

/** Navegación en Google Maps hasta el pin exacto. */
export function enlaceComoLlegar({ lat, lng }: Coordenadas): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}

/** Navegación en Waze (muy usado en Honduras). */
export function enlaceWaze({ lat, lng }: Coordenadas): string {
  return `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`;
}

/**
 * "Ver en Google Maps": la ficha del negocio si el dueño pegó su enlace; si no,
 * el pin exacto; y solo como último recurso, una búsqueda por texto.
 */
export function enlaceVerEnMapa(n: {
  enlace_mapa?: string | null;
  latitud?: number | null;
  longitud?: number | null;
  consultaTexto: string;
}): string {
  if (n.enlace_mapa) return n.enlace_mapa;
  if (n.latitud != null && n.longitud != null) {
    return `https://www.google.com/maps/search/?api=1&query=${n.latitud},${n.longitud}`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(n.consultaTexto)}`;
}
