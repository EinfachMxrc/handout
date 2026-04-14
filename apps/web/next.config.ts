import type { NextConfig } from "next";
import path from "path";

/**
 * `experimental.cpus: 1` + `workerThreads: false`: Vercel-Build crasht sonst
 * mit "Call retries were exceeded" (WorkerError) — der parallele Static-Gen
 * Worker-Pool läuft in Vercels 8GB-Limit out-of-memory. Serielles Building
 * ist etwas langsamer, aber zuverlässig.
 */
const nextConfig: NextConfig = {
  transpilePackages: ["@slide-handout/shared"],
  experimental: {
    cpus: 1,
    workerThreads: false,
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "@convex": path.resolve(__dirname, "../../convex"),
    };
    return config;
  },
};

export default nextConfig;
