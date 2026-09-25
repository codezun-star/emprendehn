"use client";

import { ArrowLeft, ArrowRight, ImagePlus, Trash2 } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";

import { Boton } from "@/components/ui/boton";
import { toast } from "@/components/ui/toast";
import {
  actualizarLogo,
  actualizarTextoAlternativo,
  eliminarImagen,
  moverImagen,
  quitarLogo,
  registrarImagen,
} from "@/lib/acciones/galeria";
import { prepararImagen, TIPOS_ACEPTADOS } from "@/lib/imagenes-cliente";
import { BUCKET_IMAGENES, urlImagen } from "@/lib/storage";
import { crearClienteNavegador } from "@/lib/supabase/client";

type Imagen = { id: string; storage_path: string; alt_text: string | null };

async function subirArchivo(ruta: string, blob: Blob, contentType: string) {
  const supabase = crearClienteNavegador();
  const { error } = await supabase.storage.from(BUCKET_IMAGENES).upload(ruta, blob, {
    contentType,
    cacheControl: "31536000",
    upsert: false,
  });
  if (error) throw new Error("No se pudo subir la imagen. Revisa tu conexión e inténtalo de nuevo.");
}

export function GestorGaleria({
  negocioId,
  nombreNegocio,
  imagenes,
  maxImagenes,
  logoPath,
}: {
  negocioId: string;
  nombreNegocio: string;
  imagenes: Imagen[];
  maxImagenes: number;
  logoPath: string | null;
}) {
  const router = useRouter();
  const inputFotos = useRef<HTMLInputElement>(null);
  const inputLogo = useRef<HTMLInputElement>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [pendiente, iniciarTransicion] = useTransition();

  const disponibles = Math.max(0, maxImagenes - imagenes.length);

  // El progreso y el resultado van en un toast: se ven aunque la persona esté
  // más abajo, mirando la galería.
  async function alElegirFotos(archivos: FileList | null) {
    if (!archivos?.length) return;
    const lista = [...archivos].slice(0, disponibles);
    if (archivos.length > disponibles) {
      toast.info(`Tu plan permite ${maxImagenes} fotos`, { descripcion: `Solo se subirán ${disponibles}.` });
    }
    setSubiendo(true);
    const id = toast.cargando(lista.length === 1 ? "Subiendo foto…" : `Subiendo foto 1 de ${lista.length}…`);
    let subidas = 0;
    try {
      for (const [i, archivo] of lista.entries()) {
        if (i > 0) toast.cargando(`Subiendo foto ${i + 1} de ${lista.length}…`, { id });
        const imagen = await prepararImagen(archivo, 1600);
        const ruta = `${negocioId}/${crypto.randomUUID()}.${imagen.extension}`;
        await subirArchivo(ruta, imagen.blob, imagen.contentType);
        const resultado = await registrarImagen({ negocioId, ruta, ancho: imagen.ancho, alto: imagen.alto });
        if (!resultado.ok) throw new Error(resultado.error);
        subidas++;
      }
      toast.exito(subidas === 1 ? "Foto agregada" : `${subidas} fotos agregadas`, { id });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo subir la imagen.", {
        id,
        ...(subidas > 0 && { descripcion: `Se subieron ${subidas} de ${lista.length}.` }),
      });
    } finally {
      setSubiendo(false);
      if (inputFotos.current) inputFotos.current.value = "";
      router.refresh();
    }
  }

  async function alElegirLogo(archivos: FileList | null) {
    const archivo = archivos?.[0];
    if (!archivo) return;
    setSubiendo(true);
    const id = toast.cargando("Subiendo logo…");
    try {
      const imagen = await prepararImagen(archivo, 512);
      const ruta = `${negocioId}/logo-${crypto.randomUUID()}.${imagen.extension}`;
      await subirArchivo(ruta, imagen.blob, imagen.contentType);
      const resultado = await actualizarLogo({ negocioId, ruta });
      if (!resultado.ok) throw new Error(resultado.error);
      toast.exito("Logo actualizado", { id });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo subir el logo.", { id });
    } finally {
      setSubiendo(false);
      if (inputLogo.current) inputLogo.current.value = "";
      router.refresh();
    }
  }

  /** `exito`: toast al terminar bien (mover una foto no lo necesita: se ve el cambio). */
  function ejecutar(accion: () => Promise<{ ok: boolean; error?: string }>, exito?: string) {
    iniciarTransicion(async () => {
      const resultado = await accion();
      if (!resultado.ok) toast.error(resultado.error ?? "Ocurrió un error.");
      else if (exito) toast.exito(exito);
      router.refresh();
    });
  }

  const ocupado = subiendo || pendiente;

  return (
    <div className="space-y-8">

      <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-brand-dark/10 sm:p-6">
        <h2 className="text-lg font-bold text-brand-dark">Logo</h2>
        <p className="mb-4 text-sm text-ink/60">Se muestra junto al nombre de tu negocio. Ideal: imagen cuadrada.</p>
        <div className="flex items-center gap-4">
          <div className="relative grid size-24 shrink-0 place-items-center overflow-hidden rounded-xl bg-brand-light ring-1 ring-brand-dark/10">
            {logoPath ? (
              <Image src={urlImagen(logoPath)} alt={`Logo de ${nombreNegocio}`} fill sizes="96px" className="object-cover" />
            ) : (
              <span className="text-3xl font-black text-brand-dark/30">{nombreNegocio.charAt(0)}</span>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <input
              ref={inputLogo}
              type="file"
              accept={TIPOS_ACEPTADOS}
              className="sr-only"
              id="subir-logo"
              onChange={(ev) => alElegirLogo(ev.target.files)}
              disabled={ocupado}
            />
            <Boton variante="secundario" tamano="sm" disabled={ocupado} onClick={() => inputLogo.current?.click()}>
              {logoPath ? "Cambiar logo" : "Subir logo"}
            </Boton>
            {logoPath && (
              <Boton variante="fantasma" tamano="sm" disabled={ocupado} onClick={() => ejecutar(() => quitarLogo(negocioId), "Logo quitado")}>
                Quitar
              </Boton>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-brand-dark/10 sm:p-6">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-brand-dark">Fotos</h2>
            <p className="text-sm text-ink/60">
              {imagenes.length} de {maxImagenes} fotos. La primera es la portada de tu negocio.
            </p>
          </div>
          <input
            ref={inputFotos}
            type="file"
            accept={TIPOS_ACEPTADOS}
            multiple
            className="sr-only"
            id="subir-fotos"
            onChange={(ev) => alElegirFotos(ev.target.files)}
            disabled={ocupado || disponibles === 0}
          />
          <Boton
            variante="acento"
            disabled={ocupado || disponibles === 0}
            onClick={() => inputFotos.current?.click()}
          >
            <ImagePlus className="size-4" aria-hidden />
            Agregar fotos
          </Boton>
        </div>

        {imagenes.length === 0 ? (
          <button
            type="button"
            onClick={() => inputFotos.current?.click()}
            disabled={ocupado}
            className="grid w-full place-items-center rounded-xl border-2 border-dashed border-brand-dark/20 px-4 py-12 text-center text-sm text-ink/60 hover:border-brand hover:text-brand"
          >
            <ImagePlus className="mb-2 size-8" aria-hidden />
            Sube fotos de tu local, tus productos o tu trabajo. Los perfiles con fotos reciben muchas
            más visitas.
          </button>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {imagenes.map((imagen, i) => (
              <li key={imagen.id} className="overflow-hidden rounded-xl ring-1 ring-brand-dark/10">
                <div className="relative aspect-[4/3] bg-brand-light">
                  <Image
                    src={urlImagen(imagen.storage_path)}
                    alt={imagen.alt_text ?? `Foto ${i + 1} de ${nombreNegocio}`}
                    fill
                    sizes="(min-width: 1024px) 300px, (min-width: 640px) 50vw, 100vw"
                    className="object-cover"
                  />
                  {i === 0 && (
                    <span className="absolute left-2 top-2 rounded-full bg-accent px-2 py-0.5 text-xs font-semibold text-ink">
                      Portada
                    </span>
                  )}
                </div>
                <div className="space-y-2 p-3">
                  <input
                    type="text"
                    defaultValue={imagen.alt_text ?? ""}
                    maxLength={200}
                    placeholder="Describe la foto (ayuda al SEO)"
                    aria-label={`Descripción de la foto ${i + 1}`}
                    className="w-full rounded-md border border-brand-dark/15 px-2 py-1.5 text-xs"
                    onBlur={(ev) => {
                      if (ev.target.value !== (imagen.alt_text ?? "")) {
                        ejecutar(() => actualizarTextoAlternativo(imagen.id, ev.target.value), "Descripción guardada");
                      }
                    }}
                  />
                  <div className="flex items-center justify-between">
                    <div className="flex gap-1">
                      <button
                        type="button"
                        disabled={ocupado || i === 0}
                        onClick={() => ejecutar(() => moverImagen(imagen.id, -1))}
                        className="rounded-md p-1.5 text-brand-dark hover:bg-brand-light disabled:opacity-30"
                        aria-label="Mover a la izquierda"
                      >
                        <ArrowLeft className="size-4" />
                      </button>
                      <button
                        type="button"
                        disabled={ocupado || i === imagenes.length - 1}
                        onClick={() => ejecutar(() => moverImagen(imagen.id, 1))}
                        className="rounded-md p-1.5 text-brand-dark hover:bg-brand-light disabled:opacity-30"
                        aria-label="Mover a la derecha"
                      >
                        <ArrowRight className="size-4" />
                      </button>
                    </div>
                    <button
                      type="button"
                      disabled={ocupado}
                      onClick={() => {
                        if (confirm("¿Eliminar esta foto?")) ejecutar(() => eliminarImagen(imagen.id), "Foto eliminada");
                      }}
                      className="inline-flex items-center gap-1 rounded-md p-1.5 text-xs font-semibold text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="size-4" aria-hidden /> Eliminar
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
