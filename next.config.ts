import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Product photos referenced straight from serlaca's file server (spec 0009).
    remotePatterns: [
      { protocol: "https", hostname: "api.serlaca.com" },
      { protocol: "https", hostname: "www.serlaca.com" },
    ],
  },
};

export default nextConfig;
