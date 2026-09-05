'use client';

import React, { useState } from 'react';
import { Container } from '@/components/ui/Container';
import { FixtureTabs } from '@/components/sports/FixtureTabs';
import { SportsNav } from '@/components/sports/TopLeagues';
import { Sidebar } from '@/components/layout/Sidebar';
import Link from 'next/link';

const SPORT_EMOJI: Record<string, string> = {
  football: '⚽', hockey: '🏒', tennis: '🎾', basketball: '🏀',
  baseball: '⚾', volleyball: '🏐', rugby: '🏉', mma: '🥊',
  nba: '🏀', nfl: '🏈', 'formula-1': '🏎️', handball: '🤾',
};

export function HomeSportsSection() {
  const [activeSport, setActiveSport] = useState('football');
  const [timeRange, setTimeRange] = useState(6);
  const [activeTab, setActiveTab] = useState<'prematch' | 'live'>('prematch');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedLeagueId, setSelectedLeagueId] = useState<string | null>(null);
  const [selectedLeagueName, setSelectedLeagueName] = useState<string | null>(null);

  const handleSelectLeague = (leagueId: string, leagueName: string) => {
    setSelectedLeagueId(leagueId);
    setSelectedLeagueName(leagueName);
    setActiveSport('football'); // leagues are football for now
  };

  const clearLeagueFilter = () => {
    setSelectedLeagueId(null);
    setSelectedLeagueName(null);
  };

  return (
    <div>
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onSelectSport={(sport) => {
          setActiveSport(sport);
          clearLeagueFilter();
        }}
        onSelectLeague={handleSelectLeague}
      />

      {/* Sports Navigation & Slider */}
      <SportsNav
        activeSport={activeSport}
        onSportChange={(sport) => { setActiveSport(sport); clearLeagueFilter(); }}
        timeRange={timeRange}
        onTimeRangeChange={setTimeRange}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onOpenSidebar={() => setIsSidebarOpen(true)}
      />

      {/* Active league filter badge */}
      {selectedLeagueName && (
        <div className="flex items-center gap-2 px-4 py-2" style={{ background: '#0D1913' }}>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold" style={{ background: '#19E66B22', border: '1px solid #19E66B55', color: '#19E66B' }}>
            ⚽ {selectedLeagueName}
            <button onClick={clearLeagueFilter} className="ml-1 hover:opacity-70">
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>
          <span className="text-xs text-white/40">Tap × to show all</span>
        </div>
      )}

      {/* Matches section */}
      <section className="py-4">
        <Container>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold flex items-center gap-2 capitalize">
              <span>{SPORT_EMOJI[activeSport] ?? '🏆'}</span>
              {selectedLeagueName ?? activeSport.replace('-', ' ')}
            </h2>
            <Link href={`/sports/${activeSport}`} className="text-sm font-semibold" style={{ color: '#19E66B' }}>
              View All →
            </Link>
          </div>
          <FixtureTabs sport={activeSport} timeRange={timeRange} leagueId={selectedLeagueId ?? undefined} activeTab={activeTab} />
        </Container>
      </section>
    </div>
  );
}
