import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "picsum.photos",
      },
      {
        protocol: "https",
        hostname: "woodys-seahorse.b-cdn.net",
      },
      {
        protocol: "https",
        hostname: "woodysWebsite.b-cdn.net",
      },
    ],
  },
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.locallfs.com" }],
        destination: "https://www.seahorseaquariumsupply.com/:path*",
        permanent: true,
      },
      {
        source: "/:path*",
        has: [{ type: "host", value: "locallfs.com" }],
        destination: "https://www.seahorseaquariumsupply.com/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
