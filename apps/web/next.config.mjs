/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true
  },
  // Improve development experience
  reactStrictMode: true,
  swcMinify: true,
  // Optimize hot reload
  webpack: (config, { dev, isServer }) => {
    if (dev && !isServer) {
      // Better source maps for debugging
      config.devtool = 'eval-source-map';
      
      // Ignore node_modules to speed up rebuilds
      config.watchOptions = {
        ignored: /node_modules/,
        poll: false,
      };
    }
    return config;
  },
  // Handle API routes timeout
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
};

export default nextConfig;
