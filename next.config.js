const nextConfig = {
  /* config options here */
  basePath: '/timetracker',
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
  }
};
module.exports = nextConfig;
