import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  //basePath: '/timetracker',
  //assetPrefix: '/timetracker/',
  allowedDevOrigins: ['localhost:3000', '127.0.0.1', 'nobio.myhome-server.de'],
};

export default nextConfig;
