"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";

import { ICONOS_CATEGORIA } from "@/components/directorio/icono-categoria";
import { aplicarErroresServidor } from "@/components/forms/errores";
import { Alerta } from "@/components/ui/alerta";
import { Boton } from "@/components/ui/boton";
import { ariaCampo, Campo, Input, Select, Textarea } from "@/components/ui/campo";
import { eliminarCategoria, guardarCategoria } from "@/lib/acciones/admin";
import {
  categoriaSchema,
  TIPOS_SCHEMA,
  type CategoriaInput,
  type CategoriaOutput,
} from "@/lib/validaciones/admin";

/** Vista previa del slug (misma regla que public.slugify en la base de datos). */
function slugDe(texto: string) {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function FormularioCategoria({
  categoriaId,
  valoresIniciales,
  padres,
  totalNegocios = 0,
}: {
  categoriaId?: string;
  valoresIniciales: CategoriaInput;
  padres: { id: string; nombre: string }[];
  totalNegocios?: number;
}) {
  const form = useForm<CategoriaInput, unknown, CategoriaOutput>({
    resolver: zodResolver(categoriaSchema),
    defaultValues: valoresIniciales,
  });
  const {
    register,
    control,
    formState: { errors, isSubmitting },
  } = form;
  const [eliminando, iniciarEliminacion] = useTransition();
  const [nombre, slug, parentId] = useWatch({ control, name: ["nombre", "slug", "parent_id"] });

  const onSubmit = form.handleSubmit(async () => {
    const resultado = await guardarCategoria(categoriaId ?? null, form.getValues());
    if (resultado && !resultado.ok) aplicarErroresServidor(form, resultado);
  });

  const e = errors;
  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-brand-dark/10 sm:p-6">
      {e.root?.servidor && <Alerta tono="error">{e.root.servidor.message}</Alerta>}

      <div className="grid gap-4 sm:grid-cols-2">
        <Campo etiqueta="Nombre" htmlFor="nombre" error={e.nombre?.message}>
          <Input {...ariaCampo("nombre", e.nombre?.message)} {...register("nombre")} />
        </Campo>
        <Campo
          etiqueta="Slug (URL)"
          htmlFor="slug"
          error={e.slug?.message}
          ayuda={`/categoria/${slug || slugDe(nombre ?? "") || "…"}${categoriaId ? " · Cambiarlo rompe los enlaces existentes." : " · Vacío = se genera del nombre."}`}
        >
          <Input {...ariaCampo("slug", e.slug?.message)} placeholder={slugDe(nombre ?? "")} {...register("slug")} />
        </Campo>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Campo etiqueta="Categoría padre" htmlFor="parent_id" error={e.parent_id?.message}>
          <Select {...ariaCampo("parent_id", e.parent_id?.message)} {...register("parent_id")}>
            <option value="">Ninguna (categoría principal)</option>
            {padres
              .filter((p) => p.id !== categoriaId)
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
          </Select>
        </Campo>
        <Campo
          etiqueta="Tipo schema.org"
          htmlFor="schema_type"
          error={e.schema_type?.message}
          ayuda="Tipo de negocio para los datos estructurados de Google."
        >
          <Select {...ariaCampo("schema_type", e.schema_type?.message)} {...register("schema_type")}>
            {TIPOS_SCHEMA.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>
        </Campo>
      </div>

      <Campo
        etiqueta="Descripción"
        htmlFor="descripcion"
        opcional
        error={e.descripcion?.message}
        ayuda="Texto introductorio de la página de la categoría (ayuda al SEO)."
      >
        <Textarea {...ariaCampo("descripcion", e.descripcion?.message)} rows={3} {...register("descripcion")} />
      </Campo>

      <div className="grid gap-4 sm:grid-cols-3">
        <Campo etiqueta="Ícono" htmlFor="icono" opcional error={e.icono?.message}>
          <Select {...ariaCampo("icono", e.icono?.message)} disabled={!!parentId} {...register("icono")}>
            <option value="">Sin ícono</option>
            {Object.keys(ICONOS_CATEGORIA).map((i) => (
              <option key={i} value={i}>
                {i}
              </option>
            ))}
          </Select>
        </Campo>
        <Campo etiqueta="Orden" htmlFor="orden" error={e.orden?.message}>
          <Input {...ariaCampo("orden", e.orden?.message)} inputMode="numeric" {...register("orden")} />
        </Campo>
        <div className="space-y-2 pt-7 text-sm">
          <label className="flex items-center gap-2">
            <input type="checkbox" className="size-4 accent-brand" {...register("activa")} /> Activa
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" className="size-4 accent-brand" {...register("destacada")} /> Destacada en el inicio
          </label>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-brand-dark/10 pt-5">
        {categoriaId ? (
          <Boton
            variante="peligro"
            tamano="sm"
            cargando={eliminando}
            disabled={totalNegocios > 0}
            title={totalNegocios > 0 ? "Tiene negocios asociados: desactívala en su lugar" : undefined}
            onClick={() => {
              if (!confirm("¿Eliminar esta categoría?")) return;
              iniciarEliminacion(async () => {
                const r = await eliminarCategoria(categoriaId);
                if (r && !r.ok) form.setError("root.servidor", { message: r.error });
              });
            }}
          >
            Eliminar
          </Boton>
        ) : (
          <span />
        )}
        <Boton type="submit" cargando={isSubmitting}>
          Guardar categoría
        </Boton>
      </div>
    </form>
  );
}
