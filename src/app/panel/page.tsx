import { ExternalLink, Images, Pencil, Plus, Store } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { Alerta } from "@/components/ui/alerta";
import { BotonEnlace } from "@/components/ui/boton";
import { InsigniaEstado, InsigniaPlan } from "@/components/ui/insignia-estado";
import { requerirUsuario } from "@/lib/auth";
import { MAX_NEGOCIOS_POR_CUENTA } from "@/lib/constantes";
import { obtenerCategorias, obtenerMunicipios } from "@/lib/consultas/directorio";
import { obtenerMisNegocios } from "@/lib/consultas/panel";
import { urlImagen } from "@/lib/storage";

export const metadata: Metadata = { title: "Mis negocios" };

const AVISOS: Record<string, { tono: "exito" | "info"; texto: string }> = {
  "cuenta-confirmada": { tono: "exito", texto: "¡Tu cuenta está confirmada! Ya puedes registrar tu negocio." },
  "contrasena-actualizada": { tono: "exito", texto: "Tu contraseña se actualizó correctamente." },
  "negocio-eliminado": { tono: "info", texto: "El negocio fue eliminado." },
};

export default async function PaginaPanel({ searchParams }: PageProps<"/panel">) {
  const sesion = await requerirUsuario("/panel");
  const [{ aviso }, negocios, { porId: categorias }, { porId: municipios }] = await Promise.all([
    searchParams,
    obtenerMisNegocios(sesion.userId),
    obtenerCategorias(),
    obtenerMunicipios(),
  ]);
  const mensaje = typeof aviso === "string" ? AVISOS[aviso] : undefined;
  const nombre = sesion.perfil?.nombre_completo?.split(" ")[0];

  return (
    <div className="space-y-6">
      {mensaje && <Alerta tono={mensaje.tono}>{mensaje.texto}</Alerta>}

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-brand-dark">
            {nombre ? `Hola, ${nombre}` : "Mis negocios"}
          </h1>
          <p className="text-sm text-ink/70">Administra el perfil público de tus negocios.</p>
        </div>
        {negocios.length > 0 && negocios.length < MAX_NEGOCIOS_POR_CUENTA && (
          <BotonEnlace href="/panel/negocios/nuevo" variante="secundario">
            <Plus className="size-4" aria-hidden /> Registrar otro negocio
          </BotonEnlace>
        )}
      </div>

      {negocios.length === 0 ? (
        <div className="rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-brand-dark/10">
          <Store className="mx-auto mb-3 size-12 text-brand" aria-hidden />
          <h2 className="text-xl font-bold text-brand-dark">Registra tu primer negocio</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-ink/70">
            Completa los datos de tu negocio, agrega fotos y, una vez aprobado, tendrás tu propia
            página en EmprendeHN lista para aparecer en Google.
          </p>
          <BotonEnlace href="/panel/negocios/nuevo" variante="acento" tamano="lg" className="mt-6">
            Registrar mi negocio
          </BotonEnlace>
        </div>
      ) : (
        <ul className="space-y-4">
          {negocios.map((n) => {
            const categoria = categorias.get(n.category_id);
            const ciudad = municipios.get(n.municipio_id);
            return (
              <li key={n.id} className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-brand-dark/10">
                <div className="flex gap-4">
                  <div className="relative grid size-16 shrink-0 place-items-center overflow-hidden rounded-xl bg-brand-light ring-1 ring-brand-dark/10">
                    {n.logo_path ? (
                      <Image src={urlImagen(n.logo_path)} alt="" fill sizes="64px" className="object-cover" />
                    ) : (
                      <span className="text-2xl font-black text-brand-dark/30">{n.nombre.charAt(0)}</span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="truncate text-lg font-bold text-brand-dark">{n.nombre}</h2>
                      <InsigniaEstado estado={n.estado} />
                      <InsigniaPlan plan={n.plan} />
                    </div>
                    <p className="text-sm text-ink/60">
                      {[categoria?.nombre, ciudad?.nombre].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                </div>

                <div className="mt-4">
                  {n.estado === "pendiente" && (
                    <Alerta tono="aviso">
                      Tu negocio está en revisión. Te avisaremos por correo cuando esté publicado.
                      Mientras tanto puedes editarlo y agregar fotos.
                    </Alerta>
                  )}
                  {(n.estado === "rechazado" || n.estado === "suspendido") && (
                    <Alerta tono="error" titulo={n.estado === "rechazado" ? "Necesita cambios" : "Negocio suspendido"}>
                      {n.motivo_estado && <p>{n.motivo_estado}</p>}
                      <p className={n.motivo_estado ? "mt-1" : undefined}>
                        Corrige los datos y guarda (o agrega fotos): volverá a revisión automáticamente.
                      </p>
                    </Alerta>
                  )}
                  {n.estado === "aprobado" && (
                    <Alerta tono="exito">
                      Tu página está publicada en{" "}
                      <Link href={`/negocio/${n.slug}`} className="font-semibold break-all">
                        emprendehn.com/negocio/{n.slug}
                      </Link>
                    </Alerta>
                  )}
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <BotonEnlace href={`/panel/negocios/${n.id}`} variante="secundario" tamano="sm">
                    <Pencil className="size-4" aria-hidden /> Editar datos
                  </BotonEnlace>
                  <BotonEnlace href={`/panel/negocios/${n.id}/galeria`} variante="secundario" tamano="sm">
                    <Images className="size-4" aria-hidden /> Fotos ({n.totalImagenes})
                  </BotonEnlace>
                  <BotonEnlace
                    href={n.estado === "aprobado" ? `/negocio/${n.slug}` : `/panel/negocios/${n.id}/vista-previa`}
                    variante="fantasma"
                    tamano="sm"
                  >
                    <ExternalLink className="size-4" aria-hidden />
                    {n.estado === "aprobado" ? "Ver página" : "Vista previa"}
                  </BotonEnlace>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
