"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { useAntispam } from "@/components/forms/antispam";
import { aplicarErroresServidor } from "@/components/forms/errores";
import { InputContrasena } from "@/components/forms/input-contrasena";
import { Alerta } from "@/components/ui/alerta";
import { Boton } from "@/components/ui/boton";
import { ariaCampo, Campo, Input } from "@/components/ui/campo";
import { iniciarSesion, reenviarConfirmacion } from "@/lib/acciones/auth";
import { ingresoSchema, type IngresoInput } from "@/lib/validaciones/auth";

export function FormularioIngreso({ siguiente }: { siguiente?: string }) {
  const form = useForm<IngresoInput>({
    resolver: zodResolver(ingresoSchema),
    defaultValues: { email: "", password: "", siguiente },
  });
  const {
    register,
    formState: { errors, isSubmitting },
  } = form;

  const [correoSinConfirmar, setCorreoSinConfirmar] = useState<string | null>(null);
  const [reenvio, setReenvio] = useState<string | null>(null);
  const antispam = useAntispam();

  const onSubmit = form.handleSubmit(async () => {
    const valores = form.getValues();
    const resultado = await iniciarSesion(valores, (await antispam.obtener()).captcha);
    if (resultado && !resultado.ok) {
      aplicarErroresServidor(form, resultado);
      setCorreoSinConfirmar(resultado.codigo === "email_not_confirmed" ? valores.email : null);
    }
  });

  async function reenviar() {
    if (!correoSinConfirmar) return;
    const resultado = await reenviarConfirmacion({ email: correoSinConfirmar }, (await antispam.obtener()).captcha);
    setReenvio(resultado.ok ? (resultado.mensaje ?? "Correo enviado.") : resultado.error);
  }

  return (
    <form onSubmit={onSubmit} noValidate className="relative space-y-5">
      {antispam.campos}
      {errors.root?.servidor && (
        <Alerta tono="error">
          {errors.root.servidor.message}
          {correoSinConfirmar && (
            <button type="button" onClick={reenviar} className="mt-2 block font-semibold underline">
              Reenviar correo de confirmación
            </button>
          )}
        </Alerta>
      )}
      {reenvio && <Alerta tono="info">{reenvio}</Alerta>}

      <Campo etiqueta="Correo electrónico" htmlFor="email" error={errors.email?.message}>
        <Input
          {...ariaCampo("email", errors.email?.message)}
          type="email"
          autoComplete="email"
          inputMode="email"
          {...register("email")}
        />
      </Campo>

      <Campo etiqueta="Contraseña" htmlFor="password" error={errors.password?.message}>
        <InputContrasena
          {...ariaCampo("password", errors.password?.message)}
          autoComplete="current-password"
          {...register("password")}
        />
      </Campo>

      <div className="flex justify-end">
        <Link href="/recuperar-contrasena" className="text-sm">
          ¿Olvidaste tu contraseña?
        </Link>
      </div>

      <Boton type="submit" cargando={isSubmitting} className="w-full" tamano="lg">
        Ingresar
      </Boton>
    </form>
  );
}
