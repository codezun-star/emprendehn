import { SITE_NAME, SITE_URL } from "@/lib/env";
import { aOpeningHoursSpecification, parsearHorario, tieneAlgunTurno } from "@/lib/horario";
import { enlaceVerEnMapa } from "@/lib/mapas";
import { urlImagen } from "@/lib/storage";
import type { Json } from "@/types/database.types";

// Constructores de datos estructurados (schema.org / JSON-LD).

export type Miga = { nombre: string; ruta: string };

export function urlAbsoluta(ruta: string): string {
  return `${SITE_URL}${ruta === "/" ? "" : ruta}`;
}

export function jsonLdMigas(migas: Miga[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: migas.map((m, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: m.nombre,
      item: urlAbsoluta(m.ruta),
    })),
  };
}

export function jsonLdSitio() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#sitio`,
        url: SITE_URL,
        name: SITE_NAME,
        inLanguage: "es-HN",
        potentialAction: {
          "@type": "SearchAction",
          target: { "@type": "EntryPoint", urlTemplate: `${SITE_URL}/buscar?q={search_term_string}` },
          "query-input": "required name=search_term_string",
        },
      },
      {
        "@type": "Organization",
        "@id": `${SITE_URL}/#organizacion`,
        name: SITE_NAME,
        url: SITE_URL,
        areaServed: { "@type": "Country", name: "Honduras" },
      },
    ],
  };
}

export function jsonLdListado(nombre: string, negocios: { nombre: string; slug: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: nombre,
    numberOfItems: negocios.length,
    itemListElement: negocios.map((n, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: n.nombre,
      url: urlAbsoluta(`/negocio/${n.slug}`),
    })),
  };
}

type DatosNegocioLd = {
  nombre: string;
  slug: string;
  descripcion: string;
  telefono: string | null;
  whatsapp: string | null;
  email_contacto: string | null;
  direccion: string | null;
  localidad: string | null;
  horario: Json | null;
  redes_sociales: Json;
  logo_path: string | null;
  latitud?: number | null;
  longitud?: number | null;
  enlace_mapa?: string | null;
  imagenes: { storage_path: string }[];
  schemaType: string;
  ciudad: string;
  departamento: string;
  categoria: string;
  calificacion_promedio?: number | null;
  total_resenas?: number;
  resenas?: { autor_nombre: string; calificacion: number; comentario: string | null; created_at: string }[];
};

export function jsonLdNegocio(n: DatosNegocioLd) {
  const url = urlAbsoluta(`/negocio/${n.slug}`);
  const horario = parsearHorario(n.horario);
  const redes =
    n.redes_sociales && typeof n.redes_sociales === "object" && !Array.isArray(n.redes_sociales)
      ? Object.values(n.redes_sociales).filter((v): v is string => typeof v === "string")
      : [];
  const imagenes = n.imagenes.map((i) => urlImagen(i.storage_path));
  const punto = n.latitud != null && n.longitud != null ? { lat: n.latitud, lng: n.longitud } : null;
  const mapa = n.enlace_mapa || punto ? enlaceVerEnMapa({ ...n, consultaTexto: "" }) : null;

  return {
    "@context": "https://schema.org",
    "@type": n.schemaType || "LocalBusiness",
    "@id": `${url}#negocio`,
    name: n.nombre,
    description: n.descripcion,
    url,
    ...(imagenes.length > 0 && { image: imagenes }),
    ...(n.logo_path && { logo: urlImagen(n.logo_path) }),
    ...((n.telefono ?? n.whatsapp) && { telephone: n.telefono ?? n.whatsapp }),
    ...(n.email_contacto && { email: n.email_contacto }),
    address: {
      "@type": "PostalAddress",
      ...((n.direccion || n.localidad) && {
        streetAddress: [n.direccion, n.localidad].filter(Boolean).join(", "),
      }),
      addressLocality: n.ciudad,
      addressRegion: n.departamento,
      addressCountry: "HN",
    },
    ...(punto && { geo: { "@type": "GeoCoordinates", latitude: punto.lat, longitude: punto.lng } }),
    ...(mapa && { hasMap: mapa }),
    areaServed: { "@type": "City", name: n.ciudad },
    ...(horario && tieneAlgunTurno(horario) && {
      openingHoursSpecification: aOpeningHoursSpecification(horario),
    }),
    ...(redes.length > 0 && { sameAs: redes }),
    knowsAbout: n.categoria,
    ...(n.calificacion_promedio && n.total_resenas && {
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: n.calificacion_promedio,
        reviewCount: n.total_resenas,
        bestRating: 5,
        worstRating: 1,
      },
    }),
    ...(n.resenas?.length && {
      review: n.resenas.map((r) => ({
        "@type": "Review",
        author: { "@type": "Person", name: r.autor_nombre },
        datePublished: r.created_at.slice(0, 10),
        reviewRating: { "@type": "Rating", ratingValue: r.calificacion, bestRating: 5, worstRating: 1 },
        ...(r.comentario && { reviewBody: r.comentario }),
      })),
    }),
  };
}
