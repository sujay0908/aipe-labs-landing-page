import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Don't write AGENTS.md on first `next dev`; doing so restarts the dev server.
  agentRules: false,
  // Pin the project root (a stray package-lock.json higher up confuses detection).
  turbopack: { root: __dirname },
  // The marketing page is the original static HTML, served unchanged at "/".
  async rewrites() {
    return { beforeFiles: [{ source: "/", destination: "/landing.html" }] };
  },
};

export default nextConfig;
