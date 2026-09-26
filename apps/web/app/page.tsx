'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { HeroBanner } from '@/components/layout/HeroBanner';
import { HomeSportsSection } from '@/components/sports/HomeSportsSection';

export default function HomePage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const userStr = localStorage.getItem('miraclbet_user');
    if (!userStr) {
      router.push('/login');
    }
  }, [router]);

  // Don't render until client check is done, but if no user, it redirects anyway
  if (!mounted) return null;
  if (!localStorage.getItem('miraclbet_user')) return null;

  return (
    <div>
      <HeroBanner />
      <HomeSportsSection />
    </div>
  );
}
