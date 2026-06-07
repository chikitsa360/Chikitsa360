import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  transpilePackages: ['@chikitsa360/ui', '@chikitsa360/branding', '@chikitsa360/core'],

  // Multi-tenant: each deployment sets NEXT_PUBLIC_CLIENT_ID env var
  env: {
    NEXT_PUBLIC_CLIENT_ID: process.env['NEXT_PUBLIC_CLIENT_ID'] ?? 'cliniqly',
  },
}

export default nextConfig
