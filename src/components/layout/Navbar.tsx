"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShieldAlert, MapPin, Eye, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { signIn, signOut, useSession } from "next-auth/react";

export default function Navbar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  const navLinks = [
    { name: "Safety Map", href: "/map", icon: Eye },
    { name: "Report Crime", href: "/report", icon: MapPin },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-bold text-xl">
          <ShieldAlert className="w-6 h-6 text-primary" />
          <span>CrimeReport</span>
        </Link>

        <nav className="hidden md:flex items-center gap-6">
          {navLinks.map((link) => (
            <Link 
              key={link.href} 
              href={link.href}
              className={cn(
                "text-sm font-medium transition-colors hover:text-primary",
                pathname === link.href ? "text-primary" : "text-muted-foreground"
              )}
            >
              {link.name}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          {session ? (
            <div className="flex items-center gap-3">
              <Link 
                href="/my-reports" 
                className={cn(
                  "text-sm font-medium transition-colors hover:text-primary",
                  pathname === "/my-reports" ? "text-primary" : "text-muted-foreground"
                )}
              >
                My Reports
              </Link>
              <div className="hidden sm:flex items-center gap-2 text-sm font-medium">
                <User className="w-4 h-4" />
                <span>{session.user?.name}</span>
              </div>
              <Button variant="ghost" size="sm" onClick={() => signOut()}>
                Logout
              </Button>
            </div>
          ) : (
            <Link href="/login">
              <Button variant="default" size="sm">
                Login
              </Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
