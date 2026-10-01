import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { Suspense } from "react";

import { VolverArriba } from "@/components/layout/volver-arriba";
import { AvisoUrl } from "@/components/ui/aviso-url";
import { Toaster } from "@/components/ui/toast";
import { SITE_NAME, SITE_URL } from "@/lib/env";
import { COLORES } from "@/lib/marca";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} · Directorio de emprendedores y negocios de Honduras`,
    template: `%s | ${SITE_NAME}`,
  },
  description:
    "Encuentra negocios, emprendedores y servicios en tu ciudad: panaderías, salones de belleza, plomeros, tiendas y más en Honduras. Registra tu negocio gratis.",
  applicationName: SITE_NAME,
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    locale: "es_HN",
    url: "/",
  },
  twitter: { card: "summary_large_image" },
  formatDetection: { telephone: false },
  // Instalada en el iPhone ("Agregar a inicio") se abre como app, sin la barra de Safari.
  // El resto (Android, computadora) lo toma de manifest.ts.
  appleWebApp: { capable: true, title: SITE_NAME, statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: COLORES.brandDark,
  // La página llega hasta los bordes de la pantalla (muesca, barra de inicio del
  // iPhone); las barras fijas se apartan con env(safe-area-inset-*).
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // data-scroll-behavior: el scroll suave (globals.css) es solo para anclas dentro
    // de la página; al cambiar de página Next salta arriba sin animación.
    <html lang="es-HN" className={geistSans.variable} data-scroll-behavior="smooth">
      <body className="flex min-h-dvh flex-col font-sans">
        {children}
        <VolverArriba />
        <Toaster />
        <Suspense fallback={null}>
          <AvisoUrl />
        </Suspense>
      </body>
    </html>
  );
}
