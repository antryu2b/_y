import type { Metadata, Viewport } from 'next';
import { Inter, Geist } from 'next/font/google';
import Script from 'next/script';
import './globals.css';
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

const GA_ID = process.env.NEXT_PUBLIC_GA_ID || '';

const inter = Inter({ subsets: ['latin'] });

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#030712',
};

export const metadata: Metadata = {
  title: '_y — Your AI-Powered Company',
  description: 'Explore _y Tower: 30 AI agents across 10 floors. Chat with each agent, watch them work, and discover the _y Holdings universe.',
  keywords: ['AI', 'AI workforce', 'interactive', '_y Holdings', 'agents'],
  openGraph: {
    title: '_y — Your AI-Powered Company',
    description: '30 AI agents. 10 floors. 1 founder. Build your AI-powered company for $0/month.',
    type: 'website',
    siteName: '_y Holdings',
    locale: 'en_US',
    images: [{ url: '/og-image.jpg', width: 1200, height: 630, alt: '_y Tower — 30 AI Agents' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: '_y — Your AI-Powered Company',
    description: '30 AI agents. 10 floors. 1 founder. Build your AI-powered company for $0/month.',
    images: ['/og-image.jpg'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn("font-sans", geist.variable)}>
      {GA_ID && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
          <Script id="ga4" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA_ID}');`}
          </Script>
        </>
      )}
      <body className={`${inter.className} antialiased`}>{children}</body>
    </html>
  );
}
