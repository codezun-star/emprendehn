"use client";

import { MessageCircle, Phone } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

/**
 * Barra superior con la identidad del negocio (no la de EmprendeHN).
 * En la página pública queda fija y se vuelve blanca al bajar; en las vistas
 * previas (panel/admin) se queda sobre la portada.
 */
export function BarraNegocio({
  nombre,
  logo,
  secciones,
  contacto,
  fija,
}: {
  nombre: string;
  logo: string | null;
  secciones: { id: string; etiqueta: string }[];
  contacto: { href: string; tipo: "whatsapp" | "llamada" } | null;
  fija: boolean;
}) {
  const [solida, setSolida] = useState(false);

  useEffect(() => {
    if (!fija) return;
    const revisar = () => setSolida(window.scrollY > 48);
    revisar();
    window.addEventListener("scroll", revisar, { passive: true });
    return () => window.removeEventListener("scroll", revisar);
  }, [fija]);

  return (
    <header
      className={cn(
        "@container inset-x-0 top-0 z-30 transition-colors duration-300",
        fija ? "fixed" : "absolute",
        solida ? "bg-white/95 text-ink shadow-sm backdrop-blur" : "text-white",
      )}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-5">
        <a href="#inicio" className="flex min-w-0 items-center gap-2.5 text-current no-underline">
          <span className="relative grid size-9 shrink-0 place-items-center overflow-hidden rounded-lg bg-white text-sm font-black text-brand-dark ring-1 ring-ink/10">
            {logo ? <Image src={logo} alt="" fill sizes="36px" className="object-cover" /> : nombre.charAt(0)}
          </span>
          <span className="truncate font-bold">{nombre}</span>
        </a>

        <nav aria-label="Secciones" className="hidden @3xl:block">
          <ul className="flex items-center gap-1 text-sm font-medium">
            {secciones.map((s) => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-current no-underline",
                    solida ? "hover:bg-brand-light" : "hover:bg-white/15",
                  )}
                >
                  {s.etiqueta}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        {contacto && (
          <a
            href={contacto.href}
            data-evento={contacto.tipo}
            {...(contacto.tipo === "whatsapp" && { target: "_blank", rel: "noopener" })}
            className="hidden shrink-0 items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-bold text-ink no-underline shadow-sm hover:brightness-95 @xl:inline-flex"
          >
            {contacto.tipo === "whatsapp" ? (
              <MessageCircle className="size-4" aria-hidden />
            ) : (
              <Phone className="size-4" aria-hidden />
            )}
            {contacto.tipo === "whatsapp" ? "Escríbenos" : "Llámanos"}
          </a>
        )}
      </div>
    </header>
  );
}
