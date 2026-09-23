import { MapPin } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import type { ResultadoBusqueda } from "@/lib/consultas/directorio";
import { urlImagen } from "@/lib/storage";
import { resumir } from "@/lib/utils";

export function TarjetaNegocio({ negocio, prioridad = false }: { negocio: ResultadoBusqueda; prioridad?: boolean }) {
  const imagen = negocio.portada_path ?? negocio.logo_path;
  const destacado = negocio.plan !== "gratis";

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-brand-dark/10 transition hover:shadow-md hover:ring-brand/40">
      <div className="relative aspect-[16/10] bg-brand-dark/5">
        {imagen ? (
          <Image
            src={urlImagen(imagen)}
            alt=""
            fill
            preload={prioridad}
            sizes="(min-width: 1024px) 360px, (min-width: 640px) 50vw, 100vw"
            className="object-cover transition duration-300 group-hover:scale-[1.02]"
          />
        ) : (
          <div className="grid h-full place-items-center text-5xl font-black text-brand-dark/15">
            {negocio.nombre.charAt(0)}
          </div>
        )}
        {destacado && (
          <span className="absolute left-3 top-3 rounded-full bg-accent px-2.5 py-0.5 text-xs font-semibold text-ink">
            Destacado
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand">{negocio.categoria_nombre}</p>
        <h3 className="text-lg font-bold leading-snug text-brand-dark">
          <Link href={`/negocio/${negocio.slug}`} className="text-brand-dark no-underline after:absolute after:inset-0">
            {negocio.nombre}
          </Link>
        </h3>
        <p className="line-clamp-2 text-sm text-ink/70">{resumir(negocio.descripcion, 140)}</p>
        <p className="mt-auto flex items-center gap-1 pt-2 text-xs text-ink/60">
          <MapPin className="size-3.5 shrink-0" aria-hidden />
          {[negocio.localidad, negocio.municipio_nombre].filter(Boolean).join(", ")}
        </p>
      </div>
    </article>
  );
}

export function RejillaNegocios({ negocios }: { negocios: ResultadoBusqueda[] }) {
  return (
    <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {negocios.map((n, i) => (
        <li key={n.id} className="flex">
          <div className="w-full">
            <TarjetaNegocio negocio={n} prioridad={i < 3} />
          </div>
        </li>
      ))}
    </ul>
  );
}
