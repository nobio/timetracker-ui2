const nextConfig = {
  /* config options here */
  basePath: '/timetracker',
  assetPrefix: '/timetracker',
  reactStrictMode: true,
  output: 'standalone',
  allowedDevOrigins: ['localhost:3000', '127.0.0.1'],
  logging: {
    fetches: {
      fullUrl: true,
      method: true,
      status: true,
      duration: true,
      hmrRefreshes: true
    }
  },
  async rewrites() {
    console.log('NEXT_PUBLIC_API_URL', process.env.NEXT_PUBLIC_API_URL);
    return [
      {
        source: '/api-proxy/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:30000/api'}/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
