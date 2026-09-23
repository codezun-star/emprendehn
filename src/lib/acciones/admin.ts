"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { obtenerSesion } from "@/lib/auth";
import { revalidarCategorias, revalidarDirectorio } from "@/lib/revalidacion";
import { BUCKET_IMAGENES } from "@/lib/storage";
import { crearClienteServidor } from "@/lib/supabase/server";
import {
  categoriaSchema,
  moderacionSchema,
  planSchema,
  type CategoriaInput,
} from "@/lib/validaciones/admin";
import { falloValidacion, type ResultadoAccion } from "@/lib/validaciones/comun";

import { errorDeBaseDeDatos } from "./errores-db";

const NO_AUTORIZADO: ResultadoAccion<never> = { ok: false, error: "No autorizado." };

/** Cada acción vuelve a verificar el rol (además de RLS en la base de datos). */
async function clienteAdmin() {
  const sesion = await obtenerSesion();
  if (!sesion?.esAdmin) return null;
  return crearClienteServidor();
}

async function negocioParaRevalidar(supabase: Awaited<ReturnType<typeof crearClienteServidor>>, id: string) {
  const { data } = await supabase
    .from("businesses")
    .select("slug, category_id, municipio_id, estado")
    .eq("id", id)
    .maybeSingle();
  return data;
}

export async function moderarNegocio(
  id: string,
  input: z.input<typeof moderacionSchema>,
): Promise<ResultadoAccion> {
  const supabase = await clienteAdmin();
  if (!supabase) return NO_AUTORIZADO;
  if (!z.uuid().safeParse(id).success) return { ok: false, error: "Negocio no encontrado." };
  const parsed = moderacionSchema.safeParse(input);
  if (!parsed.success) return falloValidacion(parsed.error);
  const { estado, motivo } = parsed.data;

  const { data, error } = await supabase
    .from("businesses")
    .update({
      estado,
      motivo_estado: estado === "rechazado" || estado === "suspendido" ? motivo : null,
    })
    .eq("id", id)
    .select("slug, category_id, municipio_id")
    .single();
  if (error) return errorDeBaseDeDatos(error);

  // Aprobar publica la página; rechazar/suspender la retira (404 en la próxima visita).
  await revalidarDirectorio(data);
  // TODO(email): notificar al emprendedor vía Resend cuando se implementen los correos.
  const mensajes = {
    aprobado: "Negocio aprobado y publicado.",
    rechazado: "Negocio rechazado. El emprendedor verá el motivo en su panel.",
    suspendido: "Negocio suspendido y retirado del directorio.",
    pendiente: "Negocio devuelto a revisión.",
  } as const;
  return { ok: true, mensaje: mensajes[estado] };
}

export async function cambiarPlan(id: string, input: z.input<typeof planSchema>): Promise<ResultadoAccion> {
  const supabase = await clienteAdmin();
  if (!supabase) return NO_AUTORIZADO;
  if (!z.uuid().safeParse(id).success) return { ok: false, error: "Negocio no encontrado." };
  const parsed = planSchema.safeParse(input);
  if (!parsed.success) return falloValidacion(parsed.error);

  const { data, error } = await supabase
    .from("businesses")
    .update({ plan: parsed.data.plan })
    .eq("id", id)
    .select("slug, category_id, municipio_id, estado")
    .single();
  if (error) return errorDeBaseDeDatos(error);

  if (data.estado === "aprobado") await revalidarDirectorio(data);
  return { ok: true, mensaje: "Plan actualizado." };
}

export async function eliminarNegocioAdmin(id: string): Promise<ResultadoAccion> {
  const supabase = await clienteAdmin();
  if (!supabase) return NO_AUTORIZADO;
  if (!z.uuid().safeParse(id).success) return { ok: false, error: "Negocio no encontrado." };

  const negocio = await negocioParaRevalidar(supabase, id);
  if (!negocio) return { ok: false, error: "Negocio no encontrado." };

  const { data: archivos } = await supabase.storage.from(BUCKET_IMAGENES).list(id, { limit: 100 });
  if (archivos?.length) {
    await supabase.storage.from(BUCKET_IMAGENES).remove(archivos.map((a) => `${id}/${a.name}`));
  }
  const { error } = await supabase.from("businesses").delete().eq("id", id);
  if (error) return errorDeBaseDeDatos(error);

  if (negocio.estado === "aprobado") await revalidarDirectorio(negocio);
  redirect("/admin?aviso=negocio-eliminado");
}

export async function guardarCategoria(id: string | null, input: CategoriaInput): Promise<ResultadoAccion> {
  const supabase = await clienteAdmin();
  if (!supabase) return NO_AUTORIZADO;
  if (id && !z.uuid().safeParse(id).success) return { ok: false, error: "Categoría no encontrada." };
  const parsed = categoriaSchema.safeParse(input);
  if (!parsed.success) return falloValidacion(parsed.error);
  if (id && parsed.data.parent_id === id) {
    return { ok: false, error: "Una categoría no puede ser su propia categoría padre." };
  }

  // slug vacío -> la base de datos lo genera a partir del nombre (trigger).
  const fila = parsed.data;
  const { error } = id
    ? await supabase.from("categories").update(fila).eq("id", id)
    : await supabase.from("categories").insert(fila);
  if (error) {
    if (error.code === "23505") {
      return { ok: false, error: "Ya existe una categoría con ese slug.", campos: { slug: "Slug en uso" } };
    }
    if (error.code === "23514" && error.message.includes("niveles")) {
      return { ok: false, error: error.message };
    }
    return errorDeBaseDeDatos(error);
  }

  revalidarCategorias();
  redirect("/admin/categorias?aviso=guardada");
}

export async function eliminarCategoria(id: string): Promise<ResultadoAccion> {
  const supabase = await clienteAdmin();
  if (!supabase) return NO_AUTORIZADO;
  if (!z.uuid().safeParse(id).success) return { ok: false, error: "Categoría no encontrada." };

  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) {
    if (error.code === "23503") {
      return {
        ok: false,
        error:
          "No se puede eliminar: tiene negocios o subcategorías asociadas. Muévelos a otra categoría o desactívala.",
      };
    }
    return errorDeBaseDeDatos(error);
  }

  revalidarCategorias();
  redirect("/admin/categorias?aviso=eliminada");
}
