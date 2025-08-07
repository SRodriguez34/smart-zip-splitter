/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable React Strict Mode for better development experience
  reactStrictMode: true,
  
  // Enable SWC minification for better performance
  swcMinify: true,
  
  experimental: {
    // Enable server actions
    serverActions: {
      bodySizeLimit: '50mb', // Increased limit for large file uploads
    },
    // Performance optimizations
    optimizeCss: true,
    scrollRestoration: true,
    esmExternals: true,
    // Enable modern JavaScript features
    turbo: {
      loaders: {
        '.svg': ['@svgr/webpack'],
      },
    },
  },

  // PWA and performance headers
  async headers() {
    return [
      // Service Worker headers
      {
        source: '/sw.js',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate'
          },
          {
            key: 'Service-Worker-Allowed',
            value: '/'
          }
        ]
      },
      // Manifest and static assets
      {
        source: '/manifest.json',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable'
          }
        ]
      },
      {
        source: '/icons/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable'
          }
        ]
      },
      // Security and CSP headers
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://apis.google.com https://accounts.google.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "connect-src 'self' https://accounts.google.com https://oauth2.googleapis.com https://www.googleapis.com https://api.qrserver.com",
              "img-src 'self' data: blob: https://api.qrserver.com https://lh3.googleusercontent.com",
              "worker-src 'self' blob:",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'none'",
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
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()'
          },
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          }
        ],
      },
    ];
  },

  // Optimize images with modern formats
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    minimumCacheTTL: 31536000,
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },

  // Webpack optimizations for performance and PWA
  webpack: (config, { dev, isServer }) => {
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

    // Add SVG support
    config.module.rules.push({
      test: /\.svg$/,
      use: ['@svgr/webpack']
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

    // Advanced bundle splitting for production
    if (!dev && !isServer) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            default: false,
            vendors: false,
            // Framework bundle
            framework: {
              name: 'framework',
              chunks: 'all',
              test: /[\\/]node_modules[\\/](react|react-dom)[\\/]/,
              priority: 40,
              enforce: true
            },
            // Vendor libraries
            vendor: {
              name: 'vendor',
              chunks: 'all',
              test: /[\\/]node_modules[\\/](?!(react|react-dom)[\\/])/,
              priority: 20
            },
            // Common components
            common: {
              name: 'common',
              minChunks: 2,
              chunks: 'all',
              priority: 10,
              reuseExistingChunk: true,
              enforce: true
            },
            // Google Drive integration (lazy loaded)
            googleDrive: {
              name: 'google-drive',
              chunks: 'async',
              test: /[\\/](hooks[\\/]use-google-drive|components[\\/](google-|drive-|share-results))\.tsx?$/,
              priority: 30
            },
            // ZIP processing (can be lazy loaded)
            zipProcessing: {
              name: 'zip-processing',
              chunks: 'async',
              test: /[\\/](lib[\\/](zip-processor|file-splitter|strategy-selector)|workers[\\/])\.ts$/,
              priority: 25
            }
          }
        }
      };

      // Production optimizations
      config.optimization.usedExports = true;
      config.optimization.sideEffects = false;
      config.optimization.innerGraph = true;
      config.optimization.concatenateModules = true;
    }

    // Adjust performance budgets
    config.performance = {
      ...config.performance,
      maxAssetSize: 1024 * 1024, // 1MB per asset
      maxEntrypointSize: 1024 * 1024, // 1MB per entrypoint
      hints: dev ? false : 'warning'
    };

    return config;
  },

  // Enable compression
  compress: true,

  // PoweredBy header removal for security
  poweredByHeader: false,

  // Output configuration for deployment
  output: 'standalone',

  // Trailing slash configuration for consistent URLs
  trailingSlash: false,

  // Bundle analyzer for development
  ...(process.env.ANALYZE === 'true' && {
    webpack: (config, { isServer }) => {
      if (!isServer) {
        const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
        config.plugins.push(
          new BundleAnalyzerPlugin({
            analyzerMode: 'server',
            analyzerPort: 3001,
            openAnalyzer: true,
          })
        );
      }
      return config;
    },
  }),

  // Redirects for SEO and UX
  async redirects() {
    return [
      {
        source: '/home',
        destination: '/',
        permanent: true,
      },
      {
        source: '/app',
        destination: '/',
        permanent: true,
      }
    ];
  },
};

module.exports = nextConfig;
