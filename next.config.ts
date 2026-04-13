import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  basePath: '/timetracker',
  assetPrefix: '/timetracker',
  reactStrictMode: true,
  output: 'standalone',
  allowedDevOrigins: ['localhost:3000', '127.0.0.1'],
  logging: {
    fetches: {
      fullUrl: true,
      hmrRefreshes: true
    }
  },
  async rewrites() {
    const targetApiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://nobio.myhome-server.de/api';
    console.log(`[Next.js Config] Proxying /api-proxy to ${targetApiUrl}`);

    return [
      {
        source: '/api-proxy/:path*',
        destination: `${targetApiUrl}/:path*`,
      },
    ];
  },
};

export default nextConfig;