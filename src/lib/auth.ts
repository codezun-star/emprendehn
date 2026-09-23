import "server-only";

import { notFound, redirect } from "next/navigation";
import { cache } from "react";

import { crearClienteServidor } from "@/lib/supabase/server";
import type { Tables } from "@/types/database.types";

export type Perfil = Tables<"profiles">;

export type Sesion = {
  userId: string;
  email: string;
  perfil: Perfil | null;
  esAdmin: boolean;
};

/**
 * Sesión del request actual (memoizada por request con React cache).
 * getClaims() valida el JWT; nunca confiar en getSession() del lado del servidor.
 */
export const obtenerSesion = cache(async (): Promise<Sesion | null> => {
  const supabase = await crearClienteServidor();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) return null;

  const { data: perfil } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", claims.sub)
    .maybeSingle();

  return {
    userId: claims.sub,
    email: (typeof claims.email === "string" ? claims.email : perfil?.email) ?? "",
    perfil,
    esAdmin: perfil?.rol === "admin",
  };
});

/** Exige sesión; si no hay, redirige a /ingresar y vuelve a `siguiente` después. */
export async function requerirUsuario(siguiente = "/panel"): Promise<Sesion> {
  const sesion = await obtenerSesion();
  if (!sesion) {
    redirect(`/ingresar?siguiente=${encodeURIComponent(siguiente)}`);
  }
  return sesion;
}

/** Exige rol admin. A un no-admin le responde 404 (no revela que /admin existe). */
export async function requerirAdmin(): Promise<Sesion> {
  const sesion = await requerirUsuario("/admin");
  if (!sesion.esAdmin) notFound();
  return sesion;
}
