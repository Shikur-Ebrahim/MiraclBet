import React from 'react';
import { HeroBanner } from '@/components/layout/HeroBanner';
import { HomeSportsSection } from '@/components/sports/HomeSportsSection';

export default function HomePage() {
  return (
    <div>
      <HeroBanner />
      <HomeSportsSection />
    </div>
  );
}
