import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  turbopack: {
    resolveAlias: {
      "node:buffer": "buffer",
      "node:inspector": "inspector",
      "node:util": "util",
      "node:path": "path",
      "node:fs": "fs",
      "node:stream": "stream",
      "node:os": "os",
      "node:crypto": "crypto",
    },
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "node:buffer": "buffer",
      "node:inspector": "inspector",
      "node:util": "util",
      "node:path": "path",
      "node:fs": "fs",
      "node:stream": "stream",
      "node:os": "os",
      "node:crypto": "crypto",
    };
    return config;
  },
};

export default nextConfig;
