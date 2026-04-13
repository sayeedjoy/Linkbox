import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  allowedDevOrigins: ["*.trycloudflare.com"],
  skipTrailingSlashRedirect: true,
  cacheComponents: true,
  serverExternalPackages: ["bcryptjs", "pg", "@prisma/client"],
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
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
  async rewrites() {
    return [
      {
        source: "/api/bookmarks/:bookmarkId/refetch",
        destination: "/api/bookmarks/:bookmarkId",
      },
    ];
  },
};

export default nextConfig;
