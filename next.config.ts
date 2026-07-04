import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 1. Unblock your local developer gateway routes
  allowedDevOrigins: ['localhost:3000', '192.168.100.14', '192.168.100.14:3000'],
  
  // 2. Fix your project root directory setting directly on the root level
  turbopack: {
    root: ".",
  }
};

export default nextConfig;