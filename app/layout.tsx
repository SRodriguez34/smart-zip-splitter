import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { PWAProvider } from '@/components/pwa-provider';
import './globals.css';

const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
  preload: true,
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#3b82f6' },
    { media: '(prefers-color-scheme: dark)', color: '#1e40af' }
  ],
  colorScheme: 'light dark',
}

export const metadata: Metadata = {
  title: {
    template: '%s | Smart ZIP Splitter',
    default: 'Smart ZIP Splitter PWA - Split Large ZIP Files Instantly',
  },
  description: 'Lightning fast ZIP file splitter PWA with Google Drive integration. Process files locally or upload to cloud storage with shareable links. Works offline!',
  keywords: [
    'zip splitter',
    'file splitter', 
    'compress files',
    'split archive',
    'zip tools',
    'client-side processing',
    'file management',
    'PWA',
    'progressive web app',
    'offline',
    'Google Drive',
    'cloud storage',
    'file sharing'
  ],
  authors: [{ name: 'Smart ZIP Splitter Team' }],
  creator: 'Smart ZIP Splitter',
  publisher: 'Smart ZIP Splitter',
  applicationName: 'Smart ZIP Splitter',
  generator: 'Next.js',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/icons/icon-16.png', sizes: '16x16', type: 'image/png' },
      { url: '/icons/icon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icons/icon-48.png', sizes: '48x48', type: 'image/png' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    shortcut: '/icons/icon-48.png',
    apple: [
      { url: '/icons/icon-apple-touch-57.png', sizes: '57x57', type: 'image/png' },
      { url: '/icons/icon-apple-touch-60.png', sizes: '60x60', type: 'image/png' },
      { url: '/icons/icon-apple-touch-72.png', sizes: '72x72', type: 'image/png' },
      { url: '/icons/icon-apple-touch-76.png', sizes: '76x76', type: 'image/png' },
      { url: '/icons/icon-apple-touch-114.png', sizes: '114x114', type: 'image/png' },
      { url: '/icons/icon-apple-touch-120.png', sizes: '120x120', type: 'image/png' },
      { url: '/icons/icon-apple-touch-144.png', sizes: '144x144', type: 'image/png' },
      { url: '/icons/icon-apple-touch-152.png', sizes: '152x152', type: 'image/png' },
      { url: '/icons/icon-apple-touch-180.png', sizes: '180x180', type: 'image/png' },
    ],
    other: [
      {
        rel: 'mask-icon',
        url: '/icons/icon-maskable-512.png',
        color: '#3b82f6',
      },
    ],
  },
  metadataBase: new URL(process.env.NEXTAUTH_URL || 'https://smart-zip-splitter.vercel.app'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'Smart ZIP Splitter PWA - Split Large ZIP Files Instantly',
    description: 'Lightning fast ZIP file splitter PWA with Google Drive integration. Process files locally or upload to cloud storage. Works offline!',
    url: '/',
    siteName: 'Smart ZIP Splitter',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Smart ZIP Splitter PWA - Lightning Fast File Processing',
        type: 'image/png',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Smart ZIP Splitter PWA - Split Large ZIP Files Instantly',
    description: 'Lightning fast ZIP file splitter PWA with Google Drive integration. Works offline!',
    images: ['/og-image.png'],
    creator: '@smartzipsplitter',
  },
  robots: {
    index: true,
    follow: true,
    noarchive: false,
    nosnippet: false,
    noimageindex: false,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION,
    yandex: process.env.YANDEX_VERIFICATION,
    other: {
      'msapplication-TileColor': '#3b82f6',
      'msapplication-TileImage': '/icons/icon-tile-144.png',
      'msapplication-config': '/browserconfig.xml',
    },
  },
  category: 'productivity',
  classification: 'Productivity Tool',
  referrer: 'origin-when-cross-origin',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang='en' suppressHydrationWarning className={inter.variable}>
      <head>
        {/* DNS prefetch for performance */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://apis.google.com" />
        <link rel="dns-prefetch" href="https://accounts.google.com" />
        <link rel="dns-prefetch" href="https://www.googleapis.com" />
        
        {/* Preload critical resources */}
        <link rel="preload" href="/icons/icon-192.png" as="image" type="image/png" />
        
        {/* Apple-specific meta tags */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Smart ZIP Splitter" />
        
        {/* Windows/IE meta tags */}
        <meta name="msapplication-TileColor" content="#3b82f6" />
        <meta name="msapplication-TileImage" content="/icons/icon-tile-144.png" />
        <meta name="msapplication-tooltip" content="Smart ZIP Splitter - Split ZIP files instantly" />
        <meta name="msapplication-starturl" content="/" />
        <meta name="msapplication-navbutton-color" content="#3b82f6" />
        
        {/* Performance hints */}
        <link rel="preload" href={inter.style?.fontDisplay} as="font" type="font/woff2" crossOrigin="" />
      </head>
      <body className={`${inter.className} font-sans antialiased`} suppressHydrationWarning>
        <PWAProvider>
          <div className="flex min-h-screen flex-col">
            <Header />
            <main className="flex-1">
              {children}
            </main>
            <Footer />
          </div>
        </PWAProvider>
        
        {/* Service Worker registration script */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                navigator.serviceWorker.register('/sw.js', { scope: '/' })
                  .then(function(registration) {
                    console.log('[SW] Registration successful:', registration.scope);
                  })
                  .catch(function(error) {
                    console.log('[SW] Registration failed:', error);
                  });
              }
            `,
          }}
        />

        {/* Web Vitals tracking script */}
        {process.env.NODE_ENV === 'production' && (
          <script
            dangerouslySetInnerHTML={{
              __html: `
                (function() {
                  var vitalsUrl = '${process.env.NEXT_PUBLIC_VITALS_URL || '/api/vitals'}';
                  var sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
                  
                  function sendToAnalytics(metric) {
                    fetch(vitalsUrl, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        url: window.location.href,
                        userAgent: navigator.userAgent,
                        timestamp: Date.now(),
                        vitals: [metric],
                        connectionType: navigator.connection ? navigator.connection.effectiveType : 'unknown',
                        deviceMemory: navigator.deviceMemory,
                        hardwareConcurrency: navigator.hardwareConcurrency,
                        sessionId: sessionId,
                      })
                    }).catch(console.error);
                  }

                  // Web Vitals
                  if (typeof window !== 'undefined') {
                    import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
                      getCLS(sendToAnalytics);
                      getFID(sendToAnalytics);
                      getFCP(sendToAnalytics);
                      getLCP(sendToAnalytics);
                      getTTFB(sendToAnalytics);
                    });
                  }
                })();
              `,
            }}
          />
        )}
      </body>
    </html>
  );
}
