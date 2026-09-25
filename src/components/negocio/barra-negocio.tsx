"use client";

import { MessageCircle, Phone } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

/**
 * Barra superior con la identidad del negocio (no la de EmprendeHN).
 * En la página pública queda fija, se vuelve blanca al bajar y marca la sección
 * que se está leyendo; en las vistas previas (panel/admin) se queda sobre la portada.
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
  const [alFinal, setAlFinal] = useState(false);
  const [enVista, setEnVista] = useState<string | null>(null);
  const ids = secciones.map((s) => s.id).join(" ");

  useEffect(() => {
    if (!fija) return;
    const revisar = () => {
      setSolida(window.scrollY > 48);
      setAlFinal(window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4);
    };
    revisar();
    window.addEventListener("scroll", revisar, { passive: true });
    return () => window.removeEventListener("scroll", revisar);
  }, [fija]);

  // Sección en vista: la primera (en orden) que cruza una franja a un tercio de
  // la pantalla, donde la vista se posa al leer.
  useEffect(() => {
    if (!fija || !ids) return;
    const orden = ids.split(" ");
    const cruzando = new Set<string>();
    const observador = new IntersectionObserver(
      (entradas) => {
        for (const entrada of entradas) {
          if (entrada.isIntersecting) cruzando.add(entrada.target.id);
          else cruzando.delete(entrada.target.id);
        }
        setEnVista(orden.find((id) => cruzando.has(id)) ?? null);
      },
      { rootMargin: "-33% 0px -62% 0px" },
    );
    for (const id of orden) {
      const seccion = document.getElementById(id);
      if (seccion) observador.observe(seccion);
    }
    return () => observador.disconnect();
  }, [fija, ids]);

  // Al llegar al final, la última sección (el contacto suele ser corto).
  const activa = alFinal && secciones.length > 0 ? secciones[secciones.length - 1].id : enVista;

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
                  aria-current={activa === s.id ? "location" : undefined}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-current no-underline transition-colors",
                    solida
                      ? "hover:bg-brand-light aria-[current=location]:bg-brand-light aria-[current=location]:font-semibold aria-[current=location]:text-brand-dark"
                      : "hover:bg-white/15 aria-[current=location]:bg-white/20",
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
            className="hidden shrink-0 items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-bold text-ink no-underline shadow-sm hover:brightness-95 @3xl:inline-flex"
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
