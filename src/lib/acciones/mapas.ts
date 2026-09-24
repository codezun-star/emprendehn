"use server";

import { obtenerSesion } from "@/lib/auth";
import { DOMINIO_GOOGLE, esEnlaceCorto, esEnlaceGoogleMaps, extraerCoordenadas, type Coordenadas } from "@/lib/mapas";

/** Solo se siguen redirecciones hacia estos hosts (nombre completo, anclado). */
const HOSTS_GOOGLE = new RegExp(String.raw`^(?:maps\.app\.goo\.gl|goo\.gl|(?:(?:www|maps|consent)\.)?${DOMINIO_GOOGLE})$`, "i");

/**
 * Lee el pin de un enlace de Google Maps. Los enlaces largos traen las
 * coordenadas; los cortos (maps.app.goo.gl) se abren siguiendo las
 * redirecciones, pero solo entre dominios de Google (nunca se visita otra cosa).
 */
export async function resolverEnlaceMapa(
  enlace: string,
): Promise<{ ok: true; coordenadas: Coordenadas } | { ok: false; error: string }> {
  if (!(await obtenerSesion())) return { ok: false, error: "Tu sesión expiró. Vuelve a ingresar." };
  const url = enlace.trim();
  if (!esEnlaceGoogleMaps(url)) {
    return { ok: false, error: "Pega un enlace de Google Maps (empieza con https://maps.app.goo.gl/ o https://www.google.com/maps)." };
  }

  const directas = extraerCoordenadas(url);
  if (directas) return { ok: true, coordenadas: directas };

  if (esEnlaceCorto(url)) {
    let actual = url;
    for (let salto = 0; salto < 5; salto++) {
      let respuesta: Response;
      try {
        respuesta = await fetch(actual, { redirect: "manual", signal: AbortSignal.timeout(5_000) });
      } catch {
        break;
      }
      const destino = respuesta.headers.get("location");
      if (!destino) break;
      const siguiente = new URL(destino, actual);
      if (siguiente.protocol !== "https:" || !HOSTS_GOOGLE.test(siguiente.hostname)) break;
      const coordenadas = extraerCoordenadas(siguiente.toString());
      if (coordenadas) return { ok: true, coordenadas };
      actual = siguiente.toString();
    }
  }

  return {
    ok: false,
    error: "No pudimos leer la ubicación de ese enlace. Coloca el pin en el mapa o usa tu ubicación actual.",
  };
}
