"use client";

import { useState } from "react";

import { crearClienteNavegador } from "@/lib/supabase/client";
import { rutaSegura } from "@/lib/utils";

/** Se muestra solo si NEXT_PUBLIC_LOGIN_GOOGLE=true (proveedor activado en Supabase). */
export const LOGIN_GOOGLE_ACTIVO = process.env.NEXT_PUBLIC_LOGIN_GOOGLE === "true";

export function BotonGoogle({ siguiente }: { siguiente?: string }) {
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!LOGIN_GOOGLE_ACTIVO) return null;

  async function continuar() {
    setCargando(true);
    setError(null);
    const destino = encodeURIComponent(rutaSegura(siguiente));
    const { error } = await crearClienteNavegador().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback?siguiente=${destino}` },
    });
    // Si todo sale bien, el navegador ya se fue a Google.
    if (error) {
      setError("No pudimos conectar con Google. Inténtalo de nuevo o usa tu correo.");
      setCargando(false);
    }
  }

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={continuar}
        disabled={cargando}
        className="flex w-full items-center justify-center gap-3 rounded-xl border border-brand-dark/20 bg-white px-4 py-3 text-sm font-semibold text-ink shadow-sm hover:bg-brand-light disabled:opacity-60"
      >
        <svg viewBox="0 0 48 48" className="size-5" aria-hidden>
          <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
          <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
          <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
          <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
        </svg>
        {cargando ? "Conectando con Google…" : "Continuar con Google"}
      </button>
      {error && (
        <p role="alert" className="text-center text-xs font-medium text-red-700">
          {error}
        </p>
      )}
      <div className="flex items-center gap-3 text-xs text-ink/50">
        <span className="h-px flex-1 bg-brand-dark/10" /> o con tu correo <span className="h-px flex-1 bg-brand-dark/10" />
      </div>
    </div>
  );
}
