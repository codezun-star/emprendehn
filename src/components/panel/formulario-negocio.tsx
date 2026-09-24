"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useMemo, useState, type ReactNode } from "react";
import { FormProvider, useForm, useWatch } from "react-hook-form";

import { aplicarErroresServidor } from "@/components/forms/errores";
import { Alerta } from "@/components/ui/alerta";
import { Boton } from "@/components/ui/boton";
import { ariaCampo, Campo, Input, Select, Textarea } from "@/components/ui/campo";
import { actualizarNegocio, crearNegocio } from "@/lib/acciones/negocios";
import { negocioSchema, type NegocioInput, type NegocioOutput } from "@/lib/validaciones/negocio";

import { EditorHorario } from "./editor-horario";
import { SelectorUbicacion } from "./selector-ubicacion";

type OpcionCategoria = { id: string; nombre: string; hijas: { id: string; nombre: string }[] };
type OpcionMunicipio = { id: number; nombre: string; departamento_id: number };

export const VALORES_VACIOS: NegocioInput = {
  nombre: "",
  category_id: "",
  descripcion: "",
  municipio_id: "",
  localidad: "",
  direccion: "",
  telefono: "",
  whatsapp: "",
  email_contacto: "",
  redes_sociales: { facebook: "", instagram: "", tiktok: "", sitio_web: "" },
  horario: null,
  latitud: "",
  longitud: "",
  enlace_mapa: "",
};

export function FormularioNegocio({
  categorias,
  departamentos,
  municipios,
  negocioId,
  valoresIniciales = VALORES_VACIOS,
  departamentoInicial,
}: {
  categorias: OpcionCategoria[];
  departamentos: { id: number; nombre: string }[];
  municipios: OpcionMunicipio[];
  negocioId?: string;
  valoresIniciales?: NegocioInput;
  departamentoInicial?: number;
}) {
  const router = useRouter();
  const form = useForm<NegocioInput, unknown, NegocioOutput>({
    resolver: zodResolver(negocioSchema),
    defaultValues: valoresIniciales,
    mode: "onTouched",
  });
  const {
    register,
    control,
    setValue,
    formState: { errors, isSubmitting, isDirty },
  } = form;

  const [departamento, setDepartamento] = useState<string>(
    departamentoInicial ? String(departamentoInicial) : "",
  );
  const [mensaje, setMensaje] = useState<string | null>(null);

  const municipiosDelDepartamento = useMemo(
    () => municipios.filter((m) => String(m.departamento_id) === departamento),
    [municipios, departamento],
  );
  const descripcion = useWatch({ control, name: "descripcion" }) ?? "";
  const municipioId = useWatch({ control, name: "municipio_id" });
  const ciudad = useMemo(() => {
    const m = municipios.find((x) => String(x.id) === municipioId);
    const d = m && departamentos.find((x) => x.id === m.departamento_id);
    return m ? [m.nombre, d?.nombre].filter(Boolean).join(", ") : null;
  }, [municipios, departamentos, municipioId]);

  const onSubmit = form.handleSubmit(async () => {
    setMensaje(null);
    const valores = form.getValues();
    const resultado = negocioId
      ? await actualizarNegocio(negocioId, valores)
      : await crearNegocio(valores);
    if (!resultado) return; // crearNegocio redirige a la galería
    if (!resultado.ok) {
      aplicarErroresServidor(form, resultado);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    setMensaje(resultado.mensaje ?? "Cambios guardados.");
    form.reset(valores);
    router.refresh();
  });

  const e = errors;

  return (
    <FormProvider {...form}>
      <form onSubmit={onSubmit} noValidate className="space-y-8">
        {e.root?.servidor && <Alerta tono="error">{e.root.servidor.message}</Alerta>}
        {mensaje && !isDirty && <Alerta tono="exito">{mensaje}</Alerta>}

        <Seccion titulo="Información básica">
          <Campo etiqueta="Nombre del negocio" htmlFor="nombre" error={e.nombre?.message}>
            <Input
              {...ariaCampo("nombre", e.nombre?.message)}
              placeholder="Ej.: Panadería Doña Chepa"
              {...register("nombre")}
            />
          </Campo>

          <Campo
            etiqueta="Categoría"
            htmlFor="category_id"
            error={e.category_id?.message}
            ayuda="Elige la que mejor describa tu negocio: así apareces en las búsquedas correctas."
          >
            <Select {...ariaCampo("category_id", e.category_id?.message)} {...register("category_id")}>
              <option value="">Selecciona una categoría…</option>
              {categorias.map((padre) =>
                padre.hijas.length > 0 ? (
                  <optgroup key={padre.id} label={padre.nombre}>
                    {padre.hijas.map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.nombre}
                      </option>
                    ))}
                    <option value={padre.id}>Otro ({padre.nombre})</option>
                  </optgroup>
                ) : (
                  <option key={padre.id} value={padre.id}>
                    {padre.nombre}
                  </option>
                ),
              )}
            </Select>
          </Campo>

          <Campo
            etiqueta="Descripción"
            htmlFor="descripcion"
            error={e.descripcion?.message}
            ayuda={
              <>
                Cuenta qué ofreces, tus productos o servicios estrella y qué te hace diferente. Una
                buena descripción te ayuda a aparecer en Google. ({descripcion.length}/3000)
              </>
            }
          >
            <Textarea
              {...ariaCampo("descripcion", e.descripcion?.message)}
              rows={6}
              maxLength={3000}
              {...register("descripcion")}
            />
          </Campo>
        </Seccion>

        <Seccion titulo="Ubicación">
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo etiqueta="Departamento" htmlFor="departamento">
              <Select
                id="departamento"
                value={departamento}
                onChange={(ev) => {
                  setDepartamento(ev.target.value);
                  setValue("municipio_id", "", { shouldDirty: true });
                }}
              >
                <option value="">Selecciona…</option>
                {departamentos.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.nombre}
                  </option>
                ))}
              </Select>
            </Campo>
            <Campo etiqueta="Ciudad o municipio" htmlFor="municipio_id" error={e.municipio_id?.message}>
              <Select
                {...ariaCampo("municipio_id", e.municipio_id?.message)}
                disabled={!departamento}
                {...register("municipio_id")}
              >
                <option value="">{departamento ? "Selecciona…" : "Primero elige el departamento"}</option>
                {municipiosDelDepartamento.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nombre}
                  </option>
                ))}
              </Select>
            </Campo>
          </div>
          <Campo
            etiqueta="Colonia, barrio o aldea"
            htmlFor="localidad"
            opcional
            error={e.localidad?.message}
          >
            <Input
              {...ariaCampo("localidad", e.localidad?.message)}
              placeholder="Ej.: Col. Kennedy, Comayagüela, Barrio El Centro"
              {...register("localidad")}
            />
          </Campo>
          <Campo etiqueta="Dirección" htmlFor="direccion" opcional error={e.direccion?.message}>
            <Textarea
              {...ariaCampo("direccion", e.direccion?.message)}
              rows={2}
              className="min-h-0"
              placeholder="Ej.: 2 cuadras al sur del parque central, frente a la farmacia"
              {...register("direccion")}
            />
          </Campo>
          <SelectorUbicacion ciudad={ciudad} />
        </Seccion>

        <Seccion titulo="Contacto" descripcion="Agrega al menos un teléfono o WhatsApp.">
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo etiqueta="Teléfono" htmlFor="telefono" error={e.telefono?.message}>
              <Input
                {...ariaCampo("telefono", e.telefono?.message)}
                type="tel"
                inputMode="tel"
                autoComplete="tel-national"
                placeholder="2222-3333"
                {...register("telefono")}
              />
            </Campo>
            <Campo
              etiqueta="WhatsApp"
              htmlFor="whatsapp"
              error={e.whatsapp?.message}
              ayuda="Mostraremos un botón para escribirte directo."
            >
              <Input
                {...ariaCampo("whatsapp", e.whatsapp?.message)}
                type="tel"
                inputMode="tel"
                placeholder="9999-8888"
                {...register("whatsapp")}
              />
            </Campo>
          </div>
          <Campo etiqueta="Correo de contacto" htmlFor="email_contacto" opcional error={e.email_contacto?.message}>
            <Input
              {...ariaCampo("email_contacto", e.email_contacto?.message)}
              type="email"
              inputMode="email"
              {...register("email_contacto")}
            />
          </Campo>
        </Seccion>

        <Seccion titulo="Redes sociales y sitio web" descripcion="Todos los campos son opcionales.">
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo etiqueta="Facebook" htmlFor="facebook" error={e.redes_sociales?.facebook?.message}>
              <Input
                {...ariaCampo("facebook", e.redes_sociales?.facebook?.message)}
                placeholder="facebook.com/minegocio"
                {...register("redes_sociales.facebook")}
              />
            </Campo>
            <Campo etiqueta="Instagram" htmlFor="instagram" error={e.redes_sociales?.instagram?.message}>
              <Input
                {...ariaCampo("instagram", e.redes_sociales?.instagram?.message)}
                placeholder="@minegocio"
                {...register("redes_sociales.instagram")}
              />
            </Campo>
            <Campo etiqueta="TikTok" htmlFor="tiktok" error={e.redes_sociales?.tiktok?.message}>
              <Input
                {...ariaCampo("tiktok", e.redes_sociales?.tiktok?.message)}
                placeholder="@minegocio"
                {...register("redes_sociales.tiktok")}
              />
            </Campo>
            <Campo etiqueta="Sitio web" htmlFor="sitio_web" error={e.redes_sociales?.sitio_web?.message}>
              <Input
                {...ariaCampo("sitio_web", e.redes_sociales?.sitio_web?.message)}
                placeholder="www.minegocio.com"
                {...register("redes_sociales.sitio_web")}
              />
            </Campo>
          </div>
        </Seccion>

        <Seccion titulo="Horario de atención">
          <EditorHorario />
        </Seccion>

        <div className="sticky bottom-0 -mx-4 flex items-center justify-end gap-3 border-t border-brand-dark/10 bg-white/95 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0">
          <Boton type="submit" cargando={isSubmitting} tamano="lg" variante={negocioId ? "primario" : "acento"}>
            {negocioId ? "Guardar cambios" : "Enviar a revisión"}
          </Boton>
        </div>
      </form>
    </FormProvider>
  );
}

function Seccion({
  titulo,
  descripcion,
  children,
}: {
  titulo: string;
  descripcion?: string;
  children: ReactNode;
}) {
  return (
    <fieldset className="space-y-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-brand-dark/10 sm:p-6">
      <legend className="sr-only">{titulo}</legend>
      <div>
        <h2 className="text-lg font-bold text-brand-dark">{titulo}</h2>
        {descripcion && <p className="text-sm text-ink/60">{descripcion}</p>}
      </div>
      {children}
    </fieldset>
  );
}
