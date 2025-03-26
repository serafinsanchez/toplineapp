/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  // Support for large file uploads
  experimental: {
    serverComponentsExternalPackages: ['sharp'],
    serverActions: {
      bodySizeLimit: '26mb',
    },
  },
  // Properly configure API routes (for pages/api routes)
  api: {
    bodyParser: {
      sizeLimit: '26mb'
    },
    responseLimit: '26mb'
  }
}

module.exports = nextConfig 