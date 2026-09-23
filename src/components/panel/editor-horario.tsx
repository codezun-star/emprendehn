"use client";

import { Plus, X } from "lucide-react";
import { useFieldArray, useFormContext, useWatch } from "react-hook-form";

import { Boton } from "@/components/ui/boton";
import { Input } from "@/components/ui/campo";
import { DIAS, type ClaveDia, type Turno } from "@/lib/horario";
import type { NegocioInput } from "@/lib/validaciones/negocio";

const TURNO_POR_DEFECTO: Turno = { abre: "08:00", cierra: "17:00" };

function horarioSugerido(): NonNullable<NegocioInput["horario"]> {
  const semana = [{ ...TURNO_POR_DEFECTO }];
  return {
    lun: semana,
    mar: [...semana],
    mie: [...semana],
    jue: [...semana],
    vie: [...semana],
    sab: [{ abre: "08:00", cierra: "12:00" }],
    dom: [],
    nota: "",
  };
}

export function EditorHorario() {
  const { control, setValue, getValues, register, formState } = useFormContext<NegocioInput>();
  const horario = useWatch({ control, name: "horario" });
  const activo = horario !== null && horario !== undefined;

  function copiarLunes() {
    const lunes = getValues("horario.lun") ?? [];
    for (const clave of ["mar", "mie", "jue", "vie"] as const) {
      setValue(`horario.${clave}`, lunes.map((t) => ({ ...t })), { shouldDirty: true });
    }
  }

  return (
    <div className="space-y-4">
      <label className="flex items-center gap-3 text-sm font-medium text-brand-dark">
        <input
          type="checkbox"
          className="size-4 accent-brand"
          checked={activo}
          onChange={() =>
            setValue("horario", activo ? null : horarioSugerido(), { shouldDirty: true })
          }
        />
        Mostrar horario de atención
      </label>

      {activo && (
        <>
          <div className="divide-y divide-brand-dark/10 rounded-lg ring-1 ring-brand-dark/10">
            {DIAS.map(({ clave, nombre }) => (
              <DiaHorario key={clave} clave={clave} nombre={nombre} />
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Boton variante="secundario" tamano="sm" onClick={copiarLunes}>
              Copiar el lunes a martes–viernes
            </Boton>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="horario-nota" className="block text-sm font-medium text-brand-dark">
              Nota sobre el horario <span className="font-normal text-ink/50">(opcional)</span>
            </label>
            <Input
              id="horario-nota"
              placeholder="Ej.: Cerrado en feriados. Entregas a domicilio hasta las 8 p. m."
              {...register("horario.nota")}
            />
            {formState.errors.horario?.nota && (
              <p className="text-xs font-medium text-red-700">{formState.errors.horario.nota.message}</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function DiaHorario({ clave, nombre }: { clave: ClaveDia; nombre: string }) {
  const { control, register, formState } = useFormContext<NegocioInput>();
  const { fields, append, remove, replace } = useFieldArray({ control, name: `horario.${clave}` });
  const abierto = fields.length > 0;
  const errores = formState.errors.horario?.[clave];

  return (
    <div className="flex flex-col gap-3 p-3 sm:flex-row sm:items-start">
      <label className="flex w-32 shrink-0 items-center gap-2 pt-2 text-sm font-medium">
        <input
          type="checkbox"
          className="size-4 accent-brand"
          checked={abierto}
          onChange={() => (abierto ? replace([]) : append({ ...TURNO_POR_DEFECTO }))}
        />
        {nombre}
      </label>

      {abierto ? (
        <div className="flex-1 space-y-2">
          {fields.map((field, i) => (
            <div key={field.id} className="flex flex-wrap items-center gap-2">
              <Input
                type="time"
                aria-label={`${nombre}, turno ${i + 1}: abre`}
                className="w-32"
                {...register(`horario.${clave}.${i}.abre`)}
              />
              <span className="text-sm text-ink/60">a</span>
              <Input
                type="time"
                aria-label={`${nombre}, turno ${i + 1}: cierra`}
                className="w-32"
                {...register(`horario.${clave}.${i}.cierra`)}
              />
              {fields.length > 1 && (
                <button
                  type="button"
                  onClick={() => remove(i)}
                  className="rounded p-1 text-ink/50 hover:text-red-700"
                  aria-label={`Quitar turno ${i + 1} del ${nombre}`}
                >
                  <X className="size-4" />
                </button>
              )}
              {errores?.[i] && (
                <p className="w-full text-xs font-medium text-red-700">
                  {errores[i]?.message ?? errores[i]?.abre?.message ?? errores[i]?.cierra?.message}
                </p>
              )}
            </div>
          ))}
          {fields.length < 3 && (
            <button
              type="button"
              onClick={() => append({ abre: "14:00", cierra: "18:00" })}
              className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline"
            >
              <Plus className="size-3.5" /> Agregar otro turno
            </button>
          )}
        </div>
      ) : (
        <p className="pt-2 text-sm text-ink/50">Cerrado</p>
      )}
    </div>
  );
}
