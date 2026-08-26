/**
 * Enhanced Auth Helper — Supports both Cookie-based (browser) and Bearer token (Flutter/mobile) auth.
 * 
 * This file provides a unified way to get the current user session from any API route,
 * regardless of whether the request comes from a browser (cookie) or mobile app (Bearer token).
 */

import { NextRequest } from 'next/server';
import { auth as _auth } from "@/auth";
import { jwtDecode } from "jwt-decode";

interface DecodedToken {
  sub?: string;
  id?: string;
  email?: string;
  name?: string;
  role?: string;
  iat?: number;
  exp?: number;
}

/**
 * Get the current user session from either:
 * 1. Cookie-based auth (browser requests) — uses NextAuth's built-in session
 * 2. Bearer token auth (Flutter/mobile requests) — decodes JWT directly
 */
export async function getAuthSession(request?: NextRequest | null) {
  // Try cookie-based auth first (for browser requests)
  const session = await _auth();
  
  if (session?.user) {
    return session;
  }

  // If no cookie session, try Bearer token (for Flutter/mobile requests)
  if (request) {
    const authHeader = request.headers.get('authorization');
    
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      
      try {
        // Decode the JWT token to get user info
        const decoded = jwtDecode<DecodedToken>(token);
        
        if (decoded && decoded.id) {
          return {
            user: {
              id: decoded.id,
              email: decoded.email || null,
              name: decoded.name || null,
              image: null,
              role: decoded.role as 'USER' | 'ADMIN' | undefined,
            },
          };
        }
      } catch (error) {
        // Token is invalid or expired — return null
        console.warn('[Auth] Invalid Bearer token:', error);
      }
    }
  }

  return null;
}

/**
 * Check if the current user is an admin.
 * Returns true only if the user has ADMIN role.
 */
export async function isAdmin(request?: NextRequest | null): Promise<boolean> {
  const session = await getAuthSession(request);
  return session?.user?.role === 'ADMIN';
}

/**
 * Require admin access — returns a NextResponse error if not authorized.
 * Use this in API routes that require admin privileges.
 */
export async function requireAdmin(request: NextRequest | null): Promise<boolean> {
  const isAdm = await isAdmin(request);
  
  if (!isAdm) {
    return false;
  }
  
  return true;
}

/**
 * Get the current user ID from either cookie or Bearer token.
 */
export async function getCurrentUserId(request?: NextRequest | null): Promise<string | null> {
  const session = await getAuthSession(request);
  return session?.user?.id || null;
}
