import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Fotos de producto referenciadas directo del file server de LACA (spec 0009).
    remotePatterns: [
      { protocol: "https", hostname: "www.laboratoriolaca.com" },
      { protocol: "https", hostname: "laboratoriolaca.com" },
    ],
  },
};

export default nextConfig;
