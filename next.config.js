/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Enable server actions
    serverActions: {
      bodySizeLimit: '50mb', // Increased limit for large file uploads
    },
  },

  // Configure webpack for large files and Web Workers
  webpack: (config, { isServer }) => {
    // Add support for Web Workers
    config.module.rules.push({
      test: /\.worker\.ts$/,
      use: {
        loader: 'worker-loader',
        options: {
          name: 'static/[hash].worker.js',
          publicPath: '/_next/',
        },
      },
    });

    // Handle large files more efficiently
    config.module.rules.push({
      test: /\.(zip|7z|rar|tar|gz)$/,
      type: 'asset/resource',
      generator: {
        filename: 'static/files/[hash][ext][query]',
      },
    });

    // Optimize for client-side file handling
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
      };
    }

    // Increase the maximum asset size for production builds
    config.performance = {
      ...config.performance,
      maxAssetSize: 5 * 1024 * 1024, // 5MB
      maxEntrypointSize: 5 * 1024 * 1024, // 5MB
    };

    return config;
  },

  // Security headers including CSP for Google APIs
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://apis.google.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "connect-src 'self' https://accounts.google.com https://oauth2.googleapis.com",
              "img-src 'self' data: blob:",
              "worker-src 'self' blob:",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join('; '),
          },
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
        ],
      },
    ];
  },

  // Optimize images
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
  },

  // Enable compression
  compress: true,

  // PoweredBy header removal
  poweredByHeader: false,

  // Strict mode for React
  reactStrictMode: true,


  // Output configuration for better performance
  output: 'standalone',
};

module.exports = nextConfig;
