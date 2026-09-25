import type { NextConfig } from "next";

// Las fotos de los negocios viven en Supabase Storage (bucket público business-images).
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL)
  : null;

// Solo para desarrollo con Supabase local (127.0.0.1): permitir optimizar imágenes
// desde una IP local. En producción (supabase.co) queda desactivado.
const supabaseEsLocal =
  supabaseUrl !== null && ["127.0.0.1", "localhost"].includes(supabaseUrl.hostname);

// -----------------------------------------------------------------------------
// Content-Security-Policy: de dónde puede cargar cosas el navegador. Si alguien
// lograra inyectar HTML, no podría cargar scripts de otro dominio ni mandar datos
// a otro servidor. Sin nonces (Next los exige en render dinámico y el directorio
// es estático/ISR), por eso 'unsafe-inline' en scripts, como indica la guía de Next.
// Servicios externos: Turnstile (antispam), teselas y buscador de OpenStreetMap,
// Supabase (API, Storage). Google (login) es una redirección, no necesita permiso.
// -----------------------------------------------------------------------------
const esDesarrollo = process.env.NODE_ENV === "development";
const enVercel = process.env.VERCEL === "1";
// Barra de comentarios de Vercel: solo en los previews.
const vercelLive = process.env.VERCEL_ENV === "preview" ? " https://vercel.live" : "";
const origenSupabase = supabaseUrl?.origin ?? "";
const wsSupabase = supabaseUrl ? `${supabaseUrl.protocol === "http:" ? "ws" : "wss"}://${supabaseUrl.host}` : "";
const TURNSTILE = "https://challenges.cloudflare.com";

const politicaContenido = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' ${TURNSTILE}${esDesarrollo ? " 'unsafe-eval'" : ""}${vercelLive}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: https://tile.openstreetmap.org ${origenSupabase}${vercelLive}`,
  "font-src 'self' data:",
  `connect-src 'self' ${origenSupabase} ${wsSupabase} https://nominatim.openstreetmap.org${esDesarrollo ? " ws:" : ""}${vercelLive}${vercelLive ? " wss://ws-us3.pusher.com" : ""}`,
  `frame-src ${TURNSTILE}${vercelLive}`,
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(enVercel ? ["upgrade-insecure-requests"] : []),
].join("; ");

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: {
    remotePatterns: supabaseUrl
      ? [
          {
            protocol: supabaseUrl.protocol === "http:" ? "http" : "https",
            hostname: supabaseUrl.hostname,
            port: supabaseUrl.port,
            pathname: "/storage/v1/object/public/business-images/**",
          },
        ]
      : [],
    // Un solo formato y pocos tamaños = menos transformaciones (cuota de Vercel).
    formats: ["image/webp"],
    deviceSizes: [640, 828, 1080, 1600],
    imageSizes: [96, 256, 384],
    // Las rutas llevan UUID y nunca se sobrescriben: se pueden cachear mucho tiempo.
    minimumCacheTTL: 2678400,
    dangerouslyAllowLocalIP: supabaseEsLocal,
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: politicaContenido },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          // Aísla la pestaña de ventanas abiertas desde otros sitios.
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          // geolocation=(self): "Usar mi ubicación actual" al fijar el pin del negocio.
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(self), payment=(), usb=(), browsing-topics=()",
          },
          // Solo HTTPS durante 2 años (en Vercel; en local se usa http://localhost).
          ...(enVercel ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" }] : []),
        ],
      },
      {
        // Áreas privadas: fuera de buscadores aunque alguien enlace a ellas.
        source: "/:area(admin|panel|dos-pasos)/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
    ];
  },
};

export default nextConfig;
