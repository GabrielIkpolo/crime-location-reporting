import { middlewareAuth as auth } from "@/auth.middleware";
import { NextResponse } from "next/server";

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const role = req.auth?.user?.role;
  const isAdminRoute = req.nextUrl.pathname.startsWith("/admin");

  if (isAdminRoute) {
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL("/login", req.nextUrl));
    }
    if (role !== "ADMIN") {
      return NextResponse.redirect(new URL("/", req.nextUrl));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/admin/:path*", "/profile/:path*"],
};
