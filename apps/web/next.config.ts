import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  transpilePackages: ["@slide-handout/shared"],
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "@convex": path.resolve(__dirname, "../../convex"),
    };
    return config;
  },
};

export default nextConfig;
