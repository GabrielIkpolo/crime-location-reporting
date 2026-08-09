import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Maximum request body size: 1MB (Audit fix Phase 3 #12)
const MAX_BODY_SIZE = 1 * 1024 * 1024; // 1 MB

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
  const isAdminRoute = req.nextUrl.pathname.startsWith("/admin");

  // Enforce body size limit on all requests (Audit fix Phase 3 #12)
  const bodySizeResponse = enforceBodySize(req);
  if (bodySizeResponse) {
    return bodySizeResponse;
  }

  // Apply security headers to ALL responses
  let response = securityHeaders(req);

  // Admin route protection — check for session cookie presence
  // This is a lightweight check that doesn't require NextAuth in edge runtime.
  // The actual auth/session validation happens on the client side via SessionProvider
  // and server-side API routes via the full NextAuth instance.
  if (isAdminRoute) {
    // NextAuth v5 can set different cookie names depending on context:
    // - __Host-next-auth.session.token (default, requires secure context)
    // - __Secure-next-auth.session-token (alternative prefix)
    // - next-auth.session.token (dev mode over HTTP, no prefix)
    const hasSessionToken = req.cookies.has("__Host-next-auth.session.token") ||
                            req.cookies.has("__Secure-next-auth.session-token") ||
                            req.cookies.has("next-auth.session.token");
    
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
