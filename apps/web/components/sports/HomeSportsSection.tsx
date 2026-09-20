'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { FixtureTabs } from '@/components/sports/FixtureTabs';
import { SportsNav } from '@/components/sports/TopLeagues';
import { Sidebar } from '@/components/layout/Sidebar';
import { SearchOverlay } from '@/components/sports/SearchOverlay';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://api.miraclbet.com:8443';

interface LeagueInfo {
  id: string;
  name: string;
  logo_url: string;
  country: string;
  country_flag_url: string;
}
interface CountryGroup {
  country: string;
  flag: string;
  leagues: LeagueInfo[];
}

// Build 7-day list
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

export function HomeSportsSection() {
  const [activeSport, setActiveSport] = useState('football');
  const [activeTab, setActiveTab] = useState<'prematch' | 'live'>('prematch');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Filter state
  const days = buildDays();
  const [selectedDay, setSelectedDay] = useState(days[0]); // default = Today
  const [openDropdown, setOpenDropdown] = useState<'days' | 'countries' | 'leagues' | null>(null);
  const [allLeagues, setAllLeagues] = useState<LeagueInfo[]>([]);
  const [loadingLeagues, setLoadingLeagues] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<CountryGroup | null>(null);
  const [selectedLeague, setSelectedLeague] = useState<LeagueInfo | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node))
        setOpenDropdown(null);
    };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  // Fetch leagues from 7-day window (not just today) — so ALL countries appear
  useEffect(() => {
    if (openDropdown !== 'countries' && openDropdown !== 'leagues') return;
    if (allLeagues.length > 0) return; // already loaded
    setLoadingLeagues(true);
    fetch(`${API_BASE}/api/v1/meta/leagues?days=7`)
      .then(r => r.json())
      .then((data: LeagueInfo[]) => {
        setAllLeagues(Array.isArray(data) ? data : []);
      })
      .catch(() => setAllLeagues([]))
      .finally(() => setLoadingLeagues(false));
  }, [openDropdown, allLeagues.length]);

  // Group leagues by country
  const countryGroups: CountryGroup[] = React.useMemo(() => {
    const map: Record<string, CountryGroup> = {};
    for (const l of allLeagues) {
      const c = l.country || 'Other';
      if (!map[c]) map[c] = { country: c, flag: l.country_flag_url || '', leagues: [] };
      map[c].leagues.push(l);
    }
    return Object.values(map).sort((a, b) => a.country.localeCompare(b.country));
  }, [allLeagues]);

  const resetFilters = () => {
    setSelectedCountry(null);
    setSelectedLeague(null);
    setOpenDropdown(null);
  };

  const handleDaySelect = (day: typeof days[0]) => {
    setSelectedDay(day);
    // Don't reset allLeagues here — countries come from 7-day window
    setSelectedCountry(null);
    setSelectedLeague(null);
    setOpenDropdown(null);
  };

  const isFiltered = !!(selectedCountry || selectedLeague);

  return (
    <div>
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onSelectSport={s => { setActiveSport(s); resetFilters(); }}
        onSelectLeague={(id, name) => {
          setSelectedLeague({ id, name, logo_url: '', country: '', country_flag_url: '' });
          setActiveSport('football');
          setOpenDropdown(null);
        }}
      />
      <SearchOverlay isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />

      <SportsNav
        activeSport={activeSport}
        onSportChange={s => { setActiveSport(s); resetFilters(); }}
        timeRange={0}
        onTimeRangeChange={() => {}}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onOpenSidebar={() => setIsSidebarOpen(true)}
        onOpenSearch={() => setIsSearchOpen(true)}
      />

      {/* ── 3 Filter Buttons ─────────────────────────────────────────────── */}
      <div className="relative z-30" ref={dropdownRef}>
        <div className="flex items-center gap-2 px-3 py-2.5 border-b border-gray-100 bg-white">

          {/* 📅 DAY */}
          <button
            onClick={() => setOpenDropdown(p => p === 'days' ? null : 'days')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[12px] font-bold transition-all ${
              openDropdown === 'days' ? 'bg-gray-200 text-gray-800'
              : !isFiltered ? 'bg-[#19E66B] text-white'
              : 'bg-gray-100 text-gray-600'
            }`}
          >
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            <span className="truncate">{selectedDay.short}</span>
            <svg viewBox="0 0 24 24" className={`w-3 h-3 shrink-0 transition-transform ${openDropdown === 'days' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>

          {/* 🌍 COUNTRIES */}
          <button
            onClick={() => setOpenDropdown(p => p === 'countries' ? null : 'countries')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[12px] font-bold transition-all ${
              openDropdown === 'countries' ? 'bg-gray-200 text-gray-800'
              : (selectedCountry && !selectedLeague) ? 'bg-[#19E66B] text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {selectedCountry?.flag
              ? <Image src={selectedCountry.flag} alt="" width={16} height={11} className="object-cover rounded-sm shrink-0" unoptimized />
              : <span className="text-sm shrink-0">🌍</span>
            }
            <span className="truncate max-w-[52px]">{selectedCountry?.country ?? 'Countries'}</span>
            <svg viewBox="0 0 24 24" className={`w-3 h-3 shrink-0 transition-transform ${openDropdown === 'countries' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>

          {/* 🏆 LEAGUES */}
          <button
            onClick={() => {
              if (!selectedCountry) return;
              setOpenDropdown(p => p === 'leagues' ? null : 'leagues');
            }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[12px] font-bold transition-all ${
              openDropdown === 'leagues' ? 'bg-gray-200 text-gray-800'
              : selectedLeague ? 'bg-[#19E66B] text-white'
              : selectedCountry ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              : 'bg-gray-50 text-gray-300 cursor-not-allowed'
            }`}
          >
            {selectedLeague?.logo_url
              ? <Image src={selectedLeague.logo_url} alt="" width={16} height={16} className="object-contain shrink-0" unoptimized />
              : <span className="text-sm shrink-0">🏆</span>
            }
            <span className="truncate max-w-[52px]">{selectedLeague?.name ?? 'Leagues'}</span>
            <svg viewBox="0 0 24 24" className={`w-3 h-3 shrink-0 transition-transform ${openDropdown === 'leagues' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>
        </div>

        {/* ── Day Dropdown ──────────────────────────────────────────── */}
        {openDropdown === 'days' && (
          <div className="absolute left-0 right-0 top-full bg-white border border-gray-200 shadow-xl">
            {days.map((day, i) => (
              <button
                key={day.value}
                onClick={() => handleDaySelect(day)}
                className={`w-full flex items-center justify-between px-4 py-3 text-sm border-b border-gray-50 ${
                  selectedDay.value === day.value ? 'bg-[#E8FFF2] text-[#0D8A3C] font-bold' : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span className="font-medium">
                  {i === 0 ? '📅 Today' : i === 1 ? '📅 Tomorrow' : `📅 ${day.short}`}
                </span>
                <span className="text-[11px] text-gray-400">{day.value}</span>
              </button>
            ))}
          </div>
        )}

        {/* ── Countries Dropdown ────────────────────────────────────── */}
        {openDropdown === 'countries' && (
          <div className="absolute left-0 right-0 top-full bg-white border border-gray-200 shadow-xl max-h-72 overflow-y-auto">
            {loadingLeagues ? (
              <div className="flex items-center justify-center py-8 gap-2">
                <div className="w-4 h-4 border-2 border-[#19E66B] border-t-transparent rounded-full animate-spin" />
                <span className="text-sm text-gray-400">Loading...</span>
              </div>
            ) : countryGroups.length === 0 ? (
              <div className="py-6 text-center text-sm text-gray-400">No countries found</div>
            ) : countryGroups.map(cg => (
              <button
                key={cg.country}
                onClick={() => {
                  setSelectedCountry(cg);
                  setSelectedLeague(null);
                  setOpenDropdown(null); // ← close immediately, show all matches in that country
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 border-b border-gray-50 ${
                  selectedCountry?.country === cg.country ? 'bg-[#E8FFF2] text-[#0D8A3C]' : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                {cg.flag
                  ? <Image src={cg.flag} alt={cg.country} width={22} height={15} className="object-cover rounded-sm shrink-0 border border-gray-200" unoptimized />
                  : <span className="text-base shrink-0">🌍</span>
                }
                <span className="text-sm font-medium flex-1 text-left">{cg.country}</span>
                <span className="text-[11px] text-gray-400 shrink-0">{cg.leagues.length} leagues</span>
                {selectedCountry?.country === cg.country && (
                  <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-[#19E66B] shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                )}
              </button>
            ))}
          </div>
        )}

        {/* ── Leagues Dropdown ──────────────────────────────────────── */}
        {openDropdown === 'leagues' && selectedCountry && (
          <div className="absolute left-0 right-0 top-full bg-white border border-gray-200 shadow-xl max-h-72 overflow-y-auto">
            {/* Breadcrumb */}
            <div className="px-3 py-2 bg-gray-50 border-b border-gray-100 sticky top-0 flex items-center gap-1.5">
              {selectedCountry.flag
                ? <Image src={selectedCountry.flag} alt="" width={16} height={11} className="object-cover rounded-sm shrink-0 border border-gray-200" unoptimized />
                : <span className="text-xs">🌍</span>
              }
              <button
                onClick={() => setOpenDropdown('countries')}
                className="text-[12px] text-[#19E66B] font-bold hover:underline"
              >{selectedCountry.country}</button>
              <span className="text-[11px] text-gray-400">/ Leagues</span>
            </div>
            {selectedCountry.leagues.length === 0
              ? <div className="py-6 text-center text-sm text-gray-400">No leagues</div>
              : selectedCountry.leagues.map(league => (
                <button
                  key={league.id}
                  onClick={() => { setSelectedLeague(league); setOpenDropdown(null); }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 border-b border-gray-50 ${
                    selectedLeague?.id === league.id ? 'bg-[#E8FFF2] text-[#0D8A3C]' : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {league.logo_url
                    ? <Image src={league.logo_url} alt={league.name} width={22} height={22} className="object-contain shrink-0" unoptimized />
                    : <span className="text-base shrink-0">🏆</span>
                  }
                  <span className="text-sm font-medium text-left">{league.name}</span>
                </button>
              ))
            }
          </div>
        )}
      </div>

      {/* Active filter chips */}
      {isFiltered && (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-[#F0FDF4] border-b border-[#BBF7D0]">
          {selectedCountry && !selectedLeague && (
            <span className="flex items-center gap-1 px-2 py-0.5 bg-[#DCFCE7] text-[#16A34A] text-[11px] font-semibold rounded-full">
              {selectedCountry.flag
                ? <Image src={selectedCountry.flag} alt="" width={12} height={8} className="object-cover rounded-sm" unoptimized />
                : '🌍'}
              {selectedCountry.country}
              <button onClick={resetFilters}>
                <svg viewBox="0 0 24 24" className="w-2.5 h-2.5" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </span>
          )}
          {selectedLeague && (
            <span className="flex items-center gap-1 px-2 py-0.5 bg-[#DCFCE7] text-[#16A34A] text-[11px] font-semibold rounded-full">
              {selectedLeague.logo_url
                ? <Image src={selectedLeague.logo_url} alt="" width={12} height={12} className="object-contain" unoptimized />
                : '🏆'}
              {selectedLeague.name}
              <button onClick={() => setSelectedLeague(null)}>
                <svg viewBox="0 0 24 24" className="w-2.5 h-2.5" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </span>
          )}
          <button onClick={resetFilters} className="ml-auto text-[11px] text-gray-400">Clear all</button>
        </div>
      )}

      {/* Match list — always loads 7 days, selected day shown first */}
      <section>
        <FixtureTabs
          sport={activeSport}
          timeRange={6}
          leagueId={selectedLeague?.id ?? undefined}
          activeTab={activeTab}
          priorityDate={selectedDay.value}
          filterCountry={selectedCountry && !selectedLeague ? selectedCountry.country : undefined}
        />
      </section>
    </div>
  );
}
