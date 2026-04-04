import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ['10.224.69.76'],
  outputFileTracingRoot: process.cwd(),
};

export default nextConfig;
