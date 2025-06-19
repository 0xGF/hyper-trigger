/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable experimental features
  experimental: {
    // appDir is now stable in Next.js 14, so we remove it
    serverComponentsExternalPackages: ['@wagmi/core', 'viem'],
  },

  // Environment variables
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY || 'default-value',
  },

  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://s3.tradingview.com https://charting-library.tradingview.com https://www.tradingview.com https://s.tradingview.com https://tradingview-widget.com https://www.tradingview-widget.com",
              "style-src 'self' 'unsafe-inline' https://s3.tradingview.com https://charting-library.tradingview.com https://www.tradingview.com https://s.tradingview.com https://tradingview-widget.com https://www.tradingview-widget.com",
              "img-src 'self' data: https: https://s3.tradingview.com https://charting-library.tradingview.com https://www.tradingview.com https://s.tradingview.com https://tradingview-widget.com https://www.tradingview-widget.com",
              "font-src 'self' data: https://s3.tradingview.com https://charting-library.tradingview.com https://www.tradingview.com https://s.tradingview.com https://tradingview-widget.com https://www.tradingview-widget.com",
              "connect-src 'self' https: wss: https://api.tradingview.com https://scanner.tradingview.com https://symbol-search.tradingview.com https://s.tradingview.com https://tradingview-widget.com https://www.tradingview-widget.com",
              "frame-src 'self' https://s3.tradingview.com https://charting-library.tradingview.com https://www.tradingview.com https://s.tradingview.com https://tradingview-widget.com https://www.tradingview-widget.com",
              "worker-src 'self' blob:",
              "child-src 'self' https://s3.tradingview.com https://charting-library.tradingview.com https://www.tradingview.com https://s.tradingview.com https://tradingview-widget.com https://www.tradingview-widget.com",
            ].join('; '),
          },
        ],
      },
    ]
  },

  // Webpack configuration
  webpack: (config, { dev, isServer }) => {
    // Fix for wagmi/viem in client-side
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      }
    }

    return config
  },

  // Transpile packages
  transpilePackages: ['@hyper-trigger/ui', '@hyper-trigger/contracts'],

  // Image optimization
  images: {
    domains: ['localhost'],
    formats: ['image/webp', 'image/avif'],
  },

  // Enable SWC minification
  swcMinify: true,

  // Disable powered by header
  poweredByHeader: false,

  // Strict mode
  reactStrictMode: true,
}

module.exports = nextConfig 