"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Flag, X } from "lucide-react";
import { useRef, type FormEvent } from "react";
import { useForm } from "react-hook-form";

import { useAntispam } from "@/components/forms/antispam";
import { aplicarErroresServidor } from "@/components/forms/errores";
import { Alerta } from "@/components/ui/alerta";
import { Boton } from "@/components/ui/boton";
import { ariaCampo, Campo, Input, Textarea } from "@/components/ui/campo";
import { toast } from "@/components/ui/toast";
import { reportarNegocio } from "@/lib/acciones/reportes";
import {
  ETIQUETAS_MOTIVO_REPORTE,
  MOTIVOS_REPORTE,
  reporteSchema,
  type ReporteInput,
} from "@/lib/validaciones/reportes";

export function ReportarNegocio({ negocioId, nombre }: { negocioId: string; nombre: string }) {
  const dialogo = useRef<HTMLDialogElement>(null);
  const antispam = useAntispam();
  const form = useForm<ReporteInput>({
    resolver: zodResolver(reporteSchema),
    defaultValues: { detalle: "", contacto: "" },
  });
  const {
    register,
    formState: { errors, isSubmitting },
  } = form;

  const onSubmit = (evento: FormEvent<HTMLFormElement>) =>
    form.handleSubmit(async () => {
      const resultado = await reportarNegocio(negocioId, form.getValues(), await antispam.obtener());
      if (resultado.ok) {
        // Se cierra el diálogo y el agradecimiento queda en un toast.
        dialogo.current?.close();
        toast.exito(resultado.mensaje ?? "Gracias por avisarnos");
        form.reset();
      } else {
        aplicarErroresServidor(form, resultado);
      }
    })(evento);

  return (
    <>
      <button
        type="button"
        onClick={() => dialogo.current?.showModal()}
        className="mx-auto flex items-center gap-1.5 text-xs font-medium text-ink/55 hover:text-red-700"
      >
        <Flag className="size-3.5" aria-hidden /> Reportar este negocio
      </button>

      <dialog
        ref={dialogo}
        aria-labelledby="titulo-reporte"
        className="m-auto w-[min(32rem,calc(100%-2rem))] rounded-2xl bg-white p-0 text-ink shadow-xl backdrop:bg-ink/50"
      >
        <div className="flex items-start justify-between gap-4 border-b border-brand-dark/10 px-5 py-4">
          <div>
            <h2 id="titulo-reporte" className="text-lg font-bold text-brand-dark">
              Reportar negocio
            </h2>
            <p className="text-sm text-ink/60">{nombre}</p>
          </div>
          <button
            type="button"
            onClick={() => dialogo.current?.close()}
            className="rounded-lg p-1 text-ink/60 hover:bg-brand-light hover:text-ink"
            aria-label="Cerrar"
          >
            <X className="size-5" aria-hidden />
          </button>
        </div>

        <form onSubmit={onSubmit} noValidate className="relative space-y-4 p-5">
          {errors.root?.servidor && <Alerta tono="error">{errors.root.servidor.message}</Alerta>}
          {antispam.campos}

          <fieldset className="space-y-2">
            <legend className="mb-1 text-sm font-medium text-brand-dark">¿Qué problema encontraste?</legend>
            {MOTIVOS_REPORTE.map((m) => (
              <label key={m} className="flex cursor-pointer items-start gap-2 text-sm">
                <input type="radio" value={m} {...register("motivo")} className="mt-0.5 accent-brand" />
                {ETIQUETAS_MOTIVO_REPORTE[m]}
              </label>
            ))}
            {errors.motivo && (
              <p role="alert" className="text-xs font-medium text-red-700">
                {errors.motivo.message}
              </p>
            )}
          </fieldset>

          <Campo etiqueta="Cuéntanos más" htmlFor="reporte-detalle" opcional error={errors.detalle?.message}>
            <Textarea
              {...ariaCampo("reporte-detalle", errors.detalle?.message)}
              rows={3}
              className="min-h-0"
              maxLength={1000}
              {...register("detalle")}
            />
          </Campo>

          <Campo
            etiqueta="Tu correo"
            htmlFor="reporte-contacto"
            opcional
            error={errors.contacto?.message}
            ayuda="Solo por si necesitamos más datos. No se lo mostramos al negocio."
          >
            <Input
              {...ariaCampo("reporte-contacto", errors.contacto?.message)}
              type="email"
              autoComplete="email"
              inputMode="email"
              {...register("contacto")}
            />
          </Campo>

          <Boton type="submit" cargando={isSubmitting} className="w-full">
            Enviar reporte
          </Boton>
        </form>
      </dialog>
    </>
  );
}
