import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable standalone output for Docker deployment
  // This creates a minimal server.js with only necessary node_modules
  output: 'standalone',

  // Note: ESLint configuration is now handled via eslint.config.mjs
  // To disable ESLint during builds, set ESLINT_SKIP=true in environment
};

export default nextConfig;
