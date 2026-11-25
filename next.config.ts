import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Izinkan akses dev server lewat tunnel ngrok. Tanpa ini, file JS dev
  // diblokir dan halaman tidak pernah hydrate (loading terus).
  allowedDevOrigins: [
    "*.ngrok-free.app",
    "*.ngrok-free.dev",
    "*.ngrok.app",
    "*.ngrok.io",
  ],
  cacheComponents: true,
  partialPrefetching: true,
  // Browser memanggil /api/* pada origin ini; Next meneruskannya ke backend. Dengan begitu cookie
  // sesi menjadi first-party (tanpa CORS dan tanpa SameSite=None), baik lokal maupun di Vercel.
  async rewrites() {
    const backend = process.env.BACKEND_URL ?? "http://localhost:3001";
    return [{ source: "/api/:path*", destination: `${backend}/api/:path*` }];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
