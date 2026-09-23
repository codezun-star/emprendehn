import type { Metadata } from "next";

import { SiteHeader } from "@/components/layout/site-header";

// Las páginas de autenticación no deben aparecer en Google.
export const metadata: Metadata = {
  robots: { index: false, follow: true },
};

export default function LayoutAuth({ children }: LayoutProps<"/">) {
  return (
    <>
      <SiteHeader />
      <main id="contenido" className="flex flex-1 items-start justify-center px-4 py-10 sm:py-16">
        <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-sm ring-1 ring-brand-dark/10 sm:p-8">
          {children}
        </div>
      </main>
    </>
  );
}
