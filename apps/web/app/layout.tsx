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
