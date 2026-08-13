/**
 * Service Worker for CrimeReport — Offline Support & Caching
 * 
 * This service worker is managed by next-pwa. It provides:
 * - Cache-first strategy for static assets (HTML, CSS, JS, images)
 * - Network-first strategy for API requests with cache fallback
 * - Stale-while-revalidate for pages
 * - Background sync for pending actions
 * 
 * NOTE: This file is used by next-pwa. The actual registration and caching
 * strategies are configured in next.config.ts.
 */

// @ts-nocheck - Service worker context has different globals

const CACHE_NAME = "crimereport-v1";
const API_CACHE_NAME = "crimereport-api-v1";
const OFFLINE_PAGES = ["/", "/map", "/my-reports"];

// ============================================================================
// INSTALL — Pre-cache core pages and assets
// ============================================================================

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([
        // Core pages for offline access
        "/",
        "/map",
        "/my-reports",
        "/login",
        "/register",
        "/report",
      ]);
    })
  );
  
  // Activate immediately without waiting
  self.skipWaiting();
});

// ============================================================================
// ACTIVATE — Clean up old caches and take control
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
// FETCH — Caching strategies based on request type
// ============================================================================

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== "GET") {
    return;
  }

  // Strategy 1: Cache-first for static assets
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.endsWith(".js") ||
    url.pathname.endsWith(".css") ||
    /\.(png|jpg|jpeg|gif|svg|ico|woff2?)$/.test(url.pathname)
  ) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }

        return fetch(request).then((response) => {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });
          return response;
        }).catch(() => {
          // Return fallback for static assets if offline
          return new Response("Offline", { status: 503, statusText: "Service Unavailable" });
        });
      })
    );
    return;
  }

  // Strategy 2: Network-first with cache fallback for API requests
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(request)
        .then((response) => {
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

  // Strategy 3: Stale-while-revalidate for page navigation
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request).then((response) => {
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, responseToCache);
        });
        return response;
      }).catch(() => cachedResponse);

      // Return cached page immediately, update in background
      return cachedResponse || fetchPromise;
    })
  );
});

// ============================================================================
// MESSAGE — Handle messages from the app (e.g., clear caches)
// ============================================================================

self.addEventListener("message", (event) => {
  const data = event.data;

  if (!data || !data.type) return;

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
        console.error("[ServiceWorker] Failed to sync report:", error);
        break; // Stop on first failure, retry later
      }
    }
  }
}

// Placeholder functions for IndexedDB operations
async function getPendingReports(): Promise<any[]> {
  try {
    const stored = localStorage.getItem("crimereport-pending-reports");
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

async function removePendingReport(id: string): Promise<void> {
  try {
    const stored = localStorage.getItem("crimereport-pending-reports");
    if (stored) {
      const reports = JSON.parse(stored).filter((r: any) => r.id !== id);
      localStorage.setItem("crimereport-pending-reports", JSON.stringify(reports));
    }
  } catch {
    // Silently fail
  }
}

// ============================================================================
// PUSH NOTIFICATIONS — Handle push notifications (future feature)
// ============================================================================

self.addEventListener("push", (event) => {
  const data = event.data?.json() || {};
  
  const options: NotificationOptions = {
    body: data.body || "New crime report near you",
    icon: "/icon-192.png",
    badge: "/icon-72.png",
    vibrate: [200, 100, 200],
    data: {
      url: data.url || "/",
      timestamp: Date.now(),
    },
    actions: [
      { action: "view", title: "View Report" },
      { action: "dismiss", title: "Dismiss" },
    ],
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
      for (const client of clients) {
        if (client.url.includes(url) && "focus" in client) {
          return client.focus();
        }
      }
      
      if (clients.length === 0) {
        return self.clients.openWindow(url);
      }
    })
  );
});

self.addEventListener("notificationclose", (event) => {
  console.log("[ServiceWorker] Notification closed:", event.notification.title);
});

console.log("[ServiceWorker] CrimeReport service worker loaded");
