# Smart ZIP Splitter

A modern, intelligent ZIP file splitting and processing tool built with Next.js 15, TypeScript, and Tailwind CSS.

## ✨ Features

- **Smart File Splitting**: Intelligent algorithms to optimize file splitting based on size constraints
- **Client-Side Processing**: All processing happens in your browser - your files never leave your device
- **Modern UI**: Beautiful, responsive interface with dark mode support
- **Real-Time Progress**: Live progress tracking with detailed status updates
- **Drag & Drop**: Intuitive file upload with drag-and-drop support
- **Batch Downloads**: Download individual files or bulk download all processed files
- **Web Workers**: Background processing that doesn't block the UI
- **TypeScript**: Fully typed for better development experience and fewer bugs

## 🚀 Tech Stack

- **Next.js 15**: React framework with App Router
- **TypeScript**: Strict mode enabled for type safety
- **Tailwind CSS**: Utility-first CSS framework with custom theme
- **shadcn/ui**: Modern, accessible component library
- **Framer Motion**: Smooth animations and transitions
- **JSZip**: Client-side ZIP file processing
- **React Dropzone**: File upload with drag-and-drop
- **Lucide React**: Beautiful, customizable icons

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
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run lint:fix     # Fix ESLint issues
npm run format       # Format code with Prettier
npm run test         # Run Jest tests
npm run test:watch   # Run Jest in watch mode
npm run test:e2e     # Run Playwright E2E tests
```

## 📁 Project Structure

```
smart-zip-splitter/
├── app/                 # Next.js App Router
│   ├── globals.css     # Global styles
│   ├── layout.tsx      # Root layout
│   └── page.tsx        # Home page
├── components/         # React components
│   └── ui/            # shadcn/ui components
├── lib/               # Utility functions and business logic
├── hooks/             # Custom React hooks
├── types/             # TypeScript type definitions
├── workers/           # Web Workers for background processing
├── public/            # Static assets
│   └── icons/         # App icons and favicons
├── tests/             # Test files
│   ├── unit/          # Unit tests
│   ├── integration/   # Integration tests
│   └── e2e/           # End-to-end tests
└── docs/              # Documentation
```

## ⚙️ Configuration

### Environment Variables

Copy `.env.example` to `.env.local` and configure:

```bash
# Google OAuth (optional)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Next Auth
NEXTAUTH_SECRET=your_nextauth_secret
NEXTAUTH_URL=http://localhost:3000

# Analytics (optional)
NEXT_PUBLIC_GA_ID=your_google_analytics_id
```

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

## 📦 Deployment

### Vercel (Recommended)

1. Push code to GitHub
2. Import project in Vercel
3. Deploy automatically

### Manual Deployment

```bash
# Build the application
npm run build

# Start production server
npm start
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

## 📊 Performance

- Lighthouse Score: 95+
- Core Web Vitals optimized
- Client-side processing for privacy and speed
- Web Workers for non-blocking operations

## 🌐 Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

---

Made with ❤️ using Next.js and TypeScript
