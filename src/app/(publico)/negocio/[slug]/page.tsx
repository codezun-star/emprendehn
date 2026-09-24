import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { cache } from "react";

import { PerfilNegocio } from "@/components/directorio/perfil-negocio";
import { RastreoNegocio } from "@/components/directorio/rastreo-negocio";
import { ReportarNegocio } from "@/components/directorio/reportar-negocio";
import { RejillaNegocios } from "@/components/directorio/tarjeta-negocio";
import { SeccionResenas } from "@/components/resenas/seccion-resenas";
import { JsonLd } from "@/components/seo/json-ld";
import {
  buscarNegocios,
  obtenerCategorias,
  obtenerMunicipios,
  obtenerNegocioPublico,
  obtenerResenasPublicas,
  obtenerSlugActual,
} from "@/lib/consultas/directorio";
import { jsonLdNegocio } from "@/lib/seo";
import { urlImagen } from "@/lib/storage";
import { resumir } from "@/lib/utils";

// ISR: cada perfil se genera en su primera visita y queda cacheado. Se
// regenera on-demand cuando el dueño lo edita o el admin cambia su estado
// (revalidatePath) y, como red de seguridad, una vez al día.
export const revalidate = 86400;

export async function generateStaticParams() {
  return [];
}

const cargarNegocio = cache(async (slug: string) => {
  const negocio = await obtenerNegocioPublico(slug);
  if (!negocio) {
    // URL anterior de un negocio al que el admin le cambió el slug: 308 permanente.
    const actual = await obtenerSlugActual(slug);
    if (actual) permanentRedirect(`/negocio/${actual}`);
    notFound();
  }
  const [{ porId: categorias }, { porId: municipios }] = await Promise.all([
    obtenerCategorias(),
    obtenerMunicipios(),
  ]);
  const categoria = categorias.get(negocio.category_id);
  const categoriaPadre = categoria?.parent_id ? categorias.get(categoria.parent_id) : undefined;
  const ciudad = municipios.get(negocio.municipio_id);
  return { negocio, categoria, categoriaPadre, ciudad };
});

export async function generateMetadata({ params }: PageProps<"/negocio/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const { negocio, categoria, ciudad } = await cargarNegocio(slug);

  const titulo = [negocio.nombre, [categoria?.nombre, ciudad?.nombre].filter(Boolean).join(" en ")]
    .filter(Boolean)
    .join(" · ");
  const descripcion = resumir(negocio.descripcion, 155);
  const imagen = negocio.imagenes[0]?.storage_path ?? negocio.logo_path;
  const ruta = `/negocio/${negocio.slug}`;

  return {
    title: titulo,
    description: descripcion,
    alternates: { canonical: ruta },
    openGraph: {
      title: negocio.nombre,
      description: descripcion,
      url: ruta,
      type: "website",
      ...(imagen && { images: [{ url: urlImagen(imagen), alt: negocio.nombre }] }),
    },
  };
}

export default async function PaginaNegocio({ params }: PageProps<"/negocio/[slug]">) {
  const { slug } = await params;
  const { negocio, categoria, categoriaPadre, ciudad } = await cargarNegocio(slug);
  const resenas = await obtenerResenasPublicas(negocio.id);

  const { negocios: cercanos } = await buscarNegocios({
    categoria: categoria?.slug,
    ciudad: ciudad?.slug,
    limite: 4,
  });
  const relacionados = cercanos.filter((n) => n.id !== negocio.id).slice(0, 3);

  return (
    <>
      <JsonLd
        datos={jsonLdNegocio({
          ...negocio,
          schemaType: categoria?.schema_type ?? categoriaPadre?.schema_type ?? "LocalBusiness",
          categoria: categoria?.nombre ?? "",
          ciudad: ciudad?.nombre ?? "",
          departamento: ciudad?.departamento.nombre ?? "",
          resenas: resenas.slice(0, 5),
        })}
      />
      <RastreoNegocio negocioId={negocio.id} />
      <PerfilNegocio
        negocio={negocio}
        categoria={categoria}
        categoriaPadre={categoriaPadre}
        ciudad={ciudad}
        barraContactoMovil
        debajoDeContacto={<ReportarNegocio negocioId={negocio.id} nombre={negocio.nombre} />}
        seccionResenas={
          <SeccionResenas
            negocioId={negocio.id}
            slug={negocio.slug}
            promedio={negocio.calificacion_promedio}
            total={negocio.total_resenas}
            resenas={resenas}
          />
        }
      />
      {relacionados.length > 0 && categoria && ciudad && (
        <section className="mx-auto max-w-6xl px-4 pb-8">
          <h2 className="mb-4 text-xl font-bold text-brand-dark">
            Más {categoria.nombre.toLowerCase()} en {ciudad.nombre}
          </h2>
          <RejillaNegocios negocios={relacionados} />
        </section>
      )}
    </>
  );
}
