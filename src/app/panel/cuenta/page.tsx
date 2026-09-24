import type { Metadata } from "next";

import { EliminarCuenta } from "@/components/panel/eliminar-cuenta";
import { Alerta } from "@/components/ui/alerta";
import { requerirUsuario } from "@/lib/auth";
import { CORREO_CONTACTO } from "@/lib/constantes";
import { crearClienteServidor } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Mi cuenta" };

export default async function PaginaCuenta() {
  const sesion = await requerirUsuario("/panel/cuenta");
  const supabase = await crearClienteServidor();
  const { count } = await supabase
    .from("businesses")
    .select("id", { count: "exact", head: true })
    .eq("owner_id", sesion.userId);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-brand-dark">Mi cuenta</h1>

      <section className="space-y-2 rounded-2xl bg-white p-5 text-sm shadow-sm ring-1 ring-brand-dark/10 sm:p-6">
        <dl className="grid gap-3 sm:grid-cols-[10rem_1fr]">
          <dt className="font-semibold text-brand-dark">Nombre</dt>
          <dd>{sesion.perfil?.nombre_completo ?? "—"}</dd>
          <dt className="font-semibold text-brand-dark">Correo</dt>
          <dd className="break-all">{sesion.email}</dd>
        </dl>
        <p className="pt-2 text-ink/60">
          Para cambiar tu correo o pedir una copia de tus datos, escríbenos a{" "}
          <a href={`mailto:${CORREO_CONTACTO}`}>{CORREO_CONTACTO}</a>.
        </p>
      </section>

      {sesion.esAdmin ? (
        <Alerta tono="info" titulo="Cuenta de administrador">
          Las cuentas de administrador no se pueden eliminar desde el panel. Quita primero el rol de
          administrador desde el SQL Editor de Supabase.
        </Alerta>
      ) : (
        <EliminarCuenta totalNegocios={count ?? 0} />
      )}
    </div>
  );
}
