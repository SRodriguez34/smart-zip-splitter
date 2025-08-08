# Smart ZIP Splitter PWA

A modern, production-ready Progressive Web App for intelligent ZIP file splitting and processing. Built with Next.js 15, TypeScript, Tailwind CSS, and comprehensive PWA features including offline support and Google Drive integration.

## ✨ Features

### Core Features
- **Smart File Splitting**: Intelligent algorithms to optimize file splitting based on size constraints
- **Client-Side Processing**: All processing happens in your browser - your files never leave your device
- **Dual Processing Strategies**: Choose between client-side processing or Google Drive upload with sharing
- **Real-Time Progress**: Live progress tracking with detailed status updates and speed indicators
- **Drag & Drop**: Intuitive file upload with drag-and-drop support
- **Batch Downloads**: Download individual files or bulk download all processed files
- **Web Workers**: Background processing that doesn't block the UI

### PWA Features 🚀
- **Progressive Web App**: Full PWA with offline support and native app-like experience
- **Offline Functionality**: Works completely offline for client-side processing
- **Install Prompt**: Custom install prompt with device-specific messaging
- **Background Sync**: Failed uploads are queued and retried when connection is restored
- **Push Notifications**: Upload status notifications with actionable buttons
- **App Shortcuts**: Quick access to split files, upload to Drive, and settings
- **Share Target**: Accept files shared from other apps (on supported platforms)
- **Responsive Icons**: Comprehensive icon set including maskable icons for Android

### Google Drive Integration ☁️
- **OAuth2 Authentication**: Secure Google Drive authentication with PKCE
- **Automatic Upload**: Upload processed fragments directly to Google Drive
- **Folder Organization**: Creates timestamped folders for easy organization
- **Google Sheets Integration**: Automatically creates shareable spreadsheet with download links
- **Public Sharing**: Makes files publicly accessible with shareable links
- **Quota Monitoring**: Real-time Google Drive storage quota tracking
- **Retry Logic**: Automatic retry with exponential backoff for failed uploads
- **Progress Tracking**: Individual file upload progress with speed estimation

### Performance & Technical
- **Lighthouse Score**: Optimized for 95+ Lighthouse performance score
- **Core Web Vitals**: Optimized CLS, FID, FCP, LCP, and TTFB metrics
- **Code Splitting**: Dynamic imports and lazy loading for optimal bundle size
- **Service Worker**: Advanced caching strategies with background sync
- **TypeScript**: Fully typed for better development experience and fewer bugs
- **Modern UI**: Beautiful, responsive interface with smooth animations

## 🚀 Tech Stack

### Frontend & Core
- **Next.js 15**: React framework with App Router and advanced optimizations
- **TypeScript**: Strict mode enabled for type safety and better DX
- **Tailwind CSS**: Utility-first CSS framework with custom theme
- **shadcn/ui**: Modern, accessible component library
- **Framer Motion**: Smooth animations and transitions
- **React Dropzone**: File upload with drag-and-drop support

### PWA & Performance
- **Service Worker**: Custom service worker with advanced caching strategies
- **Web App Manifest**: Complete PWA manifest with icons and shortcuts
- **IndexedDB**: Client-side database for offline data storage
- **Background Sync**: Retry failed operations when connection is restored
- **Web Vitals**: Performance monitoring with Core Web Vitals tracking
- **Sharp**: High-performance image processing for icon generation

### File Processing
- **JSZip**: Client-side ZIP file processing and manipulation
- **Client-Zip**: Streaming ZIP creation for large files
- **Web Workers**: Background processing that doesn't block the UI
- **File Saver**: Client-side file downloads

### Google Integration
- **Google APIs**: Drive API v3 and Sheets API v4
- **OAuth2 with PKCE**: Secure authentication flow
- **Google Drive SDK**: File upload, sharing, and organization
- **Google Sheets**: Automatic spreadsheet creation with download links

### Development & Testing
- **ESLint**: Code linting with custom rules
- **Prettier**: Code formatting and consistency
- **Jest**: Unit testing framework
- **Playwright**: End-to-end testing
- **Lighthouse CI**: Automated performance testing

### Icons & UI
- **Lucide React**: Beautiful, customizable icons
- **Custom Icon System**: SVG-based icons with multiple sizes
- **Responsive Design**: Mobile-first approach with adaptive layouts

## 🛠 Development Setup

### Prerequisites

- Node.js 18+
- npm or yarn or pnpm

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd smart-zip-splitter

# Install dependencies
npm install

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Available Scripts

```bash
# Development
npm run dev          # Start development server
npm run build        # Build for production (includes icon generation)
npm run build:prod   # Production build with bundle analysis
npm run start        # Start production server

# Code Quality
npm run lint         # Run ESLint
npm run lint:fix     # Fix ESLint issues
npm run format       # Format code with Prettier

# Testing
npm run test         # Run Jest tests
npm run test:watch   # Run Jest in watch mode
npm run test:e2e     # Run Playwright E2E tests

# PWA & Icons
npm run icons:generate  # Generate all PWA icons from SVG
npm run pwa:test       # Build and test PWA locally

# Analysis & Performance
npm run analyze        # Analyze bundle size
npm run lighthouse     # Run Lighthouse performance test
npm run lighthouse:ci  # Run Lighthouse in CI mode

# Service Worker
npm run sw:update      # Update service worker configuration
```

## 📁 Project Structure

```
smart-zip-splitter/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   │   ├── auth/google/   # Google OAuth endpoints
│   │   └── vitals/        # Performance monitoring
│   ├── globals.css        # Global styles with PWA optimizations
│   ├── layout.tsx         # Root layout with PWA metadata
│   └── page.tsx           # Home page
├── components/            # React components
│   ├── ui/               # shadcn/ui base components
│   ├── pwa/              # PWA-specific components
│   │   ├── install-prompt.tsx      # Custom install prompt
│   │   ├── update-notification.tsx # SW update notifications
│   │   └── offline-indicator.tsx   # Network status indicator
│   ├── google-auth-flow.tsx        # Google Drive authentication
│   ├── drive-upload-progress.tsx   # Upload progress tracking
│   ├── share-results.tsx          # File sharing components
│   └── pwa-provider.tsx           # PWA context provider
├── hooks/                 # Custom React hooks
│   ├── use-google-drive.ts        # Google Drive integration
│   ├── use-app-state.ts           # Global state management
│   └── use-processing.ts          # File processing logic
├── lib/                   # Utility functions and business logic
│   ├── google-drive-client.ts     # Google Drive API client
│   ├── file-splitter.ts          # Core splitting logic
│   └── zip-processor.ts          # ZIP processing utilities
├── types/                 # TypeScript type definitions
│   ├── processing.ts             # File processing types
│   └── ui.ts                     # UI component types
├── workers/               # Web Workers for background processing
│   └── zip-worker.ts             # ZIP processing worker
├── public/                # Static assets
│   ├── icons/            # PWA icons (generated)
│   │   ├── icon-*.png    # Standard icons (16px-512px)
│   │   ├── icon-maskable-*.png   # Android maskable icons
│   │   └── icon-apple-touch-*.png # iOS icons
│   ├── icon.svg          # Base SVG icon for generation
│   ├── manifest.json     # PWA manifest
│   ├── sw.js            # Service Worker
│   ├── offline.html     # Offline fallback page
│   └── robots.txt       # SEO configuration
├── scripts/               # Build and utility scripts
│   └── generate-icons.js         # PWA icon generation
├── tests/                 # Test files
│   ├── unit/             # Unit tests
│   ├── integration/      # Integration tests
│   └── e2e/              # End-to-end tests
├── docs/                  # Documentation
│   └── GOOGLE_DRIVE_SETUP.md    # Google Drive setup guide
├── next.config.js         # Next.js config with PWA optimizations
├── vercel.json           # Vercel deployment configuration
└── package.json          # Dependencies and scripts
```

## ⚙️ Configuration

### Environment Variables

Create `.env.local` for local development:

```bash
# Google Drive Integration (required for CLIENT_DRIVE strategy)
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_oauth_client_id

# NextAuth Configuration
NEXTAUTH_SECRET=your_nextauth_secret_key
NEXTAUTH_URL=http://localhost:3000

# Analytics & Monitoring (optional)
NEXT_PUBLIC_GA_TRACKING_ID=your_google_analytics_id
NEXT_PUBLIC_POSTHOG_KEY=your_posthog_project_key
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com

# Web Vitals & Performance Monitoring
NEXT_PUBLIC_VITALS_URL=/api/vitals
GA_API_SECRET=your_ga4_measurement_protocol_secret

# PWA & Service Worker
NEXT_PUBLIC_SW_VERSION=v1.0.0
NEXT_PUBLIC_CACHE_VERSION=v1.0.0

# External Webhooks (optional)
ANALYTICS_WEBHOOK_URL=your_custom_analytics_endpoint
ANALYTICS_WEBHOOK_SECRET=your_webhook_secret

# Site Verification (optional)
GOOGLE_SITE_VERIFICATION=your_google_search_console_verification
YANDEX_VERIFICATION=your_yandex_webmaster_verification
```

### Google Drive Setup

For Google Drive integration, you'll need to:

1. Create a Google Cloud Project
2. Enable Drive API and Sheets API
3. Create OAuth 2.0 credentials
4. Configure authorized origins and redirect URIs

See [docs/GOOGLE_DRIVE_SETUP.md](docs/GOOGLE_DRIVE_SETUP.md) for detailed instructions.

### TypeScript Configuration

This project uses strict TypeScript configuration:

- Strict mode enabled
- No unused variables/parameters
- Exact optional property types
- No implicit returns
- No unchecked indexed access

### Webpack Configuration

Optimized for large file handling:

- Increased asset size limits (5MB)
- Web Worker support
- Client-side fallbacks for Node.js modules
- Performance optimizations

## 🧪 Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:coverage
```

## 📱 PWA Installation

### Desktop (Chrome, Edge, Safari)
1. Visit the app in your browser
2. Look for the install prompt or click the install icon in the address bar
3. Click "Install" to add to your desktop/dock

### Mobile (iOS)
1. Open in Safari
2. Tap the share button
3. Select "Add to Home Screen"
4. Tap "Add" to install

### Mobile (Android)
1. Open in Chrome
2. Tap the menu (three dots)
3. Select "Install app" or "Add to Home Screen"
4. Follow the installation prompts

## 🔄 PWA Features in Action

### Offline Support
- Complete functionality for client-side processing when offline
- Automatic caching of app shell and resources
- Failed uploads queued for background sync when connection returns
- Offline page with feature overview

### Background Sync
- Failed Google Drive uploads are automatically retried
- Exponential backoff strategy for retry attempts
- Notifications when uploads complete in background
- IndexedDB storage for pending operations

### Push Notifications
- Upload completion notifications
- Upload failure alerts with retry options
- Background sync status updates
- Actionable notification buttons

## 📦 Deployment

### Vercel (Recommended)

1. Fork/clone the repository to GitHub
2. Import project in Vercel dashboard
3. Configure environment variables for Google Drive integration
4. Deploy automatically with PWA optimizations

### Environment Variables for Production

```bash
# Required for Google Drive
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_production_google_client_id

# Analytics (recommended)
NEXT_PUBLIC_GA_TRACKING_ID=your_ga4_measurement_id
GA_API_SECRET=your_measurement_protocol_secret

# Performance monitoring
NEXT_PUBLIC_VITALS_URL=https://yourdomain.com/api/vitals

# Site verification
GOOGLE_SITE_VERIFICATION=your_verification_code
```

### Manual Deployment

```bash
# Install dependencies
npm install

# Generate PWA icons
npm run icons:generate

# Build with production optimizations
npm run build:prod

# Start production server
npm start

# Test PWA functionality
npm run lighthouse
```

### Docker Deployment

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## 🔒 Security

- Content Security Policy (CSP) configured
- Client-side processing (files don't leave the browser)
- No server-side file storage
- Secure headers configured

## 🎨 Customization

### Theme

Customize the theme in `tailwind.config.js`:

- Colors
- Typography
- Spacing
- Animations

### Components

All UI components are customizable through the shadcn/ui system.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 🐛 Bug Reports

Please report bugs through the [GitHub Issues](https://github.com/your-username/smart-zip-splitter/issues) page.

## 📖 Usage Guide

### Getting Started

1. **Choose Your Strategy**:
   - **CLIENT_ONLY**: Process files entirely in your browser (recommended for privacy)
   - **CLIENT_DRIVE**: Process files locally, then upload to Google Drive for sharing

2. **Upload Your ZIP File**:
   - Drag and drop your ZIP file into the upload area
   - Or click to browse and select your file
   - Supports files up to 100MB for client-side processing

3. **Configure Split Settings**:
   - Set maximum fragment size (e.g., 10MB, 50MB, or custom)
   - Choose compression level (0-9, where 9 is maximum compression)
   - Enable/disable creation of a recombination manifest

### Google Drive Integration

1. **Authentication**:
   - Click "Sign in with Google" when choosing CLIENT_DRIVE strategy
   - Grant permissions for Drive and Sheets access
   - Your credentials are stored securely in your browser

2. **Automatic Organization**:
   - Files are uploaded to timestamped folders
   - Google Sheets spreadsheet created with download links
   - All files made publicly shareable for easy access

3. **Sharing Results**:
   - QR codes generated for mobile access
   - Direct download links for each fragment
   - Social sharing options available

### Offline Usage

1. **Install the PWA** for full offline functionality
2. **Process files offline** using CLIENT_ONLY strategy
3. **Queue uploads** - they'll sync when connection returns
4. **Access previous results** from cache

## 📊 Performance Metrics

### Lighthouse Scores (Target)
- **Performance**: 95+ (Optimized loading and runtime performance)
- **Accessibility**: 100 (Full WCAG 2.1 AA compliance)
- **Best Practices**: 100 (Security, modern web standards)
- **SEO**: 100 (Search engine optimization)
- **PWA**: 100 (Complete PWA implementation)

### Core Web Vitals
- **First Contentful Paint (FCP)**: < 1.5s
- **Largest Contentful Paint (LCP)**: < 2.5s
- **First Input Delay (FID)**: < 100ms
- **Cumulative Layout Shift (CLS)**: < 0.1
- **Time to First Byte (TTFB)**: < 600ms

### Performance Optimizations
- **Code Splitting**: Dynamic imports reduce initial bundle size
- **Lazy Loading**: Components and routes loaded on demand
- **Image Optimization**: Next.js Image component with WebP support
- **Caching Strategy**: Service Worker with advanced caching rules
- **Compression**: Gzip/Brotli compression enabled
- **Bundle Analysis**: Webpack Bundle Analyzer for optimization
- **Web Workers**: Background processing prevents UI blocking
- **Preloading**: Critical resources preloaded for faster rendering

## 🌐 Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

---

Made with ❤️ using Next.js and TypeScript
