const withPWA = require("next-pwa")({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: false,
  sw: "src/service-worker.ts",
  runtimeCaching: [
    // Cache-first for static assets (JS, CSS, images, fonts)
    {
      urlPattern: /^https?:\/\/.*\.(js|css|png|jpg|jpeg|gif|svg|ico|woff2?)$/i,
      handler: "CacheFirst",
      options: {
        cacheName: "static-assets",
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
        },
        cacheableResponse: {
          statuses: [0, 200],
        },
      },
    },
    // Network-first for API requests with cache fallback
    {
      urlPattern: /^https?:.*\/api\//i,
      handler: "NetworkFirst",
      options: {
        cacheName: "api-cache",
        networkTimeoutSeconds: 10,
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 5 * 60, // 5 minutes for API responses
        },
        cacheableResponse: {
          statuses: [0, 200],
        },
      },
    },
    // Stale-while-revalidate for page navigation
    {
      urlPattern: ({ request }) => request.mode === "navigate",
      handler: "StaleWhileRevalidate",
      options: {
        cacheName: "pages-cache",
        expiration: {
          maxEntries: 30,
          maxAgeSeconds: 24 * 60 * 60, // 24 hours
        },
        cacheableResponse: {
          statuses: [0, 200],
        },
      },
    },
  ],
});

module.exports = withPWA({
  turbopack: {},
});
