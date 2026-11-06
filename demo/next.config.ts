import type { NextConfig } from "next";
import path from "node:path";

const root = path.resolve(process.cwd(), "..");

const nextConfig: NextConfig = {
  output: "standalone",
  turbopack: { root },
  outputFileTracingRoot: root,
};

export default nextConfig;
