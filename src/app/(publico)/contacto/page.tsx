import { Flag, Handshake, LifeBuoy, Mail, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Migas } from "@/components/directorio/migas";
import { CORREO_CONTACTO } from "@/lib/constantes";

export const metadata: Metadata = {
  title: "Contacto",
  description: "Escríbenos para dudas sobre tu cuenta o tu negocio, reportes, tus datos personales o alianzas.",
  alternates: { canonical: "/contacto" },
};

const MOTIVOS = [
  {
    icono: LifeBuoy,
    titulo: "Ayuda con tu cuenta o tu negocio",
    texto: "Problemas para registrarte, publicar tu negocio, subir fotos o entender por qué fue rechazado.",
    asunto: "Ayuda con mi cuenta",
  },
  {
    icono: Flag,
    titulo: "Reportar un negocio",
    texto: "Lo más rápido es usar el botón \"Reportar este negocio\" en su página. También puedes escribirnos.",
    asunto: "Reporte de un negocio",
  },
  {
    icono: ShieldCheck,
    titulo: "Tus datos personales",
    texto: "Pedir una copia de tus datos, corregirlos o eliminarlos, u otra consulta de privacidad.",
    asunto: "Consulta sobre mis datos",
  },
  {
    icono: Handshake,
    titulo: "Alianzas y prensa",
    texto: "Cámaras de comercio, programas de emprendimiento, medios y otras colaboraciones.",
    asunto: "Alianza con EmprendeHN",
  },
];

export default function PaginaContacto() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <Migas migas={[{ nombre: "Inicio", ruta: "/" }, { nombre: "Contacto", ruta: "/contacto" }]} />
      <header className="space-y-2">
        <h1 className="text-3xl font-extrabold text-brand-dark">Contacto</h1>
        <p className="text-ink/75">Escríbenos y te responderemos lo antes posible.</p>
      </header>

      <a
        href={`mailto:${CORREO_CONTACTO}`}
        className="flex items-center gap-4 rounded-2xl bg-brand-dark p-5 text-white no-underline shadow-sm hover:bg-brand"
      >
        <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-accent text-ink">
          <Mail className="size-6" aria-hidden />
        </span>
        <span className="min-w-0">
          <span className="block text-sm text-white/75">Correo electrónico</span>
          <span className="block break-all text-lg font-bold">{CORREO_CONTACTO}</span>
        </span>
      </a>

      <ul className="grid gap-4 sm:grid-cols-2">
        {MOTIVOS.map((m) => (
          <li key={m.titulo} className="flex flex-col rounded-2xl bg-white p-5 shadow-sm ring-1 ring-brand-dark/10">
            <m.icono className="size-6 text-brand" aria-hidden />
            <h2 className="mt-3 font-bold text-brand-dark">{m.titulo}</h2>
            <p className="mt-1 flex-1 text-sm text-ink/75">{m.texto}</p>
            <a
              href={`mailto:${CORREO_CONTACTO}?subject=${encodeURIComponent(m.asunto)}`}
              className="mt-3 text-sm font-semibold"
            >
              Escribir sobre esto →
            </a>
          </li>
        ))}
      </ul>

      <p className="text-sm text-ink/60">
        Consulta también nuestra <Link href="/privacidad">Política de privacidad</Link> y los{" "}
        <Link href="/terminos">Términos y condiciones</Link>.
      </p>
    </div>
  );
}
