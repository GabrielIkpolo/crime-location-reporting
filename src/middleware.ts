import { middlewareAuth as auth } from "@/auth.middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Security headers middleware — runs on every request BEFORE auth check
function securityHeaders(request: NextRequest) {
  const response = NextResponse.next();

  // Content-Security-Policy — prevents XSS attacks
  response.headers.set(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://unpkg.com https://cdn.jsdelivr.net https://tile.openstreetmap.org",
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

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const role = req.auth?.user?.role;
  const isAdminRoute = req.nextUrl.pathname.startsWith("/admin");

  // Apply security headers to ALL responses
  let response = securityHeaders(req);

  if (isAdminRoute) {
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL("/login", req.nextUrl));
    }
    if (role !== "ADMIN") {
      return NextResponse.redirect(new URL("/", req.nextUrl));
    }
  }

  return response;
});

export const config = {
  matcher: ["/admin/:path*", "/profile/:path*"],
};
