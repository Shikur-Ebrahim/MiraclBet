'use client';

import React, { useState } from 'react';
import { Container } from '@/components/ui/Container';
import { FixtureTabs } from '@/components/sports/FixtureTabs';
import { SportsNav } from '@/components/sports/TopLeagues';
import { Sidebar } from '@/components/layout/Sidebar';
import { FilterPanel, FilterState } from '@/components/sports/FilterPanel';

const SPORT_EMOJI: Record<string, string> = {
  football: '⚽', hockey: '🏒', tennis: '🎾', basketball: '🏀',
  baseball: '⚾', volleyball: '🏐', rugby: '🏉', mma: '🥊',
  nba: '🏀', nfl: '🏈', 'formula-1': '🏎️', handball: '🤾',
};

const EMPTY_FILTER: FilterState = { date: null, country: null, leagueId: null, leagueName: null };

export function HomeSportsSection() {
  const [activeSport, setActiveSport] = useState('football');
  const [timeRange, setTimeRange] = useState(6);
  const [activeTab, setActiveTab] = useState<'prematch' | 'live'>('prematch');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [selectedLeagueId, setSelectedLeagueId] = useState<string | null>(null);
  const [selectedLeagueName, setSelectedLeagueName] = useState<string | null>(null);
  const [advancedFilter, setAdvancedFilter] = useState<FilterState>(EMPTY_FILTER);

  const handleSelectLeague = (leagueId: string, leagueName: string) => {
    setSelectedLeagueId(leagueId);
    setSelectedLeagueName(leagueName);
    setActiveSport('football');
    // Clear advanced filter league to avoid conflict
    setAdvancedFilter(f => ({ ...f, leagueId: null, leagueName: null }));
  };

  const clearLeagueFilter = () => {
    setSelectedLeagueId(null);
    setSelectedLeagueName(null);
  };

  const handleApplyFilter = (f: FilterState) => {
    setAdvancedFilter(f);
    // If a league was chosen via filter panel, also clear the sidebar league
    if (f.leagueId) {
      setSelectedLeagueId(null);
      setSelectedLeagueName(null);
    }
  };

  // Active filter count for badge
  const activeFilterCount = [advancedFilter.date, advancedFilter.country, advancedFilter.leagueId].filter(Boolean).length;

  // Effective league: filter panel takes priority, sidebar second
  const effectiveLeagueId = advancedFilter.leagueId ?? selectedLeagueId ?? undefined;
  const effectiveLeagueName = advancedFilter.leagueName ?? selectedLeagueName;

  return (
    <div>
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onSelectSport={(sport) => { setActiveSport(sport); clearLeagueFilter(); setAdvancedFilter(EMPTY_FILTER); }}
        onSelectLeague={handleSelectLeague}
      />

      <FilterPanel
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        filter={advancedFilter}
        onApply={handleApplyFilter}
      />

      {/* Sports Navigation & Slider */}
      <SportsNav
        activeSport={activeSport}
        onSportChange={(sport) => { setActiveSport(sport); clearLeagueFilter(); setAdvancedFilter(EMPTY_FILTER); }}
        timeRange={timeRange}
        onTimeRangeChange={setTimeRange}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onOpenSidebar={() => setIsSidebarOpen(true)}
      />

      {/* Active filter badges */}
      {(effectiveLeagueName || advancedFilter.date || advancedFilter.country) && (
        <div className="flex flex-wrap items-center gap-2 px-4 py-2" style={{ background: '#0D1913' }}>
          {advancedFilter.date && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold" style={{ background: '#19E66B22', border: '1px solid #19E66B55', color: '#19E66B' }}>
              📅 {new Date(advancedFilter.date + 'T00:00:00').toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
              <button onClick={() => setAdvancedFilter(f => ({ ...f, date: null }))}>
                <svg viewBox="0 0 24 24" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>
          )}
          {advancedFilter.country && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold" style={{ background: '#19E66B22', border: '1px solid #19E66B55', color: '#19E66B' }}>
              🌍 {advancedFilter.country}
              <button onClick={() => setAdvancedFilter(f => ({ ...f, country: null, leagueId: null, leagueName: null }))}>
                <svg viewBox="0 0 24 24" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>
          )}
          {effectiveLeagueName && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold" style={{ background: '#19E66B22', border: '1px solid #19E66B55', color: '#19E66B' }}>
              ⚽ {effectiveLeagueName}
              <button onClick={() => { clearLeagueFilter(); setAdvancedFilter(f => ({ ...f, leagueId: null, leagueName: null })); }}>
                <svg viewBox="0 0 24 24" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Matches section */}
      <section className="py-4">
        <Container>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold flex items-center gap-2 capitalize">
              <span>{SPORT_EMOJI[activeSport] ?? '🏆'}</span>
              {effectiveLeagueName ?? advancedFilter.country ?? activeSport.replace('-', ' ')}
            </h2>

            {/* Filter button (replaces View All) */}
            <button
              onClick={() => setIsFilterOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors relative"
              style={activeFilterCount > 0
                ? { background: '#19E66B', color: '#072414' }
                : { background: '#0D2018', color: '#19E66B', border: '1px solid #19E66B44' }
              }
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="11" y1="18" x2="13" y2="18"/>
              </svg>
              Filter
              {activeFilterCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full text-[10px] font-black flex items-center justify-center" style={{ background: '#072414', color: '#19E66B', border: '1px solid #19E66B' }}>
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>

          <FixtureTabs
            sport={activeSport}
            timeRange={timeRange}
            leagueId={effectiveLeagueId}
            activeTab={activeTab}
            filterDate={advancedFilter.date ?? undefined}
            filterCountry={advancedFilter.country ?? undefined}
          />
        </Container>
      </section>
    </div>
  );
}
