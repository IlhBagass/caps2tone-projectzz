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
