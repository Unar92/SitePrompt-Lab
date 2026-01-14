import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Enable static export for cPanel deployment without Node.js
  output: 'export',
  // Configure base path for subdirectory deployment
  basePath: '',
  // Disable image optimization for static export
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
