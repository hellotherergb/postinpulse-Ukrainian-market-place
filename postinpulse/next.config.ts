import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Headless checks call the dev server as 127.0.0.1. Next blocks that host unless it is listed.
  allowedDevOrigins: ["127.0.0.1"],
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
