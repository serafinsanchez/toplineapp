/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  // Support for large file uploads
  experimental: {
    serverActions: {
      bodySizeLimit: '26mb',
    }
  },
  // External packages for server components
  serverExternalPackages: ['sharp']
}

module.exports = nextConfig 