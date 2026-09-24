"use server";

import { redirect } from "next/navigation";

import { eliminarArchivosNegocio } from "@/lib/archivos-negocio";
import { obtenerSesion } from "@/lib/auth";
import { CORREO_CONTACTO } from "@/lib/constantes";
import { revalidarDirectorio } from "@/lib/revalidacion";
import { crearClienteServidor } from "@/lib/supabase/server";
import type { ResultadoAccion } from "@/lib/validaciones/comun";

import { errorDeBaseDeDatos, SIN_SESION } from "./errores-db";

/** Borra la cuenta del usuario con sus negocios y fotos (migración 011). */
export async function eliminarMiCuenta(confirmacion: string): Promise<ResultadoAccion> {
  const sesion = await obtenerSesion();
  if (!sesion) return SIN_SESION;
  if (confirmacion.trim().toUpperCase() !== "ELIMINAR") {
    return { ok: false, error: "Escribe ELIMINAR para confirmar." };
  }
  if (sesion.esAdmin) {
    return { ok: false, error: "Un administrador no puede eliminar su propia cuenta desde el panel." };
  }

  const supabase = await crearClienteServidor();
  // Se verifica antes de borrar archivos, para no dejar negocios sin fotos si falla.
  const { data: puede } = await supabase.rpc("puedo_eliminar_mi_cuenta");
  if (!puede) {
    return {
      ok: false,
      error: `No pudimos eliminar tu cuenta automáticamente. Escríbenos a ${CORREO_CONTACTO} y lo hacemos por ti.`,
    };
  }

  const { data: negocios } = await supabase
    .from("businesses")
    .select("id, slug, category_id, municipio_id, estado")
    .eq("owner_id", sesion.userId);
  for (const negocio of negocios ?? []) await eliminarArchivosNegocio(negocio.id);

  const { error } = await supabase.rpc("eliminar_mi_cuenta");
  if (error) return errorDeBaseDeDatos(error);

  const publicados = (negocios ?? []).filter((n) => n.estado === "aprobado");
  if (publicados.length > 0) await revalidarDirectorio(...publicados);
  await supabase.auth.signOut({ scope: "local" });
  redirect("/cuenta-eliminada");
}
