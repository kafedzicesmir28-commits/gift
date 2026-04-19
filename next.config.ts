import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Bez ovoga: `/romantic-gift/` → 308 na `/romantic-gift` → 404 (nema auto index.html)
  async rewrites() {
    return [
      {
        source: "/romantic-gift",
        destination: "/romantic-gift/index.html",
      },
    ];
  },
};

export default nextConfig;
