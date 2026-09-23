"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { aplicarErroresServidor } from "@/components/forms/errores";
import { Alerta } from "@/components/ui/alerta";
import { Boton } from "@/components/ui/boton";
import { ariaCampo, Campo, Input } from "@/components/ui/campo";
import { solicitarRecuperacion } from "@/lib/acciones/auth";
import { recuperacionSchema, type RecuperacionInput } from "@/lib/validaciones/auth";

export function FormularioRecuperacion() {
  const form = useForm<RecuperacionInput>({
    resolver: zodResolver(recuperacionSchema),
    defaultValues: { email: "" },
  });
  const {
    register,
    formState: { errors, isSubmitting },
  } = form;
  const [enviado, setEnviado] = useState(false);

  const onSubmit = form.handleSubmit(async () => {
    const resultado = await solicitarRecuperacion(form.getValues());
    if (resultado.ok) setEnviado(true);
    else aplicarErroresServidor(form, resultado);
  });

  if (enviado) {
    return (
      <Alerta tono="exito" titulo="Revisa tu correo">
        Si existe una cuenta con ese correo, te enviamos un enlace para crear una nueva contraseña.
        El enlace vence en 1 hora.
      </Alerta>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      {errors.root?.servidor && <Alerta tono="error">{errors.root.servidor.message}</Alerta>}
      <Campo etiqueta="Correo electrónico" htmlFor="email" error={errors.email?.message}>
        <Input
          {...ariaCampo("email", errors.email?.message)}
          type="email"
          autoComplete="email"
          inputMode="email"
          {...register("email")}
        />
      </Campo>
      <Boton type="submit" cargando={isSubmitting} className="w-full" tamano="lg">
        Enviar enlace
      </Boton>
    </form>
  );
}
