import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lessons and the landing page are read from disk at request/build time.
  outputFileTracingIncludes: {
    "/": ["./landing/**/*"],
    "/learn/**": ["./content/**/*"],
    "/admin/**": ["./content/**/*"],
  },
};

export default nextConfig;
