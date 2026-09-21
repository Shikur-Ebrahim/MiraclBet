'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { FixtureTabs } from '@/components/sports/FixtureTabs';
import { SportsNav } from '@/components/sports/TopLeagues';
import { Sidebar } from '@/components/layout/Sidebar';

function buildDays() {
  const today = new Date();
  const list = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const value = d.toISOString().split('T')[0];
    const short = i === 0 ? 'Today' : i === 1 ? 'Tomorrow'
      : d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
    return { value, short };
  });
  return [{ value: '', short: 'All' }, ...list];
}

interface CountryItem { country: string; flag?: string; }
interface LeagueItem  { id: string; name: string; logo?: string; country: string; }

// ─── Global State Cache to instantly restore exact user filters on Back ───
const globalHomeState = {
  isValid: false,
  activeSport: 'football',
  activeTab: 'prematch' as 'prematch' | 'live',
  timeRange: 6,
  searchQuery: '',
  selectedDayValue: '',
  selectedCountry: null as CountryItem | null,
  selectedLeague: null as LeagueItem | null,
  timestamp: 0,
};

export function HomeSportsSection() {
  const isFresh = globalHomeState.isValid && (Date.now() - globalHomeState.timestamp < 5 * 60 * 1000);
  const days = buildDays();

  const [activeSport, setActiveSport] = useState(isFresh ? globalHomeState.activeSport : 'football');
  const [activeTab, setActiveTab]   = useState<'prematch' | 'live'>(isFresh ? globalHomeState.activeTab : 'prematch');
  const [timeRange, setTimeRange]   = useState(isFresh ? globalHomeState.timeRange : 6);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const [searchQuery, setSearchQuery] = useState(isFresh ? globalHomeState.searchQuery : '');
  
  const [selectedDay, setSelectedDay] = useState(() => {
    if (isFresh && globalHomeState.selectedDayValue) {
      return days.find(d => d.value === globalHomeState.selectedDayValue) || days[0];
    }
    return days[0];
  });
  
  const [openDropdown, setOpenDropdown] = useState<'days' | 'countries' | 'leagues' | null>(null);

  const [allCountries, setAllCountries] = useState<CountryItem[]>([]);
  const [allLeagues,   setAllLeagues]   = useState<LeagueItem[]>([]);

  const [selectedCountry, setSelectedCountry] = useState<CountryItem | null>(isFresh ? globalHomeState.selectedCountry : null);
  const [selectedLeague,  setSelectedLeague]  = useState<LeagueItem  | null>(isFresh ? globalHomeState.selectedLeague : null);

  // Sync to global state
  useEffect(() => {
    globalHomeState.isValid = true;
    globalHomeState.activeSport = activeSport;
    globalHomeState.activeTab = activeTab;
    globalHomeState.timeRange = timeRange;
    globalHomeState.searchQuery = searchQuery;
    globalHomeState.selectedDayValue = selectedDay.value;
    globalHomeState.selectedCountry = selectedCountry;
    globalHomeState.selectedLeague = selectedLeague;
    globalHomeState.timestamp = Date.now();
  }, [activeSport, activeTab, timeRange, searchQuery, selectedDay, selectedCountry, selectedLeague]);

  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node))
        setOpenDropdown(null);
    };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  const handleFixturesLoaded = useCallback((list: CountryItem[]) => setAllCountries(list), []);
  const handleLeaguesLoaded  = useCallback((list: LeagueItem[])  => setAllLeagues(list),   []);

  return (
    <div>
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onSelectSport={s => { setActiveSport(s); setSelectedCountry(null); setSelectedLeague(null); }}
        onSelectLeague={() => { setActiveSport('football'); setSelectedCountry(null); setSelectedLeague(null); }}
      />

      <SportsNav
        activeSport={activeSport}
        onSportChange={s => { setActiveSport(s); setSelectedCountry(null); setSelectedLeague(null); setSearchQuery(''); }}
        timeRange={timeRange}
        onTimeRangeChange={setTimeRange}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onOpenSidebar={() => setIsSidebarOpen(true)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      {/* ── Time Ribbon (Hard Filter) ───────────────────────────────── */}
      <div className="flex items-center gap-2 px-3 py-3 border-b border-gray-100 bg-white overflow-x-auto hide-scrollbar sticky top-0 z-40">
        {days.map((day) => {
          const isSelected = selectedDay.value === day.value;
          return (
            <button
              key={day.value}
              onClick={() => setSelectedDay(day)}
              className={`shrink-0 px-4 py-1.5 rounded-full text-[13px] font-bold transition-colors whitespace-nowrap ${
                isSelected ? 'bg-[#19E66B] text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {day.short}
            </button>
          );
        })}
      </div>

      {/* ── 2-button Filter Bar (Countries & Leagues) ─────────────────────────────────────── */}
      <div className="flex items-center gap-1.5 px-3 py-2.5 border-b border-gray-100 bg-white relative z-30" ref={dropdownRef}>

        {/* 🌍 COUNTRIES — opening this closes Leagues */}
        <div className="relative flex-1">
          <button
            onClick={() => {
              setOpenDropdown(p => p === 'countries' ? null : 'countries');
            }}
            className={`w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11px] font-bold transition-all ${
              openDropdown === 'countries' ? 'bg-gray-200 text-gray-800'
              : selectedCountry ? 'bg-[#19E66B] text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {selectedCountry?.flag
              ? <Image src={selectedCountry.flag} alt="" width={16} height={11} className="object-cover rounded-sm shrink-0 border border-white/30" unoptimized />
              : <span className="text-sm">🌍</span>}
            <span className="truncate">{selectedCountry?.country ?? 'All Countries'}</span>
            <svg viewBox="0 0 24 24" className={`w-3 h-3 shrink-0 ml-auto mr-2 transition-transform ${openDropdown === 'countries' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>
          {openDropdown === 'countries' && (
            <div className="absolute left-0 top-full mt-1 w-64 bg-white border border-gray-200 rounded-xl shadow-2xl z-50 max-h-72 overflow-y-auto">
              <button
                onClick={() => { setSelectedCountry(null); setOpenDropdown(null); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 border-b border-gray-50 font-bold ${!selectedCountry ? 'text-[#0D8A3C] bg-[#E8FFF2]' : 'text-gray-700'}`}
              >
                🌍 All Countries
              </button>
              {allCountries.length === 0 ? (
                <div className="flex items-center justify-center py-8 gap-2">
                  <div className="w-4 h-4 border-2 border-[#19E66B] border-t-transparent rounded-full animate-spin"/>
                  <span className="text-sm text-gray-400">Loading...</span>
                </div>
              ) : (() => {
                const leagueCountry = selectedLeague?.country;
                const sorted = leagueCountry
                  ? [
                      ...allCountries.filter(c => c.country === leagueCountry),
                      ...allCountries.filter(c => c.country !== leagueCountry),
                    ]
                  : allCountries;
                return sorted.map((c, i) => (
                  <button key={c.country}
                    onClick={() => { setSelectedCountry(c); setOpenDropdown(null); }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 border-b border-gray-50 last:border-0 ${
                      selectedCountry?.country === c.country ? 'bg-[#E8FFF2] text-[#0D8A3C]' : 'text-gray-700 hover:bg-gray-50'
                    } ${i === 0 && leagueCountry ? 'rounded-t-xl' : ''}`}
                  >
                    {c.flag
                      ? <Image src={c.flag} alt={c.country} width={24} height={16} className="object-cover rounded-sm shrink-0 border border-gray-200" unoptimized />
                      : <span className="text-base shrink-0">🌍</span>}
                    <span className="text-sm font-medium flex-1 text-left">{c.country}</span>
                    {selectedCountry?.country === c.country && <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-[#19E66B] shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>}
                  </button>
                ));
              })()}
            </div>
          )}
        </div>

        {/* 🏆 LEAGUES — opening this closes Countries */}
        <div className="relative flex-1">
          <button
            onClick={() => {
              setOpenDropdown(p => p === 'leagues' ? null : 'leagues');
            }}
            className={`w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11px] font-bold transition-all ${
              openDropdown === 'leagues' ? 'bg-gray-200 text-gray-800'
              : selectedLeague ? 'bg-[#19E66B] text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {selectedLeague?.logo
              ? <Image src={selectedLeague.logo} alt="" width={14} height={14} className="object-contain shrink-0" unoptimized />
              : <span className="text-sm">🏆</span>}
            <span className="truncate">{selectedLeague?.name ?? 'All Leagues'}</span>
            <svg viewBox="0 0 24 24" className={`w-3 h-3 shrink-0 ml-auto mr-2 transition-transform ${openDropdown === 'leagues' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>
          {openDropdown === 'leagues' && (
            <div className="absolute right-0 top-full mt-1 w-72 bg-white border border-gray-200 rounded-xl shadow-2xl z-50 max-h-72 overflow-y-auto">
              <button
                onClick={() => { setSelectedLeague(null); setOpenDropdown(null); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 border-b border-gray-50 font-bold ${!selectedLeague ? 'text-[#0D8A3C] bg-[#E8FFF2]' : 'text-gray-700'}`}
              >
                🏆 All Leagues
              </button>
              {allLeagues.length === 0 ? (
                <div className="flex items-center justify-center py-8 gap-2">
                  <div className="w-4 h-4 border-2 border-[#19E66B] border-t-transparent rounded-full animate-spin"/>
                  <span className="text-sm text-gray-400">Loading leagues...</span>
                </div>
              ) : (
                // Automatically filter leagues if a country is selected!
                allLeagues
                  .filter(l => !selectedCountry || l.country === selectedCountry.country)
                  .map(l => (
                    <button key={l.id}
                      onClick={() => {
                        setSelectedLeague(l);
                        // Also auto-select country if not already set!
                        if (!selectedCountry && l.country) {
                           setSelectedCountry({ country: l.country });
                        }
                        setOpenDropdown(null);
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 border-b border-gray-50 last:border-0 ${selectedLeague?.id === l.id ? 'bg-[#E8FFF2] text-[#0D8A3C]' : 'text-gray-700 hover:bg-gray-50'}`}
                    >
                      {l.logo
                        ? <Image src={l.logo} alt={l.name} width={22} height={22} className="object-contain shrink-0" unoptimized />
                        : <span className="w-5 h-5 flex items-center justify-center text-sm shrink-0">🏆</span>}
                      <div className="flex-1 text-left min-w-0">
                        <div className="text-sm font-medium truncate">{l.name}</div>
                        {l.country && <div className="text-[10px] text-gray-400">{l.country}</div>}
                      </div>
                      {selectedLeague?.id === l.id && <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-[#19E66B] shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>}
                    </button>
                  ))
              )}
            </div>
          )}
        </div>

      </div>

      {/* Active filter chips */}
      {(selectedCountry || selectedLeague) && (
        <div className="flex items-center flex-wrap gap-2 px-3 py-1.5 bg-[#F0FDF4] border-b border-[#BBF7D0]">
          {selectedCountry && (
            <span className="flex items-center gap-1 px-2 py-0.5 bg-[#DCFCE7] text-[#16A34A] text-[11px] font-semibold rounded-full">
              {selectedCountry.flag ? <Image src={selectedCountry.flag} alt="" width={12} height={8} className="object-cover rounded-sm" unoptimized /> : '🌍'}
              {selectedCountry.country}
              <button onClick={() => setSelectedCountry(null)}>
                <svg viewBox="0 0 24 24" className="w-2.5 h-2.5" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </span>
          )}
          {selectedLeague && (
            <span className="flex items-center gap-1 px-2 py-0.5 bg-[#DCFCE7] text-[#16A34A] text-[11px] font-semibold rounded-full">
              {selectedLeague.logo ? <Image src={selectedLeague.logo} alt="" width={12} height={12} className="object-contain" unoptimized /> : '🏆'}
              {selectedLeague.name}
              <button onClick={() => setSelectedLeague(null)}>
                <svg viewBox="0 0 24 24" className="w-2.5 h-2.5" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </span>
          )}
          <button onClick={() => { setSelectedCountry(null); setSelectedLeague(null); }} className="ml-auto text-[11px] text-gray-400">Clear all</button>
        </div>
      )}

      {/* Match list */}
      <section>
        <FixtureTabs
          sport={activeSport}
          timeRange={timeRange}
          leagueId={selectedLeague?.id ?? undefined}
          activeTab={activeTab}
          filterDate={selectedDay.value || undefined}
          filterCountry={selectedCountry?.country ?? undefined}
          filterSearch={searchQuery || undefined}
          onFixturesLoaded={handleFixturesLoaded}
          onLeaguesLoaded={handleLeaguesLoaded}
        />
      </section>
    </div>
  );
}
