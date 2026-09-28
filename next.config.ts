import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Add this env block to whitelist your variables for the browser
  env: {
    API_BASE_URL: process.env.API_BASE_URL,
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY: process.env.SUPABASE_PUBLISHABLE_KEY,
  },
  
  // Unblock your local developer gateway routes
  allowedDevOrigins: ['localhost:3000', '192.168.100.14', '192.168.100.14:3000'],
  
  // Forces Turbopack to lock explicitly into your dynamic working folder path
  turbopack: {
    root: process.cwd(),
  }
};

export default nextConfig;
