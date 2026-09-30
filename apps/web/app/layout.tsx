import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { BottomNav } from '@/components/layout/BottomNav';
import { RightSidebar } from '@/components/layout/RightSidebar';
import { DesktopSidebar } from '@/components/layout/DesktopSidebar';
import { AiAssistant } from '@/components/layout/AiAssistant';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  metadataBase: new URL('https://miraclbet.com'),
  title: { 
    default: 'MiraclBet Ethiopia – Betting company ᐉ Online sports betting', 
    template: '%s | MiraclBet Ethiopia' 
  },
  description: 'MiraclBet Ethiopia ⚽ Fixed-odds sports betting Free bets online ✓ High Odds ✓ 24-Hour Customer Service Login MIRACLBET Best betting site - miraclbet.com.',
  keywords: ['sports betting', 'football betting', 'live odds', 'MiraclBet', 'MiraclBet Ethiopia', 'betting company', 'online sports betting', 'betting site'],
  openGraph: {
    title: 'MiraclBet Ethiopia – Betting company ᐉ Online sports betting',
    description: 'MiraclBet Ethiopia ⚽ Fixed-odds sports betting Free bets online ✓ High Odds ✓ 24-Hour Customer Service',
    url: 'https://miraclbet.com',
    siteName: 'MiraclBet',
    type: 'website',
    locale: 'en_ET',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MiraclBet Ethiopia – Betting company',
    description: 'Fixed-odds sports betting Free bets online ✓ High Odds',
  },
  alternates: {
    canonical: '/',
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "name": "MiraclBet Ethiopia",
      "alternateName": ["MiraclBet", "MiraclBet ET"],
      "url": "https://miraclbet.com/",
      "potentialAction": {
        "@type": "SearchAction",
        "target": {
          "@type": "EntryPoint",
          "urlTemplate": "https://miraclbet.com/sports?q={search_term_string}"
        },
        "query-input": "required name=search_term_string"
      }
    },
    {
      "@type": "Organization",
      "name": "MiraclBet",
      "url": "https://miraclbet.com/",
      "logo": "https://miraclbet.com/logo.png"
    }
  ]
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="min-h-screen flex flex-col bg-dark text-white">
        <Header />
        <main className="flex-1 md:pl-64 md:pr-[280px]">{children}</main>
        <Footer />
        <RightSidebar />
        <DesktopSidebar />
        <BottomNav />
        <AiAssistant />
      </body>
    </html>
  );
}
