import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { cache } from "react";

import { RastreoNegocio } from "@/components/directorio/rastreo-negocio";
import { ReportarNegocio } from "@/components/directorio/reportar-negocio";
import { PaginaNegocio } from "@/components/negocio/pagina-negocio";
import { SeccionResenas } from "@/components/resenas/seccion-resenas";
import { JsonLd } from "@/components/seo/json-ld";
import {
  obtenerCategorias,
  obtenerMunicipios,
  obtenerNegocioPublico,
  obtenerResenasPublicas,
  obtenerSlugActual,
} from "@/lib/consultas/directorio";
import { jsonLdMigas, jsonLdNegocio, type Miga } from "@/lib/seo";
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

export default async function PaginaPublicaNegocio({ params }: PageProps<"/negocio/[slug]">) {
  const { slug } = await params;
  const { negocio, categoria, categoriaPadre, ciudad } = await cargarNegocio(slug);
  const resenas = await obtenerResenasPublicas(negocio.id);

  // Sin migas visibles (la página se ve como sitio propio), pero Google las sigue recibiendo.
  const migas: Miga[] = [
    { nombre: "Inicio", ruta: "/" },
    ...(categoriaPadre ? [{ nombre: categoriaPadre.nombre, ruta: `/categoria/${categoriaPadre.slug}` }] : []),
    ...(categoria ? [{ nombre: categoria.nombre, ruta: `/categoria/${categoria.slug}` }] : []),
    ...(categoria && ciudad ? [{ nombre: ciudad.nombre, ruta: `/categoria/${categoria.slug}/${ciudad.slug}` }] : []),
    { nombre: negocio.nombre, ruta: `/negocio/${negocio.slug}` },
  ];

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
      <JsonLd datos={jsonLdMigas(migas)} />
      <RastreoNegocio negocioId={negocio.id} />
      <PaginaNegocio
        negocio={negocio}
        categoria={categoria}
        ciudad={ciudad}
        alPie={<ReportarNegocio negocioId={negocio.id} nombre={negocio.nombre} />}
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
    </>
  );
}
