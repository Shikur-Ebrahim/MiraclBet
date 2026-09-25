import type { NextConfig } from 'next';
const nextConfig: NextConfig = {
  images: { remotePatterns: [] },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
};
export default nextConfig;
