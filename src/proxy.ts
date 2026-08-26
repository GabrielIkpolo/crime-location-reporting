import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// ============================================================================
// MIGRATION: middleware.ts → proxy.ts (Next.js 16)
// The 'middleware' file convention is deprecated. Use 'proxy' instead.
// See: https://nextjs.org/docs/messages/middleware-to-proxy
// ============================================================================

// Maximum request body size: 1MB (Audit fix Phase 3 #12)
const MAX_BODY_SIZE = 1 * 1024 * 1024; // 1 MB

// ============================================================================
// CORS for Flutter app integration — migrated from middleware.ts
// The original middleware.ts handled CORS headers for the Flutter mobile app.
// This is now merged into proxy.ts to avoid Next.js 16's "both detected" error.
// See: https://nextjs.org/docs/messages/middleware-to-proxy
// ============================================================================
const FLUTTER_ALLOWED_ORIGINS = [
  'http://localhost:3000',   // Next.js dev server
  'http://127.0.0.1:3000',
];

// Security headers middleware — runs on every request BEFORE auth check
function securityHeaders(request: NextRequest): NextResponse {
  const response = NextResponse.next();

  // Content-Security-Policy — prevents XSS attacks
  // NOTE: 'unsafe-eval' is required in development for Turbopack + React dev features.
  // In production, eval() is never used by React and can be safely omitted.
  const isDev = process.env.NODE_ENV === "development";
  const unsafeEval = isDev ? "'unsafe-eval'" : "";

  response.headers.set(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      `script-src 'self' ${unsafeEval.trim()} 'unsafe-inline' https://unpkg.com https://cdn.jsdelivr.net https://tile.openstreetmap.org`.trim(),
      "style-src 'self' 'unsafe-inline' https://unpkg.com https://fonts.googleapis.com",
      "img-src 'self' data: blob: https://res.cloudinary.com https://*.tile.openstreetmap.org https://avatars.githubusercontent.com",
      "font-src 'self' https://fonts.gstatic.com https://unpkg.com",
      "connect-src 'self' https://*.tile.openstreetmap.org wss://* ws://*",
      "frame-src https://www.google.com",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "upgrade-insecure-requests",
    ].join("; ")
  );

  // Prevent clickjacking
  response.headers.set("X-Frame-Options", "DENY");

  // Prevent MIME type sniffing
  response.headers.set("X-Content-Type-Options", "nosniff");

  // XSS Protection (legacy, for older browsers)
  response.headers.set("X-XSS-Protection", "1; mode=block");

  // Referrer Policy — control how much referrer info is shared
  response.headers.set(
    "Referrer-Policy",
    "strict-origin-when-cross-origin"
  );

  // Permissions Policy — restrict browser features
  response.headers.set(
    "Permissions-Policy",
    [
      "camera=(), microphone=(), geolocation=(self)",
      "payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()",
    ].join(", ")
  );

  // Strict-Transport-Security — enforce HTTPS (only in production)
  if (process.env.NODE_ENV === "production") {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=63072000; includeSubDomains; preload"
    );
  }

  // Remove server identification header
  response.headers.delete("Server");

  return response;
}

// CORS headers for Flutter app — only on API routes
function corsHeaders(request: NextRequest, response: NextResponse): void {
  const isApiRoute = request.nextUrl.pathname.startsWith('/api/');
  if (!isApiRoute) return;

  const origin = request.headers.get('origin');
  
  // Check if the origin matches allowed patterns (including localhost with any port for Flutter hot reload)
  let isAllowed = FLUTTER_ALLOWED_ORIGINS.some(pattern => {
    if (pattern.includes('*')) {
      const basePattern = pattern.replace('*', '');
      return origin?.startsWith(basePattern) ?? false;
    }
    return origin === pattern;
  });

  // Also allow any localhost:* for Flutter hot reload
  if (!isAllowed && origin?.match(/^http:\/\/localhost:\d+$/)) {
    isAllowed = true;
  }

  if (origin && isAllowed) {
    response.headers.set('Access-Control-Allow-Origin', origin);
  }

  // Always set these headers for preflight and actual requests on API routes
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  response.headers.set('Access-Control-Max-Age', '86400'); // Cache preflight for 24 hours
}

// Body size enforcement middleware
function enforceBodySize(request: NextRequest): NextResponse | null {
  const contentLength = request.headers.get("content-length");
  
  if (contentLength) {
    const bodySize = parseInt(contentLength, 10);
    
    // Only check POST/PUT/PATCH requests with a body
    if (["POST", "PUT", "PATCH"].includes(request.method) && bodySize > MAX_BODY_SIZE) {
      return NextResponse.json(
        { error: `Request body too large. Maximum size is 1MB.` },
        { status: 413 }
      );
    }
  }

  return null; // No issue, continue processing
}

export default function middleware(req: NextRequest) {
  // Handle CORS preflight requests for Flutter app (migrated from middleware.ts)
  if (req.method === 'OPTIONS' && req.nextUrl.pathname.startsWith('/api/')) {
    const response = new NextResponse(null, { status: 204 });
    const origin = req.headers.get('origin');
    
    // Allow any localhost:* for Flutter hot reload
    if (origin?.match(/^http:\/\/localhost:\d+$/)) {
      response.headers.set('Access-Control-Allow-Origin', origin);
    }
    
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return response;
  }

  const isAdminRoute = req.nextUrl.pathname.startsWith("/admin");

  // Enforce body size limit on all requests (Audit fix Phase 3 #12)
  const bodySizeResponse = enforceBodySize(req);
  if (bodySizeResponse) {
    return bodySizeResponse;
  }

  // Apply security headers to ALL responses
  let response = securityHeaders(req);

  // Apply CORS headers for Flutter app (API routes only)
  corsHeaders(req, response);

  // Admin route protection — check for session cookie presence
  // This is a lightweight check that doesn't require NextAuth in edge runtime.
  // The actual auth/session validation happens on the client side via SessionProvider
  // and server-side API routes via the full NextAuth instance.
  if (isAdminRoute) {
    // NextAuth v5 beta.31 (@auth/core@0.41.2) uses these cookie names:
    // - authjs.session-token          (HTTP / localhost dev)
    // - __Secure-authjs.session-token (HTTPS / production, when useSecureCookies=true)
    // Cookies may also be chunked with numeric suffixes: .0, .1, etc.
    let hasSessionToken = false;
    for (const [name] of req.cookies) {
      if (
        name === "authjs.session-token" ||
        name.startsWith("authjs.session-token.") ||
        name === "__Secure-authjs.session-token" ||
        name.startsWith("__Secure-authjs.session-token.")
      ) {
        hasSessionToken = true;
        break;
      }
    }

    if (!hasSessionToken) {
      return NextResponse.redirect(new URL("/login", req.nextUrl));
    }
  }

  return response;
}

// Match all routes except static assets and Next.js internals
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, robots.txt, sitemap.xml
     */
    '/((?!_next/static|_next/image|favicon.ico|robots\\.txt|sitemap\\.xml).*)',
  ],
};
