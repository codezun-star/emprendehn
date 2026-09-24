"use client";

import { useCallback, useEffect, useRef, type ReactNode } from "react";

import type { Antispam } from "@/lib/antispam";

// Campo trampa + tiempo mínimo + Turnstile opcional (ver lib/antispam.ts).

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

type Turnstile = {
  render(contenedor: HTMLElement, opciones: Record<string, unknown>): string;
  execute(widgetId: string): void;
  reset(widgetId: string): void;
  remove(widgetId: string): void;
};

declare global {
  interface Window {
    turnstile?: Turnstile;
  }
}

let cargaTurnstile: Promise<void> | null = null;

function cargarTurnstile(): Promise<void> {
  cargaTurnstile ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      cargaTurnstile = null;
      reject(new Error("No se pudo cargar Turnstile"));
    };
    document.head.appendChild(script);
  });
  return cargaTurnstile;
}

/** `campos` va dentro del <form>; `obtener()` se llama al enviar. */
export function useAntispam(): { campos: ReactNode; obtener: () => Promise<Antispam> } {
  const inicio = useRef(0);
  const trampa = useRef<HTMLInputElement>(null);
  const contenedor = useRef<HTMLDivElement>(null);
  const widget = useRef<string | null>(null);
  const esperando = useRef<((token: string | undefined) => void) | null>(null);

  useEffect(() => {
    inicio.current = Date.now();
    if (!SITE_KEY) return;
    let activo = true;
    const entregar = (token: string | undefined) => {
      esperando.current?.(token);
      esperando.current = null;
    };
    cargarTurnstile()
      .then(() => {
        if (!activo || !contenedor.current || !window.turnstile) return;
        widget.current = window.turnstile.render(contenedor.current, {
          sitekey: SITE_KEY,
          execution: "execute",
          appearance: "interaction-only",
          language: "es",
          callback: (token: string) => entregar(token),
          "error-callback": () => entregar(undefined),
        });
      })
      .catch(() => {});
    return () => {
      activo = false;
      if (widget.current) window.turnstile?.remove(widget.current);
      widget.current = null;
    };
  }, []);

  const obtener = useCallback(async (): Promise<Antispam> => {
    const base = { trampa: trampa.current?.value ?? "", tiempo: Date.now() - inicio.current };
    const id = widget.current;
    const turnstile = window.turnstile;
    if (!SITE_KEY || !id || !turnstile) return base;
    // Cada token sirve una sola vez: se pide uno nuevo en cada envío.
    const captcha = await new Promise<string | undefined>((resolve) => {
      esperando.current = resolve;
      turnstile.reset(id);
      turnstile.execute(id);
      setTimeout(() => resolve(undefined), 20_000);
    });
    return { ...base, captcha };
  }, []);

  const campos = (
    <>
      <div aria-hidden="true" style={{ position: "absolute", left: "-10000px", width: 1, height: 1, overflow: "hidden" }}>
        <label>
          Deja este campo vacío
          <input ref={trampa} type="text" name="referencia_web" tabIndex={-1} autoComplete="off" defaultValue="" />
        </label>
      </div>
      {SITE_KEY && <div ref={contenedor} />}
    </>
  );

  return { campos, obtener };
}
