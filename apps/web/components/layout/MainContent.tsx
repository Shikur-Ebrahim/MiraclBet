'use client';

import { usePathname } from 'next/navigation';
import React from 'react';

// Routes that have their own full-screen layout (no global sidebars)
const FULL_SCREEN_ROUTES = ['/admin', '/agent', '/worker', '/login', '/register'];

export function MainContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isFullScreen = FULL_SCREEN_ROUTES.some(p => pathname.startsWith(p));

  return (
    <main className={`flex-1 flex flex-col ${isFullScreen ? '' : 'md:pl-64 md:pr-[350px]'}`}>
      {children}
    </main>
  );
}
