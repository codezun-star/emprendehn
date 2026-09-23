"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { MailCheck } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { aplicarErroresServidor } from "@/components/forms/errores";
import { InputContrasena } from "@/components/forms/input-contrasena";
import { Alerta } from "@/components/ui/alerta";
import { Boton } from "@/components/ui/boton";
import { ariaCampo, Campo, Input } from "@/components/ui/campo";
import { reenviarConfirmacion, registrarse } from "@/lib/acciones/auth";
import { registroSchema, type RegistroInput } from "@/lib/validaciones/auth";

export function FormularioRegistro() {
  const form = useForm<RegistroInput>({
    resolver: zodResolver(registroSchema),
    defaultValues: { nombre_completo: "", email: "", password: "", confirmar: "" },
  });
  const {
    register,
    formState: { errors, isSubmitting },
  } = form;

  const [correoEnviado, setCorreoEnviado] = useState<string | null>(null);
  const [reenvio, setReenvio] = useState<string | null>(null);

  const onSubmit = form.handleSubmit(async () => {
    const resultado = await registrarse(form.getValues());
    if (!resultado) return;
    if (resultado.ok) setCorreoEnviado(resultado.datos?.email ?? form.getValues("email"));
    else aplicarErroresServidor(form, resultado);
  });

  if (correoEnviado) {
    return (
      <div className="space-y-4 text-center">
        <MailCheck className="mx-auto size-12 text-brand" aria-hidden />
        <h2 className="text-xl font-bold text-brand-dark">Revisa tu correo</h2>
        <p className="text-sm text-ink/80">
          Enviamos un enlace de confirmación a <strong>{correoEnviado}</strong>. Ábrelo para activar
          tu cuenta y registrar tu negocio. Si no lo ves, revisa la carpeta de spam.
        </p>
        {reenvio && <Alerta tono="info">{reenvio}</Alerta>}
        <Boton
          variante="secundario"
          onClick={async () => {
            const r = await reenviarConfirmacion({ email: correoEnviado });
            setReenvio(r.ok ? (r.mensaje ?? "Correo enviado.") : r.error);
          }}
        >
          Reenviar correo
        </Boton>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      {errors.root?.servidor && <Alerta tono="error">{errors.root.servidor.message}</Alerta>}

      <Campo etiqueta="Tu nombre" htmlFor="nombre_completo" error={errors.nombre_completo?.message}>
        <Input
          {...ariaCampo("nombre_completo", errors.nombre_completo?.message)}
          autoComplete="name"
          {...register("nombre_completo")}
        />
      </Campo>

      <Campo etiqueta="Correo electrónico" htmlFor="email" error={errors.email?.message}>
        <Input
          {...ariaCampo("email", errors.email?.message)}
          type="email"
          autoComplete="email"
          inputMode="email"
          {...register("email")}
        />
      </Campo>

      <Campo
        etiqueta="Contraseña"
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

      <Campo etiqueta="Confirma tu contraseña" htmlFor="confirmar" error={errors.confirmar?.message}>
        <InputContrasena
          {...ariaCampo("confirmar", errors.confirmar?.message)}
          autoComplete="new-password"
          {...register("confirmar")}
        />
      </Campo>

      <Boton type="submit" cargando={isSubmitting} variante="acento" className="w-full" tamano="lg">
        Crear mi cuenta gratis
      </Boton>
    </form>
  );
}
