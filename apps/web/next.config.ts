import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone',
  // pnpm monorepo: standalone output traces from the repo root automatically
  // when WORKDIR is set to the root in the Docker builder stage
}

export default nextConfig
