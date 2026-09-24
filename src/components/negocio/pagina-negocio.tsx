import { ArrowUpRight, Clock, Mail, MapPin, MessageCircle, Navigation, Phone, Star } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Fragment, type ComponentType, type ReactNode } from "react";

import { EstadoAbierto } from "@/components/directorio/estado-abierto";
import { Mapa } from "@/components/mapas/mapa";
import { clasesBoton } from "@/components/ui/boton";
import type { Categoria, Municipio } from "@/lib/consultas/directorio";
import { parsearHorario, tieneAlgunTurno } from "@/lib/horario";
import { enlaceComoLlegar, enlaceVerEnMapa, enlaceWaze } from "@/lib/mapas";
import { urlAbsoluta } from "@/lib/seo";
import { urlImagen } from "@/lib/storage";
import { enlaceWhatsApp, formatearTelefono } from "@/lib/telefono";
import { cn } from "@/lib/utils";
import type { Json } from "@/types/database.types";

import { BarraNegocio } from "./barra-negocio";
import { BotonCompartir } from "./boton-compartir";
import { GaleriaNegocio } from "./galeria-negocio";
import { HorarioHoy, TablaHorario } from "./horario-negocio";
import { IconoRed, NOMBRES_REDES, redesDe } from "./redes";

export type DatosNegocio = {
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
  latitud: number | null;
  longitud: number | null;
  enlace_mapa: string | null;
  imagenes: { id: string; storage_path: string; alt_text: string | null }[];
  calificacion_promedio?: number | null;
  total_resenas?: number;
};

const CTA = {
  base: "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full px-4 py-3.5 text-sm font-bold no-underline shadow-lg transition @md:text-base @xl:px-6",
  acento: "bg-accent text-ink hover:brightness-95",
  claro: "bg-white text-brand-dark hover:bg-brand-light",
  vidrio: "bg-white/10 text-white ring-1 ring-inset ring-white/40 backdrop-blur hover:bg-white/20",
} as const;

function Encabezado({ antetitulo, titulo, id }: { antetitulo: string; titulo: string; id?: string }) {
  return (
    <div>
      <p className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-brand">
        <span aria-hidden className="h-0.5 w-6 rounded-full bg-accent" />
        {antetitulo}
      </p>
      <h2 id={id} className="mt-2 text-3xl font-extrabold tracking-tight text-balance text-brand-dark @3xl:text-4xl">
        {titulo}
      </h2>
    </div>
  );
}

function DatoRapido({
  icono: Icono,
  titulo,
  href,
  externo,
  evento,
  children,
}: {
  icono: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  titulo: string;
  href: string;
  externo?: boolean;
  evento?: string;
  children: ReactNode;
}) {
  return (
    <li>
      <a
        href={href}
        data-evento={evento}
        {...(externo && { target: "_blank", rel: "noopener" })}
        className="flex h-full items-center gap-4 p-5 text-ink no-underline transition-colors hover:bg-brand-light/70"
      >
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-light text-brand-dark">
          <Icono className="size-5" aria-hidden />
        </span>
        <span className="min-w-0">
          <span className="block text-xs font-semibold uppercase tracking-wide text-ink/50">{titulo}</span>
          <span className="line-clamp-2 font-semibold text-ink">{children}</span>
        </span>
      </a>
    </li>
  );
}

/**
 * Página del negocio como sitio propio: portada a pantalla completa con su
 * identidad y la marca de EmprendeHN solo al pie. La usan la ruta pública
 * (modo "publico": barras fijas, rastreo de clics) y las vistas previas del
 * panel y del admin (modo "vista-previa": sin elementos fijos). El diseño se
 * adapta al ancho del contenedor (@container), no al de la ventana.
 */
export function PaginaNegocio({
  negocio,
  categoria,
  ciudad,
  modo = "publico",
  seccionResenas,
  alPie,
}: {
  negocio: DatosNegocio;
  categoria: Categoria | undefined;
  ciudad: Municipio | undefined;
  modo?: "publico" | "vista-previa";
  /** Solo en la página pública: lista y formulario de reseñas. */
  seccionResenas?: ReactNode;
  /** Solo en la página pública (p. ej. "Reportar este negocio"). */
  alPie?: ReactNode;
}) {
  const publico = modo === "publico";
  const Principal = publico ? "main" : "div";
  const Calificacion = seccionResenas ? "a" : "span";

  const horarioLeido = parsearHorario(negocio.horario);
  const horario = horarioLeido && tieneAlgunTurno(horarioLeido) ? horarioLeido : null;
  const redes = redesDe(negocio.redes_sociales);
  const logo = negocio.logo_path ? urlImagen(negocio.logo_path) : null;
  const fotos = negocio.imagenes.map((imagen, i) => ({
    id: imagen.id,
    src: urlImagen(imagen.storage_path),
    alt:
      imagen.alt_text ??
      (i === 0 ? `${negocio.nombre} en ${ciudad?.nombre ?? "Honduras"}` : `Foto ${i + 1} de ${negocio.nombre}`),
  }));
  const portada = fotos[0];

  const lugar = [negocio.localidad, ciudad?.nombre].filter(Boolean).join(", ");
  const lugarCompleto = [negocio.localidad, ciudad?.nombre, ciudad?.departamento.nombre].filter(Boolean).join(", ");
  const punto =
    negocio.latitud !== null && negocio.longitud !== null ? { lat: negocio.latitud, lng: negocio.longitud } : null;
  const verEnMapa = enlaceVerEnMapa({
    ...negocio,
    consultaTexto: [negocio.nombre, negocio.direccion, negocio.localidad, ciudad?.nombre, "Honduras"]
      .filter(Boolean)
      .join(", "),
  });

  const whatsapp = negocio.whatsapp
    ? enlaceWhatsApp(negocio.whatsapp, `Hola, vi ${negocio.nombre} en EmprendeHN y quisiera más información.`)
    : null;
  const telefono = negocio.telefono ? `tel:${negocio.telefono}` : null;
  const promedio = negocio.calificacion_promedio ?? null;
  const totalResenas = negocio.total_resenas ?? 0;

  const secciones = [
    { id: "sobre", etiqueta: "Nosotros" },
    ...(fotos.length > 1 ? [{ id: "fotos", etiqueta: "Fotos" }] : []),
    ...(horario ? [{ id: "horario", etiqueta: "Horario" }] : []),
    { id: "ubicacion", etiqueta: "Ubicación" },
    ...(seccionResenas ? [{ id: "resenas", etiqueta: "Reseñas" }] : []),
    { id: "contacto", etiqueta: "Contacto" },
  ];

  // Botones de la portada: el primero ocupa todo el ancho en el celular.
  const ctas: { clave: string; nodo: (clase: string) => ReactNode }[] = [];
  if (whatsapp) {
    ctas.push({
      clave: "whatsapp",
      nodo: (clase) => (
        <a href={whatsapp} data-evento="whatsapp" target="_blank" rel="noopener" className={cn(CTA.base, CTA.acento, clase)}>
          <MessageCircle className="size-5" aria-hidden /> Escribir por WhatsApp
        </a>
      ),
    });
  }
  if (telefono) {
    ctas.push({
      clave: "llamar",
      nodo: (clase) => (
        <a href={telefono} data-evento="llamada" className={cn(CTA.base, whatsapp ? CTA.claro : CTA.acento, clase)}>
          <Phone className="size-5" aria-hidden /> Llamar
        </a>
      ),
    });
  }
  ctas.push({
    clave: "mapa",
    nodo: (clase) =>
      punto ? (
        <a
          href={enlaceComoLlegar(punto)}
          data-evento="mapa"
          target="_blank"
          rel="noopener"
          className={cn(CTA.base, CTA.vidrio, clase)}
        >
          <Navigation className="size-5" aria-hidden /> Cómo llegar
        </a>
      ) : (
        <a href="#ubicacion" className={cn(CTA.base, CTA.vidrio, clase)}>
          <MapPin className="size-5" aria-hidden /> Ver ubicación
        </a>
      ),
  });

  const contactoPrincipal = whatsapp
    ? ({ href: whatsapp, tipo: "whatsapp" } as const)
    : telefono
      ? ({ href: telefono, tipo: "llamada" } as const)
      : null;

  return (
    <div className={cn("relative bg-white text-ink", publico && contactoPrincipal && "pb-20 md:pb-0")}>
      <BarraNegocio nombre={negocio.nombre} logo={logo} secciones={secciones} contacto={contactoPrincipal} fija={publico} />

      <Principal id={publico ? "contenido" : undefined} className="@container">
        {/* Portada */}
        <section
          id="inicio"
          aria-labelledby="titulo-negocio"
          className={cn(
            "relative isolate flex flex-col justify-end overflow-hidden bg-brand-dark text-white",
            publico ? "min-h-[88svh]" : "min-h-[34rem]",
          )}
        >
          {portada ? (
            <>
              <Image src={portada.src} alt={portada.alt} fill preload={publico} sizes="100vw" className="-z-20 object-cover" />
              <div aria-hidden className="absolute inset-0 -z-10 bg-linear-to-t from-ink/90 via-ink/35 to-ink/60" />
            </>
          ) : (
            <div
              aria-hidden
              className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_right,var(--color-brand),transparent_65%)]"
            />
          )}

          <div className="mx-auto w-full max-w-6xl px-5 pb-20 pt-28 @3xl:pb-24">
            <div className="max-w-3xl space-y-5">
              <span className="relative grid size-20 place-items-center overflow-hidden rounded-2xl bg-white text-4xl font-black text-brand-dark shadow-xl ring-4 ring-white/15 @3xl:size-24">
                {logo ? (
                  <Image src={logo} alt={`Logo de ${negocio.nombre}`} fill sizes="96px" className="object-cover" />
                ) : (
                  <span aria-hidden>{negocio.nombre.charAt(0)}</span>
                )}
              </span>

              {(categoria || ciudad) && (
                <p className="inline-flex rounded-full bg-white/15 px-3 py-1 text-sm font-semibold backdrop-blur">
                  {[categoria?.nombre, ciudad?.nombre].filter(Boolean).join(" · ")}
                </p>
              )}

              <h1
                id="titulo-negocio"
                className="text-4xl font-extrabold leading-[1.05] tracking-tight text-balance @xl:text-5xl @4xl:text-6xl"
              >
                {negocio.nombre}
              </h1>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-white/85">
                {lugar && (
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="size-4" aria-hidden /> {lugar}
                  </span>
                )}
                {promedio !== null && totalResenas > 0 && (
                  <Calificacion
                    {...(seccionResenas && { href: "#resenas" })}
                    className="inline-flex items-center gap-1.5 text-white no-underline hover:underline"
                  >
                    <Star className="size-4 fill-accent text-accent" aria-hidden />
                    <span className="font-bold">
                      {promedio.toLocaleString("es-HN", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                    </span>
                    <span className="text-white/75">
                      ({totalResenas} {totalResenas === 1 ? "reseña" : "reseñas"})
                    </span>
                  </Calificacion>
                )}
                {horario && <EstadoAbierto horario={horario} />}
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 @xl:flex @xl:flex-wrap">
                {ctas.map(({ clave, nodo }, i) => (
                  <Fragment key={clave}>
                    {nodo(i === 0 || (i === ctas.length - 1 && (ctas.length - 1) % 2 === 1) ? "col-span-2" : "")}
                  </Fragment>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Datos rápidos, montados sobre el borde de la portada */}
        <div className="relative z-10 mx-auto -mt-10 max-w-6xl px-5">
          <ul className="grid divide-y divide-ink/10 overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-ink/5 @2xl:auto-cols-fr @2xl:grid-flow-col @2xl:divide-x @2xl:divide-y-0">
            <DatoRapido icono={MapPin} titulo="Dirección" href="#ubicacion">
              {negocio.direccion ?? lugar}
            </DatoRapido>
            {horario && (
              <DatoRapido icono={Clock} titulo="Horario" href="#horario">
                <HorarioHoy horario={horario} />
              </DatoRapido>
            )}
            {(negocio.telefono ?? negocio.whatsapp) && (
              <DatoRapido
                icono={negocio.telefono ? Phone : MessageCircle}
                titulo={negocio.telefono ? "Teléfono" : "WhatsApp"}
                href={telefono ?? whatsapp ?? "#contacto"}
                externo={!telefono}
                evento={telefono ? "llamada" : "whatsapp"}
              >
                {formatearTelefono((negocio.telefono ?? negocio.whatsapp)!)}
              </DatoRapido>
            )}
          </ul>
        </div>

        {/* Sobre nosotros */}
        <section
          id="sobre"
          aria-labelledby="titulo-sobre"
          className="mx-auto grid max-w-6xl scroll-mt-16 gap-10 px-5 py-16 @3xl:py-24 @4xl:grid-cols-[minmax(0,1fr)_22rem] @4xl:gap-16"
        >
          <div>
            <Encabezado antetitulo="Sobre nosotros" titulo={`Conoce ${negocio.nombre}`} id="titulo-sobre" />
            <p className="mt-6 whitespace-pre-line text-lg leading-relaxed text-ink/80">{negocio.descripcion}</p>
          </div>

          <aside className="space-y-6 self-start rounded-2xl bg-brand-light p-6">
            {(negocio.whatsapp || negocio.telefono || negocio.email_contacto) && (
              <div>
                <h3 className="font-bold text-brand-dark">Contáctanos</h3>
                <ul className="mt-3 space-y-3 text-sm">
                  {whatsapp && negocio.whatsapp && (
                    <li>
                      <a href={whatsapp} data-evento="whatsapp" target="_blank" rel="noopener" className="inline-flex items-center gap-2.5 font-medium text-ink no-underline hover:text-brand">
                        <MessageCircle className="size-4 text-brand" aria-hidden /> WhatsApp {formatearTelefono(negocio.whatsapp)}
                      </a>
                    </li>
                  )}
                  {telefono && negocio.telefono && (
                    <li>
                      <a href={telefono} data-evento="llamada" className="inline-flex items-center gap-2.5 font-medium text-ink no-underline hover:text-brand">
                        <Phone className="size-4 text-brand" aria-hidden /> {formatearTelefono(negocio.telefono)}
                      </a>
                    </li>
                  )}
                  {negocio.email_contacto && (
                    <li>
                      <a href={`mailto:${negocio.email_contacto}`} className="inline-flex items-center gap-2.5 break-all font-medium text-ink no-underline hover:text-brand">
                        <Mail className="size-4 shrink-0 text-brand" aria-hidden /> {negocio.email_contacto}
                      </a>
                    </li>
                  )}
                </ul>
              </div>
            )}

            {redes.length > 0 && (
              <div>
                <h3 className="font-bold text-brand-dark">Síguenos</h3>
                <ul className="mt-3 flex flex-wrap gap-2">
                  {redes.map(([red, url]) => (
                    <li key={red}>
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener nofollow"
                        data-evento="redes"
                        className="inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-2 text-sm font-semibold text-brand-dark no-underline ring-1 ring-ink/10 hover:bg-brand-dark hover:text-white"
                      >
                        <IconoRed red={red} className="size-4" /> {NOMBRES_REDES[red]}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <BotonCompartir
              titulo={negocio.nombre}
              url={urlAbsoluta(`/negocio/${negocio.slug}`)}
              className="text-sm font-semibold text-brand-dark hover:text-brand"
            />
          </aside>
        </section>

        {/* Fotos (con una sola, ya es la portada) */}
        {fotos.length > 1 && (
          <section id="fotos" aria-labelledby="titulo-fotos" className="scroll-mt-16 bg-brand-light py-16 @3xl:py-24">
            <div className="mx-auto max-w-6xl space-y-8 px-5">
              <Encabezado antetitulo="Galería" titulo="Nuestras fotos" id="titulo-fotos" />
              <GaleriaNegocio fotos={fotos} />
            </div>
          </section>
        )}

        {/* Horario y ubicación */}
        <section
          aria-label="Horario y ubicación"
          className={cn(
            "mx-auto grid max-w-6xl gap-12 px-5 py-16 @3xl:py-24",
            horario && "@4xl:grid-cols-[22rem_minmax(0,1fr)] @4xl:gap-16",
          )}
        >
          {horario && (
            <div id="horario" className="scroll-mt-20">
              <Encabezado antetitulo="Horario" titulo="Horario de atención" />
              <div className="mt-6 overflow-hidden rounded-2xl ring-1 ring-ink/10">
                <div className="flex items-center justify-between gap-2 border-b border-ink/10 px-4 py-3">
                  <span className="text-sm font-semibold text-brand-dark">Esta semana</span>
                  <EstadoAbierto horario={horario} />
                </div>
                <TablaHorario horario={horario} />
              </div>
              {horario.nota && <p className="mt-3 text-sm text-ink/60">{horario.nota}</p>}
            </div>
          )}

          <div id="ubicacion" className="min-w-0 scroll-mt-20">
            <Encabezado antetitulo="Ubicación" titulo="Cómo llegar" />
            <address className="mt-4 not-italic text-ink/80">
              {negocio.direccion && <p className="font-medium text-ink">{negocio.direccion}</p>}
              <p>{lugarCompleto}</p>
            </address>

            {punto && (
              <Mapa
                punto={punto}
                centro={punto}
                zoom={16}
                perezoso
                etiqueta={`Mapa con la ubicación de ${negocio.nombre}`}
                className="mt-6 h-72 rounded-2xl ring-1 ring-ink/10 @3xl:h-96"
              />
            )}

            <div className="mt-5 flex flex-wrap gap-3">
              {punto ? (
                <>
                  <a
                    href={enlaceComoLlegar(punto)}
                    data-evento="mapa"
                    target="_blank"
                    rel="noopener"
                    className={cn(clasesBoton({ tamano: "lg" }), "rounded-full")}
                  >
                    <Navigation className="size-5" aria-hidden /> Ir con Google Maps
                  </a>
                  <a
                    href={enlaceWaze(punto)}
                    data-evento="mapa"
                    target="_blank"
                    rel="noopener"
                    className={cn(clasesBoton({ variante: "secundario", tamano: "lg" }), "rounded-full")}
                  >
                    <Navigation className="size-5" aria-hidden /> Ir con Waze
                  </a>
                  {negocio.enlace_mapa && (
                    <a
                      href={negocio.enlace_mapa}
                      data-evento="mapa"
                      target="_blank"
                      rel="noopener nofollow"
                      className={cn(clasesBoton({ variante: "fantasma", tamano: "lg" }), "rounded-full")}
                    >
                      Ver ficha en Google Maps <ArrowUpRight className="size-4" aria-hidden />
                    </a>
                  )}
                </>
              ) : (
                <a
                  href={verEnMapa}
                  data-evento="mapa"
                  target="_blank"
                  rel="noopener nofollow"
                  className={cn(clasesBoton({ tamano: "lg" }), "rounded-full")}
                >
                  <MapPin className="size-5" aria-hidden />
                  {negocio.enlace_mapa ? "Ver en Google Maps" : "Buscar en Google Maps"}
                </a>
              )}
            </div>
          </div>
        </section>

        {seccionResenas && (
          <div className="bg-brand-light py-16 @3xl:py-24">
            <div className="mx-auto max-w-4xl px-5">{seccionResenas}</div>
          </div>
        )}

        {/* Contacto */}
        <section id="contacto" aria-labelledby="titulo-contacto" className="scroll-mt-16 bg-brand-dark text-white">
          <div className="mx-auto max-w-6xl px-5 py-16 @3xl:py-20">
            <div className="grid gap-8 @4xl:grid-cols-[minmax(0,1fr)_auto] @4xl:items-end">
              <div>
                <h2 id="titulo-contacto" className="text-3xl font-extrabold tracking-tight text-balance @3xl:text-4xl">
                  {contactoPrincipal ? "¿Tienes alguna pregunta?" : `Visita ${negocio.nombre}`}
                </h2>
                <p className="mt-3 max-w-xl text-lg text-white/75">
                  {contactoPrincipal ? "Escríbenos o llámanos, con gusto te atendemos." : lugarCompleto}
                </p>
              </div>
              {contactoPrincipal && (
                <div className="flex flex-wrap gap-3">
                  {whatsapp && (
                    <a href={whatsapp} data-evento="whatsapp" target="_blank" rel="noopener" className={cn(CTA.base, CTA.acento)}>
                      <MessageCircle className="size-5" aria-hidden /> WhatsApp
                    </a>
                  )}
                  {telefono && (
                    <a href={telefono} data-evento="llamada" className={cn(CTA.base, whatsapp ? CTA.claro : CTA.acento)}>
                      <Phone className="size-5" aria-hidden /> Llamar
                    </a>
                  )}
                </div>
              )}
            </div>

            <dl className="mt-12 grid gap-8 border-t border-white/15 pt-10 text-sm @2xl:grid-cols-2 @4xl:grid-cols-4">
              <div>
                <dt className="font-semibold text-white">Dirección</dt>
                <dd className="mt-1.5 text-white/70">
                  {negocio.direccion && <span className="block">{negocio.direccion}</span>}
                  {lugarCompleto}
                </dd>
              </div>
              {(negocio.telefono || negocio.whatsapp) && (
                <div>
                  <dt className="font-semibold text-white">Teléfono</dt>
                  <dd className="mt-1.5 space-y-1 text-white/70">
                    {negocio.telefono && <span className="block">{formatearTelefono(negocio.telefono)}</span>}
                    {negocio.whatsapp && negocio.whatsapp !== negocio.telefono && (
                      <span className="block">WhatsApp {formatearTelefono(negocio.whatsapp)}</span>
                    )}
                  </dd>
                </div>
              )}
              {negocio.email_contacto && (
                <div>
                  <dt className="font-semibold text-white">Correo</dt>
                  <dd className="mt-1.5 break-all">
                    <a href={`mailto:${negocio.email_contacto}`} className="text-white/70 no-underline hover:text-white">
                      {negocio.email_contacto}
                    </a>
                  </dd>
                </div>
              )}
              {redes.length > 0 && (
                <div>
                  <dt className="font-semibold text-white">Síguenos</dt>
                  <dd className="mt-2.5">
                    <ul className="flex flex-wrap gap-2">
                      {redes.map(([red, url]) => (
                        <li key={red}>
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener nofollow"
                            data-evento="redes"
                            aria-label={NOMBRES_REDES[red]}
                            title={NOMBRES_REDES[red]}
                            className="grid size-10 place-items-center rounded-full bg-white/10 text-white hover:bg-white hover:text-brand-dark"
                          >
                            <IconoRed red={red} className="size-5" />
                          </a>
                        </li>
                      ))}
                    </ul>
                  </dd>
                </div>
              )}
            </dl>
          </div>
        </section>
      </Principal>

      {/* Firma discreta de EmprendeHN */}
      <footer className="@container bg-white">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 px-5 py-6 text-center text-xs text-ink/55 @3xl:flex-row @3xl:justify-between @3xl:text-left">
          <p className="inline-flex items-center gap-2">
            <span aria-hidden className="grid size-5 shrink-0 place-items-center rounded bg-accent text-[10px] font-black text-ink">
              E
            </span>
            <span>
              Página creada con{" "}
              <Link href="/" className="font-semibold text-ink/70 no-underline hover:text-brand hover:underline">
                EmprendeHN
              </Link>
              , el directorio de negocios de Honduras
            </span>
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
            {categoria && ciudad && (
              <Link
                href={`/categoria/${categoria.slug}/${ciudad.slug}`}
                className="text-ink/55 no-underline hover:text-brand hover:underline"
              >
                Más {categoria.nombre.toLowerCase()} en {ciudad.nombre}
              </Link>
            )}
            <Link href="/registro" className="text-ink/55 no-underline hover:text-brand hover:underline">
              ¿Tienes un negocio? Crea tu página gratis
            </Link>
            {alPie}
          </div>
        </div>
      </footer>

      {/* Contacto siempre a mano en el celular */}
      {publico && contactoPrincipal && (
        <div className="fixed inset-x-0 bottom-0 z-30 flex gap-2 border-t border-ink/10 bg-white/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur md:hidden">
          {whatsapp && (
            <a
              href={whatsapp}
              data-evento="whatsapp"
              target="_blank"
              rel="noopener"
              className="flex flex-1 items-center justify-center gap-2 rounded-full bg-accent px-3 py-3 text-sm font-bold text-ink no-underline"
            >
              <MessageCircle className="size-5" aria-hidden /> WhatsApp
            </a>
          )}
          {telefono && (
            <a
              href={telefono}
              data-evento="llamada"
              className="flex flex-1 items-center justify-center gap-2 rounded-full bg-brand-dark px-3 py-3 text-sm font-bold text-white no-underline"
            >
              <Phone className="size-5" aria-hidden /> Llamar
            </a>
          )}
          {punto && (
            <a
              href={enlaceComoLlegar(punto)}
              data-evento="mapa"
              target="_blank"
              rel="noopener"
              aria-label="Cómo llegar"
              className="grid size-12 shrink-0 place-items-center rounded-full bg-white text-brand-dark ring-1 ring-inset ring-brand-dark/20"
            >
              <Navigation className="size-5" aria-hidden />
            </a>
          )}
        </div>
      )}
    </div>
  );
}
