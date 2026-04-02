import type { NextConfig } from "next";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  // Parent monorepo folder may contain another lockfile; trace from this app root
  outputFileTracingRoot: path.join(__dirname),
};

export default nextConfig;
