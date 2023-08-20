/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'export',
    webpack: (config, { isServer }) => {
      if (!isServer) {
        config.resolve.fallback = {
          ...config.resolve.fallback,
          fs: false,
          buffer: false
        };
      }
  
      return config;
    }
  }

module.exports = nextConfig
