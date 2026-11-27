import type { NextConfig } from "next";

/**
 * The browser always talks to the same origin (/api/...). Next forwards those requests to the
 * Node API, which listens on API_INTERNAL_URL (127.0.0.1:4000 locally and inside the container).
 * Rewrites are resolved at build time, so the default is baked in for the Docker image.
 */
const apiInternalUrl = process.env.API_INTERNAL_URL ?? "http://127.0.0.1:4000";

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: new URL("../..", import.meta.url).pathname,
  transpilePackages: ["@rct/shared"],
  poweredByHeader: false,
  reactStrictMode: true,
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${apiInternalUrl}/api/:path*` }];
  },
  async headers() {
    return [
      {
        source: "/downloads/:file*.pdf",
        headers: [{ key: "Content-Disposition", value: "attachment" }],
      },
      {
        source: "/media/:file*",
        headers: [{ key: "Cache-Control", value: "public, max-age=86400" }],
      },
    ];
  },
};

export default nextConfig;
