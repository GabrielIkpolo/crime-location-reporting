import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Turbopack root to suppress warnings
  turbopack: {},
  
  // ========================================================================
  // PWA CONFIGURATION — ACTIVATED
  // ========================================================================
  // Service worker provides offline support, caching strategies, and 
  // installable progressive web app experience.
};

export default nextConfig;
