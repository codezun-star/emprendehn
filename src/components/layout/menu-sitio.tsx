"use client";

import { ChevronRight, FileText, Mail, Share, ShieldCheck, Smartphone, SquarePlus, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useState, useSyncExternalStore } from "react";

import { BotonEnlace } from "@/components/ui/boton";
import { Hoja } from "@/components/ui/hoja";
import { toast } from "@/components/ui/toast";
import { formaInstalacion, instalarApp, suscribirInstalacion, type FormaInstalacion } from "@/lib/instalar-app";
import { cn } from "@/lib/utils";

const SIN_INSTALACION = (): FormaInstalacion => "no";

const ENLACES: { href: string; etiqueta: string; icono: LucideIcon }[] = [
  { href: "/contacto", etiqueta: "Contacto y ayuda", icono: Mail },
  { href: "/privacidad", etiqueta: "Privacidad", icono: ShieldCheck },
  { href: "/terminos", etiqueta: "Términos y condiciones", icono: FileText },
];

const fila =
  "flex w-full items-center gap-3 px-4 py-3.5 text-left text-[0.9375rem] font-medium text-ink no-underline transition-colors active:bg-brand-dark/5";

/** Menú del celular (pestaña "Menú"): lo que en la computadora está en el encabezado y el pie. */
export function MenuSitio({ abierto, alCerrar, conSesion }: { abierto: boolean; alCerrar: () => void; conSesion: boolean }) {
  const instalacion = useSyncExternalStore(suscribirInstalacion, formaInstalacion, SIN_INSTALACION);
  const [pasosIOS, setPasosIOS] = useState(false);

  async function instalar() {
    if (instalacion === "ios") {
      setPasosIOS((v) => !v);
      return;
    }
    alCerrar();
    if (await instalarApp()) toast.exito("¡Listo! EmprendeHN quedó en tu pantalla de inicio");
  }

  return (
    <Hoja abierta={abierto} alCerrar={alCerrar} titulo="Menú">
      <div className="space-y-4">
        <section className="rounded-2xl bg-brand-dark p-4 text-white">
          {conSesion ? (
            <>
              <h3 className="font-bold">Tu negocio en EmprendeHN</h3>
              <p className="mt-1 text-sm text-white/75">Edita tus datos, fotos y horario, o revisa tus visitas.</p>
              <div className="mt-3 flex gap-2">
                <BotonEnlace href="/panel" variante="acento" className="flex-1">
                  Ir a mi panel
                </BotonEnlace>
                <BotonEnlace href="/panel/negocios/nuevo" variante="secundario">
                  Agregar otro
                </BotonEnlace>
              </div>
            </>
          ) : (
            <>
              <h3 className="font-bold">¿Tienes un negocio?</h3>
              <p className="mt-1 text-sm text-white/75">
                Crea su página gratis y aparece cuando te busquen en Google.
              </p>
              <div className="mt-3 flex gap-2">
                <BotonEnlace href="/registro" variante="acento" className="flex-1">
                  Registrarlo gratis
                </BotonEnlace>
                <BotonEnlace href="/ingresar" variante="secundario">
                  Ingresar
                </BotonEnlace>
              </div>
            </>
          )}
        </section>

        {instalacion !== "no" && (
          <section className="overflow-hidden rounded-2xl bg-brand-light">
            <button type="button" onClick={instalar} aria-expanded={instalacion === "ios" ? pasosIOS : undefined} className={fila}>
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white text-brand">
                <Smartphone className="size-5" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-brand-dark">Instalar la app</span>
                <span className="block text-xs font-normal text-ink/60">
                  Ábrela desde tu pantalla de inicio, sin el navegador
                </span>
              </span>
              <ChevronRight className={cn("size-5 shrink-0 text-ink/35 transition-transform", pasosIOS && "rotate-90")} aria-hidden />
            </button>
            {instalacion === "ios" && pasosIOS && (
              <ol className="animate-aparecer space-y-2.5 border-t border-brand-dark/10 px-4 py-3.5 text-sm text-ink/80">
                <li className="flex items-center gap-2">
                  <Paso n={1} /> Toca <Share className="size-4 text-brand" aria-hidden />
                  <strong className="font-semibold">Compartir</strong> en el navegador.
                </li>
                <li className="flex items-center gap-2">
                  <Paso n={2} /> Elige <SquarePlus className="size-4 text-brand" aria-hidden />
                  <strong className="font-semibold">Agregar a inicio</strong>.
                </li>
                <li className="flex items-center gap-2">
                  <Paso n={3} /> Toca <strong className="font-semibold">Agregar</strong>.
                </li>
              </ol>
            )}
          </section>
        )}

        <nav aria-label="Información">
          <ul className="divide-y divide-brand-dark/10 overflow-hidden rounded-2xl bg-brand-light">
            {ENLACES.map(({ href, etiqueta, icono: Icono }) => (
              <li key={href}>
                <Link href={href} className={fila}>
                  <Icono className="size-5 shrink-0 text-brand" aria-hidden />
                  <span className="flex-1">{etiqueta}</span>
                  <ChevronRight className="size-5 shrink-0 text-ink/35" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <p className="pb-1 text-center text-xs text-ink/50">EmprendeHN · Hecho en Honduras 🇭🇳</p>
      </div>
    </Hoja>
  );
}

function Paso({ n }: { n: number }) {
  return (
    <span aria-hidden className="grid size-5 shrink-0 place-items-center rounded-full bg-brand text-[0.6875rem] font-bold text-white">
      {n}
    </span>
  );
}
