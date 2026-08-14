declare module 'next-pwa' {
  import type { NextConfig } from 'next';

  interface PWAOptions {
    dest?: string;
    register?: boolean;
    skipWaiting?: boolean;
    disable?: boolean;
    sw?: string;
    runtimeCaching?: Array<{
      urlPattern: RegExp | ((args: { request: Request }) => boolean);
      handler: string;
      options: Record<string, unknown>;
    }>;
  }

  function withPWA(options: PWAOptions): (config: NextConfig) => NextConfig;
  
  export default withPWA;
}
