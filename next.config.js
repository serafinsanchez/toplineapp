/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  // Support for large file uploads
  api: {
    bodyParser: {
      sizeLimit: '26mb'
    },
    responseLimit: '26mb'
  }
}

module.exports = nextConfig 