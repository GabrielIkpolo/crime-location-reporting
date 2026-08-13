/**
 * Service Worker for CrimeReport — Offline Support & Caching
 * 
 * This service worker provides:
 * - Caching of static assets (HTML, CSS, JS, images)
 * - API response caching for report data
 * - Offline fallback pages
 * - Background sync for pending actions
 * 
 * NOTE: To activate this service worker, you need to install next-pwa:
 *   pnpm add next-pwa @types/swc-plugin-cache-kv
 * 
 * Then update next.config.ts with the PWA plugin configuration.
 */

// @ts-nocheck - Placeholder service worker, not actively used yet

// Cache names
const CACHE_NAME = "crimereport-v1";
const API_CACHE_NAME = "crimereport-api-v1";
const OFFLINE_PAGES = ["/", "/map", "/my-reports"];

// ============================================================================
// INSTALL — Pre-cache static assets
// ============================================================================

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([
        // Core pages
        "/",
        "/map",
        "/my-reports",
        "/login",
        "/register",
        "/report",
        
        // Key assets (adjust paths based on your build output)
        "/_next/static/css/app.css",
        "/_next/static/js/main.js",
      ]);
    })
  );
  
  // Activate immediately
  self.skipWaiting();
});

// ============================================================================
// ACTIVATE — Clean up old caches
// ============================================================================

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME && name !== API_CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  
  // Take control of all clients immediately
  self.clients.claim();
});

// ============================================================================
// FETCH — Cache-first strategy for static assets, network-first for API
// ============================================================================

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== "GET") {
    return;
  }

  // Cache-first strategy for static assets
  if (url.pathname.startsWith("/_next/") || 
      url.pathname.startsWith("/api/admin/reports/bulk") ||
      url.pathname.endsWith(".js") || 
      url.pathname.endsWith(".css") ||
      url.pathname.endsWith(".png") ||
      url.pathname.endsWith(".jpg") ||
      url.pathname.endsWith(".svg")) {
    
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }

        return fetch(request).then((response) => {
          // Clone the response before caching
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });
          return response;
        }).catch(() => {
          // Return fallback for static assets if offline
          return new Response("Offline", { status: 503 });
        });
      })
    );

    return;
  }

  // Network-first strategy for API requests (with cache fallback)
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache successful responses
          const responseToCache = response.clone();
          caches.open(API_CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });
          return response;
        })
        .catch(() => {
          // Return cached response if available
          return caches.match(request);
        })
    );

    return;
  }

  // Stale-while-revalidate for pages
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request).then((response) => {
        // Update cache in background
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, responseToCache);
        });
        return response;
      }).catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});

// ============================================================================
// MESSAGE — Handle messages from the app (e.g., clear caches)
// ============================================================================

self.addEventListener("message", (event) => {
  const data = event.data;

  if (data.type === "CLEAR_CACHE") {
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => caches.delete(name))
      );
    }).then(() => {
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({ type: "CACHE_CLEARED" });
        });
      });
    });
  }

  if (data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// ============================================================================
// BACKGROUND SYNC — Handle pending actions when back online
// ============================================================================

self.addEventListener("sync", (event) => {
  if (event.tag === "sync-reports") {
    event.waitUntil(syncReports());
  }
});

async function syncReports() {
  // Check for pending reports to sync (stored in IndexedDB or localStorage)
  const pendingReports = await getPendingReports();
  
  if (pendingReports.length > 0) {
    // Sync each pending report
    for (const report of pendingReports) {
      try {
        await fetch("/api/reports", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(report),
        });
        
        // Remove from pending after successful sync
        await removePendingReport(report.id);
      } catch (error) {
        console.error("Failed to sync report:", error);
        break; // Stop on first failure, retry later
      }
    }
  }
}

// Placeholder functions for IndexedDB operations
async function getPendingReports(): Promise<any[]> {
  // TODO: Implement IndexedDB storage for pending reports
  return [];
}

async function removePendingReport(id: string): Promise<void> {
  // TODO: Remove from IndexedDB
}

// ============================================================================
// NOTIFICATION — Handle push notifications (future feature)
// ============================================================================

self.addEventListener("push", (event) => {
  const data = event.data?.json() || {};
  
  const options: NotificationOptions = {
    body: data.body || "New crime report near you",
    icon: "/icon-192.png",
    badge: "/badge-72.png",
    vibrate: [200, 100, 200],
    data: {
      url: data.url || "/",
      timestamp: Date.now(),
    },
  };

  event.waitUntil(
    self.registration.showNotification(data.title || "CrimeReport Alert", options)
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  
  const url = event.notification.data?.url || "/";
  
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clients) => {
      // Check if there's already a window open
      for (const client of clients) {
        if (client.url.includes(url) && "focus" in client) {
          return client.focus();
        }
      }
      
      // Open new window
      if (clients.length === 0) {
        return self.clients.openWindow(url);
      }
    })
  );
});

console.log("[ServiceWorker] CrimeReport service worker loaded");
