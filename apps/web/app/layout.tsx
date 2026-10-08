import './globals.css';
import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { Toaster } from 'react-hot-toast';
import { Suspense } from 'react';


const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  metadataBase: new URL('https://queizy.com'),
  title: 'Queizy',
  description: 'Inglês de verdade, com conversa, correção na hora e zero vergonha de errar. Pratique com a Charlotte, sua tutora de IA.',
  // 🌐 Open Graph para compartilhamento social
  openGraph: {
    title: 'Queizy — Do queizy ao crazy.',
    description: 'Inglês de verdade, com conversa, correção na hora e zero vergonha de errar.',
    url: 'https://queizy.com',
    siteName: 'Queizy',
    images: [
      {
        url: '/images/queizy-og.png',
        width: 1200,
        height: 630,
        alt: 'Queizy — Do queizy ao crazy.',
      },
    ],
    locale: 'pt_BR',
    type: 'website',
  },
  
  // 🐦 Twitter Card
  twitter: {
    card: 'summary_large_image',
    title: 'Queizy — Do queizy ao crazy.',
    description: 'Inglês de verdade, com conversa, correção na hora e zero vergonha de errar.',
    images: ['/images/queizy-og.png'],
    creator: '@hubacademybr',
  },
  
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
  },
  
  // 🔍 SEO adicional
  keywords: ['inglês', 'aprender inglês', 'conversação', 'pronúncia', 'IA', 'Queizy', 'Charlotte', 'Hub Academy'],
  authors: [{ name: 'Hub Academy' }],
  creator: 'Hub Academy',
  publisher: 'Hub Academy',
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
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  userScalable: false,
  themeColor: '#FAF7F0',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta 
          name="viewport" 
          content="width=device-width, initial-scale=1.0, viewport-fit=cover, user-scalable=no, interactive-widget=resizes-content"
        />
        
        {/* 🎯 Favicon e Icons */}
        <link rel="icon" href="/favicon.ico" sizes="32x32" />

        {/* SEO adicional */}
        <meta name="description" content="AI-powered English learning assistant with live voice conversations and personalized lessons" />
        <meta name="keywords" content="English learning, AI assistant, voice conversation, pronunciation, Hub Academy, Charlotte" />
        <meta name="author" content="Hub Academy" />
        <link rel="canonical" href="https://charlotte.hubacademybr.com" />
      </head>
      <body className={`${inter.className} antialiased`} suppressHydrationWarning>
        <Suspense fallback={
          <div className="min-h-screen bg-secondary flex items-center justify-center">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary border-t-transparent"></div>
          </div>
        }>
          {children}
        </Suspense>
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              background: '#212121',
              color: '#FFFFFF',
              border: '1px solid rgba(163, 255, 60, 0.2)',
            },
            success: {
              iconTheme: {
                primary: '#A3FF3C',
                secondary: '#000000',
              },
            },
            error: {
              iconTheme: {
                primary: '#FF3B30',
                secondary: '#FFFFFF',
              },
            },
          }}
        />
      </body>
    </html>
  );
}