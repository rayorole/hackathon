import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@straatbeeld/contracts", "@kbo/core"],
};

export default nextConfig;
