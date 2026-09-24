"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { Alerta } from "@/components/ui/alerta";
import { Boton, BotonEnlace } from "@/components/ui/boton";
import { Campo, Textarea } from "@/components/ui/campo";
import { eliminarMiResena, guardarResena } from "@/lib/acciones/resenas";
import { crearClienteNavegador } from "@/lib/supabase/client";

import { Estrellas } from "./estrellas";
import { SelectorEstrellas } from "./selector-estrellas";

type MiResena = { calificacion: number; comentario: string | null; estado: string };
type Estado = "cargando" | "anonimo" | "dueno" | "listo";

/**
 * La página del negocio es estática: la sesión se consulta en el navegador. Las
 * reglas reales (una por persona, no la propia, límite diario) están en la base.
 */
export function EscribirResena({ negocioId, slug }: { negocioId: string; slug: string }) {
  const router = useRouter();
  const [estado, setEstado] = useState<Estado>("cargando");
  const [mia, setMia] = useState<MiResena | null>(null);
  const [editando, setEditando] = useState(false);
  const [calificacion, setCalificacion] = useState(0);
  const [comentario, setComentario] = useState("");
  const [mensaje, setMensaje] = useState<{ ok: boolean; texto: string } | null>(null);
  const [pendiente, iniciar] = useTransition();

  useEffect(() => {
    const supabase = crearClienteNavegador();
    let activo = true;
    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return activo && setEstado("anonimo");
      const { data: esDueno } = await supabase.rpc("es_dueno_negocio", { p_business_id: negocioId });
      if (esDueno) return activo && setEstado("dueno");
      const { data } = await supabase
        .from("business_reviews")
        .select("calificacion, comentario, estado")
        .eq("business_id", negocioId)
        .eq("user_id", session.user.id)
        .maybeSingle();
      if (!activo) return;
      setMia(data);
      setEstado("listo");
    })();
    return () => {
      activo = false;
    };
  }, [negocioId]);

  function abrirFormulario() {
    setCalificacion(mia?.calificacion ?? 0);
    setComentario(mia?.comentario ?? "");
    setMensaje(null);
    setEditando(true);
  }

  function publicar(e: React.FormEvent) {
    e.preventDefault();
    if (calificacion === 0) return setMensaje({ ok: false, texto: "Elige de 1 a 5 estrellas." });
    iniciar(async () => {
      const r = await guardarResena(negocioId, { calificacion, comentario });
      if (!r.ok) return setMensaje({ ok: false, texto: r.error });
      setMia({ calificacion, comentario: comentario.trim() || null, estado: mia?.estado ?? "publicada" });
      setEditando(false);
      setMensaje({ ok: true, texto: r.mensaje ?? "Listo." });
      router.refresh();
    });
  }

  function eliminar() {
    if (!confirm("¿Eliminar tu reseña?")) return;
    iniciar(async () => {
      const r = await eliminarMiResena(negocioId);
      if (!r.ok) return setMensaje({ ok: false, texto: r.error });
      setMia(null);
      setMensaje({ ok: true, texto: r.mensaje ?? "Listo." });
      router.refresh();
    });
  }

  if (estado === "cargando") return <div className="h-10" aria-hidden />;

  if (estado === "anonimo") {
    return (
      <BotonEnlace href={`/ingresar?siguiente=${encodeURIComponent(`/negocio/${slug}#resenas`)}`} variante="secundario">
        Escribir una reseña
      </BotonEnlace>
    );
  }

  if (estado === "dueno") {
    return (
      <p className="rounded-lg bg-brand-light px-4 py-3 text-sm text-ink/75">
        Este es tu negocio: puedes responder las reseñas desde tu panel, en la pestaña «Reseñas».
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {mensaje && <Alerta tono={mensaje.ok ? "exito" : "error"}>{mensaje.texto}</Alerta>}

      {editando ? (
        <form onSubmit={publicar} className="space-y-4 rounded-xl bg-brand-light p-4">
          <div className="space-y-1.5">
            <p className="text-sm font-medium text-brand-dark">¿Cómo calificas este negocio?</p>
            <SelectorEstrellas valor={calificacion} onChange={setCalificacion} />
          </div>
          <Campo
            etiqueta="Cuenta tu experiencia"
            htmlFor="resena-comentario"
            opcional
            ayuda="Sé respetuoso y habla de tu experiencia real. Se publica con tu primer nombre."
          >
            <Textarea
              id="resena-comentario"
              rows={4}
              maxLength={1000}
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
            />
          </Campo>
          <div className="flex flex-wrap gap-2">
            <Boton type="submit" cargando={pendiente}>
              {mia ? "Guardar cambios" : "Publicar reseña"}
            </Boton>
            <Boton type="button" variante="fantasma" onClick={() => setEditando(false)}>
              Cancelar
            </Boton>
          </div>
        </form>
      ) : mia ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-brand-light px-4 py-3 text-sm">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-brand-dark">Tu reseña:</span>
            <Estrellas valor={mia.calificacion} />
            {mia.estado === "oculta" && <span className="text-ink/60">(oculta por moderación)</span>}
          </div>
          <div className="flex gap-2">
            <Boton tamano="sm" variante="secundario" onClick={abrirFormulario} disabled={pendiente}>
              Editar
            </Boton>
            <Boton tamano="sm" variante="fantasma" onClick={eliminar} disabled={pendiente}>
              Eliminar
            </Boton>
          </div>
        </div>
      ) : (
        <Boton variante="secundario" onClick={abrirFormulario}>
          Escribir una reseña
        </Boton>
      )}
    </div>
  );
}
