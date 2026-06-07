import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "api.dicebear.com",
        port: "",
        pathname: "/**",
      },
    ],
  },
  allowedDevOrigins: ["192.168.1.6", "localhost:3000", "localhost:3001"],
};

export default nextConfig;
