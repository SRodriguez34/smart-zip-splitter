import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import './globals.css';

const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: {
    template: '%s | Smart ZIP Splitter',
    default: 'Smart ZIP Splitter - Split Large ZIP Files Instantly',
  },
  description: 'Split large ZIP files instantly with client-side processing. Lightning fast, zero upload required, with smart Google Drive integration for seamless sharing.',
  keywords: [
    'zip splitter',
    'file splitter', 
    'compress files',
    'split archive',
    'zip tools',
    'client-side processing',
    'file management'
  ],
  authors: [{ name: 'Smart ZIP Splitter Team' }],
  creator: 'Smart ZIP Splitter',
  publisher: 'Smart ZIP Splitter',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  manifest: '/manifest.json',
  icons: {
    icon: '/icon.svg',
    apple: '/icon.svg',
  },
  metadataBase: new URL('https://smart-zip-splitter.vercel.app'),
  openGraph: {
    title: 'Smart ZIP Splitter - Split Large ZIP Files Instantly',
    description: 'Split large ZIP files instantly with client-side processing. Lightning fast, zero upload required.',
    url: 'https://smart-zip-splitter.vercel.app',
    siteName: 'Smart ZIP Splitter',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Smart ZIP Splitter - Split Large ZIP Files Instantly',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Smart ZIP Splitter - Split Large ZIP Files Instantly',
    description: 'Split large ZIP files instantly with client-side processing. Lightning fast, zero upload required.',
    images: ['/og-image.jpg'],
    creator: '@smartzipsplitter',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'verification_token_here',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang='en' suppressHydrationWarning className={inter.variable}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className={`${inter.className} font-sans antialiased`} suppressHydrationWarning>
        <div className="flex min-h-screen flex-col">
          <Header />
          <main className="flex-1">
            {children}
          </main>
          <Footer />
        </div>
      </body>
    </html>
  );
}
