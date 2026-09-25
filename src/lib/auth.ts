import "server-only";

import { notFound, redirect } from "next/navigation";
import { cache } from "react";

import { dosPasosVigenteHasta } from "@/lib/dos-pasos";
import { crearClienteServidor } from "@/lib/supabase/server";
import type { Tables } from "@/types/database.types";

export type Perfil = Tables<"profiles">;

export type Sesion = {
  userId: string;
  email: string;
  perfil: Perfil | null;
  /** Tiene rol admin (aunque todavía no haya ingresado su código). */
  rolAdmin: boolean;
  /** Rol admin + código de la app de autenticación verificado hace menos de 12 h. */
  esAdmin: boolean;
  /** Hasta cuándo (ms) vale la verificación en dos pasos de esta sesión. */
  dosPasosHasta: number | null;
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

  const rolAdmin = perfil?.rol === "admin";
  const dosPasosHasta = dosPasosVigenteHasta(claims);
  return {
    userId: claims.sub,
    email: (typeof claims.email === "string" ? claims.email : perfil?.email) ?? "",
    perfil,
    rolAdmin,
    esAdmin: rolAdmin && dosPasosHasta !== null,
    dosPasosHasta,
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

/**
 * Exige admin con la verificación en dos pasos vigente. A un no-admin le
 * responde 404 (no revela que /admin existe); a un admin sin código reciente lo
 * manda a /dos-pasos (proxy.ts ya lo hace conservando la ruta pedida).
 */
export async function requerirAdmin(): Promise<Sesion> {
  const sesion = await requerirUsuario("/admin");
  if (!sesion.rolAdmin) notFound();
  if (!sesion.esAdmin) redirect("/dos-pasos");
  return sesion;
}
