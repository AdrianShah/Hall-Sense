import type { NextConfig } from "next";

// Normal Next build for Vercel (env vars inject at build time).
const nextConfig: NextConfig = {
  images: { unoptimized: true },
};

export default nextConfig;
