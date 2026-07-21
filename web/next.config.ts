# For Vercel: use normal Next build (not static export) so env vars inject at build time.
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: { unoptimized: true },
};

export default nextConfig;
