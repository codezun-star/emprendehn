"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useForm } from "react-hook-form";

import { aplicarErroresServidor } from "@/components/forms/errores";
import { InputContrasena } from "@/components/forms/input-contrasena";
import { Alerta } from "@/components/ui/alerta";
import { Boton } from "@/components/ui/boton";
import { ariaCampo, Campo } from "@/components/ui/campo";
import { actualizarContrasena } from "@/lib/acciones/auth";
import { nuevaContrasenaSchema, type NuevaContrasenaInput } from "@/lib/validaciones/auth";

export function FormularioNuevaContrasena() {
  const form = useForm<NuevaContrasenaInput>({
    resolver: zodResolver(nuevaContrasenaSchema),
    defaultValues: { password: "", confirmar: "" },
  });
  const {
    register,
    formState: { errors, isSubmitting },
  } = form;

  const onSubmit = form.handleSubmit(async () => {
    const resultado = await actualizarContrasena(form.getValues());
    if (resultado && !resultado.ok) aplicarErroresServidor(form, resultado);
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      {errors.root?.servidor && (
        <Alerta tono="error">
          {errors.root.servidor.message}{" "}
          <Link href="/recuperar-contrasena" className="font-semibold">
            Solicitar nuevo enlace
          </Link>
        </Alerta>
      )}
      <Campo
        etiqueta="Nueva contraseña"
        htmlFor="password"
        error={errors.password?.message}
        ayuda="Mínimo 8 caracteres."
      >
        <InputContrasena
          {...ariaCampo("password", errors.password?.message)}
          autoComplete="new-password"
          {...register("password")}
        />
      </Campo>
      <Campo etiqueta="Confirma la contraseña" htmlFor="confirmar" error={errors.confirmar?.message}>
        <InputContrasena
          {...ariaCampo("confirmar", errors.confirmar?.message)}
          autoComplete="new-password"
          {...register("confirmar")}
        />
      </Campo>
      <Boton type="submit" cargando={isSubmitting} className="w-full" tamano="lg">
        Guardar contraseña
      </Boton>
    </form>
  );
}
