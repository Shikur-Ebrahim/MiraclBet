import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: { default: 'MiraclBet', template: '%s | MiraclBet' },
  description: 'The best sports betting experience. Live odds, fast payouts, trusted platform.',
  keywords: ['sports betting', 'football betting', 'live odds', 'MiraclBet'],
  openGraph: {
    title: 'MiraclBet',
    description: 'The best sports betting experience.',
    siteName: 'MiraclBet',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen flex flex-col bg-dark text-white">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
