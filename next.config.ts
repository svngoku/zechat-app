import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  
  poweredByHeader: false,
  
  compress: true,
  
  experimental: {
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons'],
  },
  
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [],
  },
  
  typescript: {
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
