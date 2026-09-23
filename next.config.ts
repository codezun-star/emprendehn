import type { NextConfig } from "next";

// Las fotos de los negocios viven en Supabase Storage (bucket público business-images).
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL)
  : null;

// Solo para desarrollo con Supabase local (127.0.0.1): permitir optimizar imágenes
// desde una IP local. En producción (supabase.co) queda desactivado.
const supabaseEsLocal =
  supabaseUrl !== null && ["127.0.0.1", "localhost"].includes(supabaseUrl.hostname);

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
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
