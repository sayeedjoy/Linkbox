import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  allowedDevOrigins: ["*.trycloudflare.com"],
  skipTrailingSlashRedirect: true,
  cacheComponents: true,
  serverExternalPackages: ["bcryptjs", "pg"],
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
  async headers() {
    return [
      {
        source: "/admin/:path*",
        headers: [
          {
            key: "Cache-Control",
            value:
              "private, no-cache, no-store, max-age=0, must-revalidate",
          },
        ],
      },
      {
        source: "/dashboard/:path*",
        headers: [
          {
            key: "Cache-Control",
            value:
              "private, no-cache, no-store, max-age=0, must-revalidate",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
