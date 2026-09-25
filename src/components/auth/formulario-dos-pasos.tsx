"use client";

import { useState, type FormEvent } from "react";

import { Alerta } from "@/components/ui/alerta";
import { Boton } from "@/components/ui/boton";
import { ariaCampo, Campo, Input } from "@/components/ui/campo";
import { iniciarInscripcion, verificarCodigo } from "@/lib/acciones/dos-pasos";

type Inscripcion = { factorId: string; qr: string; secreto: string };

/**
 * `factorId` null: primera vez (activar con QR). Si no, solo pide el código.
 */
export function FormularioDosPasos({ factorId, siguiente }: { factorId: string | null; siguiente: string }) {
  const [inscripcion, setInscripcion] = useState<Inscripcion | null>(null);
  const [preparando, setPreparando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function empezar() {
    setPreparando(true);
    setError(null);
    const resultado = await iniciarInscripcion();
    setPreparando(false);
    if (resultado.ok && resultado.datos) setInscripcion(resultado.datos);
    else if (!resultado.ok) setError(resultado.error);
  }

  if (factorId) return <IngresarCodigo factorId={factorId} siguiente={siguiente} />;

  if (!inscripcion) {
    return (
      <div className="space-y-5">
        {error && <Alerta tono="error">{error}</Alerta>}
        <ol className="list-decimal space-y-2 pl-5 text-sm text-ink/80">
          <li>
            Instala en tu teléfono una app de autenticación: Google Authenticator, Microsoft Authenticator, Authy o
            1Password.
          </li>
          <li>Escanea el código QR que te mostraremos.</li>
          <li>Escribe el código de 6 números que aparece en la app.</li>
        </ol>
        <Boton onClick={empezar} cargando={preparando} className="w-full" tamano="lg">
          Activar verificación en dos pasos
        </Boton>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="space-y-3 text-center">
        <p className="text-sm text-ink/80">Escanea este código con tu app de autenticación:</p>
        {/* El QR es un SVG (data:) que genera Supabase: next/image no aporta nada aquí. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={inscripcion.qr}
          alt="Código QR para la app de autenticación"
          width={200}
          height={200}
          className="mx-auto rounded-lg bg-white p-2 ring-1 ring-brand-dark/10"
        />
        <details className="text-sm text-ink/70">
          <summary className="cursor-pointer font-semibold text-brand-dark">¿No puedes escanearlo?</summary>
          <p className="mt-2">Agrega la cuenta a mano con esta clave:</p>
          <code className="mt-1 block break-all rounded-lg bg-brand-light px-3 py-2 font-mono text-sm tracking-wider text-ink select-all">
            {inscripcion.secreto.match(/.{1,4}/g)?.join(" ")}
          </code>
        </details>
      </div>
      <IngresarCodigo factorId={inscripcion.factorId} siguiente={siguiente} activando />
    </div>
  );
}

function IngresarCodigo({ factorId, siguiente, activando = false }: { factorId: string; siguiente: string; activando?: boolean }) {
  const [codigo, setCodigo] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    setEnviando(true);
    setError(null);
    // Si sale bien, la acción redirige al panel de administración.
    const resultado = await verificarCodigo({ factorId, codigo, siguiente });
    setEnviando(false);
    if (resultado && !resultado.ok) {
      setError(resultado.campos?.codigo ?? resultado.error);
      setCodigo("");
    }
  }

  return (
    <form onSubmit={enviar} noValidate className="space-y-5">
      <Campo etiqueta="Código de 6 números" htmlFor="codigo" error={error ?? undefined}>
        <Input
          {...ariaCampo("codigo", error ?? undefined)}
          value={codigo}
          // Sin maxLength: al pegar "123 456" el navegador cortaría antes de quitar el espacio.
          onChange={(e) => setCodigo(e.target.value.replace(/\D/g, "").slice(0, 6))}
          inputMode="numeric"
          autoComplete="one-time-code"
          autoFocus
          placeholder="123456"
          className="text-center font-mono text-2xl tracking-[0.5em]"
        />
      </Campo>
      <Boton type="submit" cargando={enviando} disabled={codigo.length !== 6} className="w-full" tamano="lg">
        {activando ? "Activar y entrar" : "Verificar"}
      </Boton>
    </form>
  );
}
