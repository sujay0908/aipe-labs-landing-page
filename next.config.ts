import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The marketing page is the original static HTML, served unchanged at "/".
  async rewrites() {
    return { beforeFiles: [{ source: "/", destination: "/landing.html" }] };
  },
};

export default nextConfig;
