import type { NextConfig } from "next";

const supabaseHost = (() => {
  try {
    return process.env.NEXT_PUBLIC_SUPABASE_URL
      ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
      : undefined;
  } catch {
    return undefined;
  }
})();

const nextConfig: NextConfig = {
  // Permite builds de verificação em paralelo ao `next dev` (ex.: NEXT_DIST_DIR=.next-check).
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // Fontes lidas com fs no render; o fallback baixa de /fonts caso não estejam no bundle.
  outputFileTracingIncludes: {
    "/api/render": ["./public/fonts/**/*", "./public/textures/**/*"],
  },
  images: {
    remotePatterns: supabaseHost
      ? [
          { protocol: "https", hostname: supabaseHost, pathname: "/storage/v1/object/public/**" },
          { protocol: "https", hostname: "images.pexels.com" },
        ]
      : [{ protocol: "https", hostname: "images.pexels.com" }],
  },
  poweredByHeader: false,
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
