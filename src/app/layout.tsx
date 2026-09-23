import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";

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
};

export const viewport: Viewport = {
  themeColor: COLORES.brandDark,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es-HN" className={geistSans.variable}>
      <body className="flex min-h-dvh flex-col font-sans">{children}</body>
    </html>
  );
}
