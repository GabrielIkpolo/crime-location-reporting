import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Turbopack root to suppress warnings
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
