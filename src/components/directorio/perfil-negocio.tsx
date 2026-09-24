import { Clock, Globe, Mail, MapPin, MessageCircle, Phone, Share2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import { Migas } from "@/components/directorio/migas";
import type { Categoria, Municipio } from "@/lib/consultas/directorio";
import { DIAS, describirTurnos, parsearHorario, tieneAlgunTurno } from "@/lib/horario";
import type { Miga } from "@/lib/seo";
import { urlAbsoluta } from "@/lib/seo";
import { urlImagen } from "@/lib/storage";
import { enlaceWhatsApp, formatearTelefono } from "@/lib/telefono";
import { cn } from "@/lib/utils";
import type { Json } from "@/types/database.types";

import { EstadoAbierto } from "./estado-abierto";

export type DatosPerfil = {
  nombre: string;
  slug: string;
  descripcion: string;
  localidad: string | null;
  direccion: string | null;
  telefono: string | null;
  whatsapp: string | null;
  email_contacto: string | null;
  redes_sociales: Json;
  horario: Json | null;
  logo_path: string | null;
  plan: string;
  imagenes: { id: string; storage_path: string; alt_text: string | null }[];
};

const NOMBRES_REDES: Record<string, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  tiktok: "TikTok",
  sitio_web: "Sitio web",
};

function redesDe(redes: Json): [string, string][] {
  if (!redes || typeof redes !== "object" || Array.isArray(redes)) return [];
  return Object.entries(redes).filter(
    (par): par is [string, string] => typeof par[1] === "string" && par[0] in NOMBRES_REDES,
  );
}

/**
 * Mosaico de la galería según la cantidad de fotos (máx. 5):
 * 1 → una grande · 2 → dos iguales · 3–5 → portada grande + miniaturas.
 */
function claseCeldaGaleria(i: number, total: number): string {
  if (total === 1) return "col-span-2 aspect-[16/9]";
  if (total === 2) return "aspect-[4/3]";
  if (i === 0) return "col-span-2 aspect-[4/3] @xl:row-span-2 @xl:aspect-auto";
  const ultimaSola = i === total - 1 && (total - 1) % 2 === 1;
  const anchaEnEscritorio = total === 3 || (total === 4 && i === 3);
  return cn(
    "aspect-[4/3]",
    ultimaSola && "col-span-2 aspect-[8/3]",
    anchaEnEscritorio && "@xl:col-span-2 @xl:aspect-[8/3]",
    !anchaEnEscritorio && ultimaSola && "@xl:col-span-1 @xl:aspect-[4/3]",
  );
}

/** Página de perfil del negocio. La usan la ruta pública y la vista previa del panel. */
export function PerfilNegocio({
  negocio,
  categoria,
  categoriaPadre,
  ciudad,
  barraContactoMovil = false,
  debajoDeContacto,
}: {
  negocio: DatosPerfil;
  categoria: Categoria | undefined;
  categoriaPadre: Categoria | undefined;
  ciudad: Municipio | undefined;
  /** Barra fija con WhatsApp/Llamar en pantallas pequeñas (solo en la página pública). */
  barraContactoMovil?: boolean;
  /** Solo en la página pública (p. ej. "Reportar este negocio"). */
  debajoDeContacto?: ReactNode;
}) {
  const horario = parsearHorario(negocio.horario);
  const redes = redesDe(negocio.redes_sociales);
  const ubicacion = [negocio.localidad, ciudad?.nombre, ciudad?.departamento.nombre].filter(Boolean).join(", ");
  const mensajeWhatsApp = `Hola, vi ${negocio.nombre} en EmprendeHN y quisiera más información.`;
  const urlPerfil = urlAbsoluta(`/negocio/${negocio.slug}`);
  const consultaMapa = [negocio.nombre, negocio.direccion, negocio.localidad, ciudad?.nombre, "Honduras"]
    .filter(Boolean)
    .join(", ");

  const migas: Miga[] = [
    { nombre: "Inicio", ruta: "/" },
    ...(categoriaPadre ? [{ nombre: categoriaPadre.nombre, ruta: `/categoria/${categoriaPadre.slug}` }] : []),
    ...(categoria ? [{ nombre: categoria.nombre, ruta: `/categoria/${categoria.slug}` }] : []),
    ...(categoria && ciudad
      ? [{ nombre: ciudad.nombre, ruta: `/categoria/${categoria.slug}/${ciudad.slug}` }]
      : []),
    { nombre: negocio.nombre, ruta: `/negocio/${negocio.slug}` },
  ];

  const total = negocio.imagenes.length;

  return (
    // @container: el layout se adapta al ancho disponible (página pública,
    // vista previa del panel o columna del admin), no al del viewport.
    <article
      className={cn(
        "@container mx-auto max-w-6xl space-y-6 px-4 py-6",
        barraContactoMovil && (negocio.whatsapp || negocio.telefono) && "pb-28 lg:pb-6",
      )}
    >
      <Migas migas={migas} />

      <header className="flex items-start gap-4">
        <div className="relative grid size-16 shrink-0 place-items-center overflow-hidden rounded-2xl bg-white ring-1 ring-brand-dark/10 @xl:size-20">
          {negocio.logo_path ? (
            <Image src={urlImagen(negocio.logo_path)} alt={`Logo de ${negocio.nombre}`} fill sizes="80px" className="object-cover" />
          ) : (
            <span className="text-3xl font-black text-brand-dark/25">{negocio.nombre.charAt(0)}</span>
          )}
        </div>
        <div className="min-w-0 space-y-1">
          <h1 className="text-2xl font-extrabold leading-tight text-brand-dark @xl:text-3xl">{negocio.nombre}</h1>
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink/70">
            {categoria && (
              <Link href={`/categoria/${categoria.slug}`} className="font-semibold">
                {categoria.nombre}
              </Link>
            )}
            {ubicacion && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="size-4" aria-hidden /> {ubicacion}
              </span>
            )}
            {negocio.plan !== "gratis" && (
              <span className="rounded-full bg-accent px-2.5 py-0.5 text-xs font-semibold text-ink">Destacado</span>
            )}
          </p>
        </div>
      </header>

      <div className="grid gap-6 @4xl:grid-cols-[1fr_340px]">
        <div className="min-w-0 space-y-6">
          {total > 0 && (
            <section
              aria-label="Fotos"
              className={cn("grid grid-cols-2 gap-2", total >= 3 && "@xl:grid-cols-4 @xl:grid-rows-2")}
            >
              {negocio.imagenes.map((imagen, i) => (
                <a
                  key={imagen.id}
                  href={urlImagen(imagen.storage_path)}
                  target="_blank"
                  rel="noopener"
                  className={cn(
                    "relative block overflow-hidden rounded-2xl bg-brand-dark/5",
                    claseCeldaGaleria(i, total),
                  )}
                >
                  <Image
                    src={urlImagen(imagen.storage_path)}
                    alt={
                      imagen.alt_text ??
                      (i === 0
                        ? `${negocio.nombre} en ${ciudad?.nombre ?? "Honduras"}`
                        : `Foto ${i + 1} de ${negocio.nombre}`)
                    }
                    fill
                    preload={i === 0}
                    sizes={
                      i === 0 || total <= 2
                        ? "(min-width: 1024px) 560px, 100vw"
                        : "(min-width: 1024px) 280px, 50vw"
                    }
                    className="object-cover"
                  />
                </a>
              ))}
            </section>
          )}

          <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-brand-dark/10 @xl:p-6">
            <h2 className="mb-3 text-lg font-bold text-brand-dark">Acerca de {negocio.nombre}</h2>
            <p className="whitespace-pre-line leading-relaxed text-ink/90">{negocio.descripcion}</p>
          </section>

          {horario && tieneAlgunTurno(horario) && (
            <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-brand-dark/10 @xl:p-6">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h2 className="flex items-center gap-2 text-lg font-bold text-brand-dark">
                  <Clock className="size-5" aria-hidden /> Horario de atención
                </h2>
                <EstadoAbierto horario={horario} />
              </div>
              <table className="w-full text-sm">
                <tbody>
                  {DIAS.map(({ clave, nombre }) => (
                    <tr key={clave} className="border-b border-brand-dark/5 last:border-0">
                      <th scope="row" className="py-2 pr-4 text-left font-medium text-ink/80">{nombre}</th>
                      <td className="py-2 text-right text-ink/70">{describirTurnos(horario[clave])}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {horario.nota && <p className="mt-3 text-sm text-ink/60">{horario.nota}</p>}
            </section>
          )}

          <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-brand-dark/10 @xl:p-6">
            <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-brand-dark">
              <MapPin className="size-5" aria-hidden /> Ubicación
            </h2>
            <address className="not-italic text-ink/80">
              {negocio.direccion && <p>{negocio.direccion}</p>}
              <p>{ubicacion}</p>
            </address>
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(consultaMapa)}`}
              data-evento="mapa"
              target="_blank"
              rel="noopener"
              className="mt-3 inline-block text-sm font-semibold"
            >
              Ver en Google Maps →
            </a>
          </section>
        </div>

        <aside className="@4xl:sticky @4xl:top-20 @4xl:self-start">
          <div className="space-y-3 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-brand-dark/10">
            <h2 className="text-lg font-bold text-brand-dark">Contacto</h2>
            {negocio.whatsapp && (
              <a
                href={enlaceWhatsApp(negocio.whatsapp, mensajeWhatsApp)}
                data-evento="whatsapp"
                target="_blank"
                rel="noopener"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 py-3 font-bold text-ink no-underline hover:brightness-95"
              >
                <MessageCircle className="size-5" aria-hidden /> Escribir por WhatsApp
              </a>
            )}
            {negocio.telefono && (
              <a
                href={`tel:${negocio.telefono}`}
                data-evento="llamada"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-dark px-4 py-3 font-bold text-white no-underline hover:bg-brand"
              >
                <Phone className="size-5" aria-hidden /> Llamar {formatearTelefono(negocio.telefono)}
              </a>
            )}
            {negocio.whatsapp && !negocio.telefono && (
              <p className="text-center text-sm text-ink/60">WhatsApp: {formatearTelefono(negocio.whatsapp)}</p>
            )}
            {negocio.email_contacto && (
              <a href={`mailto:${negocio.email_contacto}`} className="flex items-center gap-2 break-all text-sm">
                <Mail className="size-4 shrink-0" aria-hidden /> {negocio.email_contacto}
              </a>
            )}
            {redes.length > 0 && (
              <ul className="space-y-2 border-t border-brand-dark/10 pt-3 text-sm">
                {redes.map(([red, url]) => (
                  <li key={red}>
                    <a href={url} target="_blank" rel="noopener nofollow" data-evento="redes" className="inline-flex items-center gap-2">
                      <Globe className="size-4" aria-hidden /> {NOMBRES_REDES[red]}
                    </a>
                  </li>
                ))}
              </ul>
            )}
            <a
              href={`https://wa.me/?text=${encodeURIComponent(`${negocio.nombre}: ${urlPerfil}`)}`}
              target="_blank"
              rel="noopener"
              className="flex items-center justify-center gap-2 border-t border-brand-dark/10 pt-3 text-sm font-semibold"
            >
              <Share2 className="size-4" aria-hidden /> Compartir este negocio
            </a>
          </div>
          {debajoDeContacto && <div className="mt-3 flex justify-center">{debajoDeContacto}</div>}
        </aside>
      </div>

      {barraContactoMovil && (negocio.whatsapp || negocio.telefono) && (
        <div className="fixed inset-x-0 bottom-0 z-20 flex gap-2 border-t border-brand-dark/10 bg-white/95 p-3 backdrop-blur lg:hidden">
          {negocio.whatsapp && (
            <a
              href={enlaceWhatsApp(negocio.whatsapp, mensajeWhatsApp)}
              data-evento="whatsapp"
              target="_blank"
              rel="noopener"
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-accent px-3 py-3 text-sm font-bold text-ink no-underline"
            >
              <MessageCircle className="size-5" aria-hidden /> WhatsApp
            </a>
          )}
          {negocio.telefono && (
            <a
              href={`tel:${negocio.telefono}`}
              data-evento="llamada"
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-brand-dark px-3 py-3 text-sm font-bold text-white no-underline"
            >
              <Phone className="size-5" aria-hidden /> Llamar
            </a>
          )}
        </div>
      )}
    </article>
  );
}
