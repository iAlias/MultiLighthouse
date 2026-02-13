import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["lighthouse", "chrome-launcher", "@paulirish/trace_engine"],
};

export default nextConfig;
