/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    const target = process.env.API_BACKEND_URL || 'http://localhost:8080';
    return [{ source: '/api/:path*', destination: `${target}/:path*` }];
  },
}

module.exports = nextConfig
