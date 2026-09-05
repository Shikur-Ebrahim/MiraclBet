'use client';

import React, { useState } from 'react';
import { Container } from '@/components/ui/Container';
import { FixtureTabs } from '@/components/sports/FixtureTabs';
import { SportsNav } from '@/components/sports/TopLeagues';
import Link from 'next/link';

export function HomeSportsSection() {
  const [activeSport, setActiveSport] = useState('football');
  const [timeRange, setTimeRange] = useState(6); // 0 = Today, 6 = All Events (7 days)

  return (
    <div>
      {/* ── Sports Navigation & Slider ── */}
      <SportsNav 
        activeSport={activeSport} 
        onSportChange={setActiveSport} 
        timeRange={timeRange}
        onTimeRangeChange={setTimeRange}
      />

      {/* ── Matches by Date ── */}
      <section className="py-4">
        <Container>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold flex items-center gap-2 capitalize">
              {activeSport === 'football' ? '⚽' : 
               activeSport === 'hockey' ? '🏒' : 
               activeSport === 'tennis' ? '🎾' : 
               activeSport === 'basketball' || activeSport === 'nba' ? '🏀' : 
               activeSport === 'baseball' ? '⚾' : 
               activeSport === 'volleyball' ? '🏐' : 
               activeSport === 'rugby' || activeSport === 'nfl' ? '🏈' : 
               activeSport === 'mma' ? '🥊' : '🏆'}
              {activeSport.replace('-', ' ')}
            </h2>
            <Link href={`/sports/${activeSport}`} className="text-primary text-sm font-semibold">View All →</Link>
          </div>
          
          <FixtureTabs sport={activeSport} timeRange={timeRange} />
        </Container>
      </section>
    </div>
  );
}
