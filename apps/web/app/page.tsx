import React from 'react';
import { HeroBanner } from '@/components/layout/HeroBanner';
import { HomeSportsSection } from '@/components/sports/HomeSportsSection';
import { GamesSection } from '@/components/sports/GamesSection';

export default function HomePage() {
  return (
    <div>
      <HeroBanner />
      <GamesSection />
      <HomeSportsSection />
    </div>
  );
}
