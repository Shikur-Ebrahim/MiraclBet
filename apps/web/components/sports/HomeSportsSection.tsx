'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { FixtureTabs } from '@/components/sports/FixtureTabs';
import { SportsNav } from '@/components/sports/TopLeagues';
import { Sidebar } from '@/components/layout/Sidebar';
import { SearchOverlay } from '@/components/sports/SearchOverlay';

function buildDays() {
  const today = new Date();
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const value = d.toISOString().split('T')[0];
    const short = i === 0 ? 'Today' : i === 1 ? 'Tomorrow'
      : d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
    return { value, short };
  });
}

interface CountryItem { country: string; flag?: string; }
interface LeagueItem  { id: string; name: string; logo?: string; country: string; }

export function HomeSportsSection() {
  const [activeSport, setActiveSport] = useState('football');
  const [activeTab, setActiveTab]   = useState<'prematch' | 'live'>('prematch');
  const [timeRange, setTimeRange]   = useState(6);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSearchOpen,  setIsSearchOpen]  = useState(false);

  const days = buildDays();
  const [selectedDay, setSelectedDay] = useState(days[0]);
  const [openDropdown, setOpenDropdown] = useState<'days' | 'countries' | 'leagues' | null>(null);

  // Derived from real fixture data
  const [allCountries, setAllCountries] = useState<CountryItem[]>([]);
  const [allLeagues,   setAllLeagues]   = useState<LeagueItem[]>([]);

  // Independent filter selections
  const [selectedCountry, setSelectedCountry] = useState<CountryItem | null>(null);
  const [selectedLeague,  setSelectedLeague]  = useState<LeagueItem  | null>(null);

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
      <SearchOverlay isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />

      <SportsNav
        activeSport={activeSport}
        onSportChange={s => { setActiveSport(s); setSelectedCountry(null); setSelectedLeague(null); }}
        timeRange={timeRange}
        onTimeRangeChange={setTimeRange}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onOpenSidebar={() => setIsSidebarOpen(true)}
        onOpenSearch={() => setIsSearchOpen(true)}
      />

      {/* ── 3-button Filter Bar — each button owns its dropdown ──────── */}
      <div className="flex items-center gap-1.5 px-3 py-2.5 border-b border-gray-100 bg-white relative z-30" ref={dropdownRef}>

        {/* 📅 DAY — dropdown anchors below this button only */}
        <div className="relative flex-1">
          <button
            onClick={() => setOpenDropdown(p => p === 'days' ? null : 'days')}
            className={`w-full flex items-center justify-center gap-1 py-2 rounded-lg text-[11px] font-bold transition-all ${
              openDropdown === 'days' ? 'bg-gray-200 text-gray-800'
              : (!selectedCountry && !selectedLeague) ? 'bg-[#19E66B] text-white'
              : 'bg-gray-100 text-gray-600'
            }`}
          >
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5">
              <rect x="3" y="4" width="18" height="18" rx="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            <span className="truncate">{selectedDay.short}</span>
            <svg viewBox="0 0 24 24" className={`w-3 h-3 shrink-0 transition-transform ${openDropdown === 'days' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>
          {openDropdown === 'days' && (
            <div className="absolute left-0 top-full mt-1 w-56 bg-white border border-gray-200 rounded-xl shadow-2xl z-50 overflow-hidden">
              {days.map((day, i) => (
                <button key={day.value}
                  onClick={() => { setSelectedDay(day); setOpenDropdown(null); }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 text-sm border-b border-gray-50 last:border-0 ${
                    selectedDay.value === day.value ? 'bg-[#E8FFF2] text-[#0D8A3C] font-bold' : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <span className="font-medium">{i === 0 ? '📅 Today' : i === 1 ? '📅 Tomorrow' : `📅 ${day.short}`}</span>
                  <span className="text-[10px] text-gray-400">{day.value}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 🌍 COUNTRIES — dropdown anchors below this button only */}
        <div className="relative flex-[1.4]">
          <button
            onClick={() => setOpenDropdown(p => p === 'countries' ? null : 'countries')}
            className={`w-full flex items-center justify-center gap-1 py-2 rounded-lg text-[11px] font-bold transition-all ${
              openDropdown === 'countries' ? 'bg-gray-200 text-gray-800'
              : selectedCountry ? 'bg-[#19E66B] text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {selectedCountry?.flag
              ? <Image src={selectedCountry.flag} alt="" width={16} height={11} className="object-cover rounded-sm shrink-0 border border-white/30" unoptimized />
              : <span className="text-sm">🌍</span>}
            <span className="truncate max-w-[55px]">{selectedCountry?.country ?? 'Countries'}</span>
            <svg viewBox="0 0 24 24" className={`w-3 h-3 shrink-0 transition-transform ${openDropdown === 'countries' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>
          {openDropdown === 'countries' && (
            <div className="absolute left-0 top-full mt-1 w-64 bg-white border border-gray-200 rounded-xl shadow-2xl z-50 max-h-72 overflow-y-auto">
              <button
                onClick={() => { setSelectedCountry(null); setOpenDropdown(null); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 border-b border-gray-100 rounded-t-xl ${!selectedCountry ? 'bg-[#E8FFF2] text-[#0D8A3C] font-bold' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                <span className="text-base">🌍</span>
                <span className="text-sm font-medium flex-1 text-left">All Countries</span>
                {!selectedCountry && <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-[#19E66B]" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>}
              </button>
              {allCountries.length === 0 ? (
                <div className="flex items-center justify-center py-8 gap-2">
                  <div className="w-4 h-4 border-2 border-[#19E66B] border-t-transparent rounded-full animate-spin"/>
                  <span className="text-sm text-gray-400">Loading...</span>
                </div>
              ) : allCountries.map(c => (
                <button key={c.country}
                  onClick={() => { setSelectedCountry(c); setOpenDropdown(null); }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 border-b border-gray-50 last:border-0 ${selectedCountry?.country === c.country ? 'bg-[#E8FFF2] text-[#0D8A3C]' : 'text-gray-700 hover:bg-gray-50'}`}
                >
                  {c.flag
                    ? <Image src={c.flag} alt={c.country} width={24} height={16} className="object-cover rounded-sm shrink-0 border border-gray-200" unoptimized />
                    : <span className="text-base shrink-0">🌍</span>}
                  <span className="text-sm font-medium flex-1 text-left">{c.country}</span>
                  {selectedCountry?.country === c.country && <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-[#19E66B] shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 🏆 LEAGUES — dropdown anchors below this button only */}
        <div className="relative flex-[1.4]">
          <button
            onClick={() => setOpenDropdown(p => p === 'leagues' ? null : 'leagues')}
            className={`w-full flex items-center justify-center gap-1 py-2 rounded-lg text-[11px] font-bold transition-all ${
              openDropdown === 'leagues' ? 'bg-gray-200 text-gray-800'
              : selectedLeague ? 'bg-[#19E66B] text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {selectedLeague?.logo
              ? <Image src={selectedLeague.logo} alt="" width={14} height={14} className="object-contain shrink-0" unoptimized />
              : <span className="text-sm">🏆</span>}
            <span className="truncate max-w-[55px]">{selectedLeague?.name ?? 'Leagues'}</span>
            <svg viewBox="0 0 24 24" className={`w-3 h-3 shrink-0 transition-transform ${openDropdown === 'leagues' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>
          {openDropdown === 'leagues' && (
            <div className="absolute right-0 top-full mt-1 w-72 bg-white border border-gray-200 rounded-xl shadow-2xl z-50 max-h-72 overflow-y-auto">
              <div className="px-3 py-2 bg-gray-50 border-b border-gray-100 rounded-t-xl">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">⭐ Top Leagues</span>
              </div>
              <button
                onClick={() => { setSelectedLeague(null); setOpenDropdown(null); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 border-b border-gray-100 ${!selectedLeague ? 'bg-[#E8FFF2] text-[#0D8A3C] font-bold' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                <span className="text-base">🏆</span>
                <span className="text-sm font-medium flex-1 text-left">All Leagues</span>
                {!selectedLeague && <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-[#19E66B]" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>}
              </button>
              {allLeagues.length === 0 ? (
                <div className="flex items-center justify-center py-8 gap-2">
                  <div className="w-4 h-4 border-2 border-[#19E66B] border-t-transparent rounded-full animate-spin"/>
                  <span className="text-sm text-gray-400">Loading leagues...</span>
                </div>
              ) : allLeagues.map(l => (
                <button key={l.id}
                  onClick={() => { setSelectedLeague(l); setOpenDropdown(null); }}
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
              ))}
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
          priorityDate={selectedDay.value}
          filterCountry={selectedCountry?.country ?? undefined}
          onFixturesLoaded={handleFixturesLoaded}
          onLeaguesLoaded={handleLeaguesLoaded}
        />
      </section>
    </div>
  );
}
