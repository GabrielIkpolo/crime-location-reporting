import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Turbopack root to suppress warnings
  turbopack: {
    root: process.cwd(),
  },
  
  // ========================================================================
  // PWA CONFIGURATION — PLACEHOLDER (NOT YET ACTIVATED)
  // ========================================================================
  // To activate Service Worker support, install next-pwa first:
  //   pnpm add next-pwa @types/swc-plugin-cache-kv
  //
  // Then uncomment the following configuration:
  //
  // const withPWA = require('next-pwa')({
  //   dest: 'public',
  //   register: true,
  //   skipWaiting: true,
  //   disable: process.env.NODE_ENV === 'development',
  //   sw: 'src/service-worker.ts',
  //   runtimeCaching: [
  //     {
  //       urlPattern: /^https?.*/,
  //       handler: 'NetworkFirst',
  //       options: {
  //         cacheName: 'crimereport-cache',
  //         expiration: {
  //           maxEntries: 200,
  //           maxAgeSeconds: 24 * 60 * 60, // 24 hours
  //         },
  //         networkTimeoutSeconds: 10,
  //       },
  //     },
  //   ],
  // });
  //
  // module.exports = withPWA(nextConfig);
  // ========================================================================
};

export default nextConfig;
