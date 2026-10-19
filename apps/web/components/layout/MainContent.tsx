'use client';

import { usePathname } from 'next/navigation';
import React from 'react';
import { Footer } from './Footer';

// Routes that have their own full-screen layout (no global sidebars)
const FULL_SCREEN_ROUTES = ['/admin', '/agent', '/worker', '/login', '/register', '/support'];

export function MainContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isFullScreen = FULL_SCREEN_ROUTES.some(p => pathname?.startsWith(p));
  const hideFooter = pathname === '/support' || pathname?.startsWith('/admin') || pathname?.startsWith('/agent') || pathname?.startsWith('/worker');

  return (
    <main className={`flex-1 flex flex-col ${isFullScreen ? '' : 'md:pl-64 md:pr-[350px]'}`}>
      <div className="flex-1 flex flex-col">
        {children}
      </div>
      {!hideFooter && <Footer />}
    </main>
  );
}
