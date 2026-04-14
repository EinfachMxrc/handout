import type { NextConfig } from "next";
import path from "path";

const convexPath = path.resolve(__dirname, "../../convex");

/**
 * Next.js 16 uses Turbopack by default for build + dev. Webpack only runs when
 * you pass `--webpack`. We configure both so the `@convex` alias resolves under
 * either bundler.
 *
 * `experimental.cpus: 1` + `workerThreads: false` guards against Vercel's build
 * workers crashing with "Call retries were exceeded" under memory pressure.
 */
const nextConfig: NextConfig = {
  transpilePackages: ["@slide-handout/shared"],
  experimental: {
    cpus: 1,
    workerThreads: false,
  },
  turbopack: {
    resolveAlias: {
      "@convex": convexPath,
    },
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "@convex": convexPath,
    };
    return config;
  },
};

export default nextConfig;
