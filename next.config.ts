import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Unblock your local developer gateway routes
  allowedDevOrigins: ['localhost:3000', '192.168.100.14', '192.168.100.14:3000'],
  
  // Forces Turbopack to lock explicitly into your dynamic working folder path
  turbopack: {
    root: process.cwd(),
  }
};

export default nextConfig;