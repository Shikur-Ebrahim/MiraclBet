'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { FixtureTabs } from '@/components/sports/FixtureTabs';
import { SportsNav } from '@/components/sports/TopLeagues';
import { Sidebar } from '@/components/layout/Sidebar';
import { SearchOverlay } from '@/components/sports/SearchOverlay';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://api.miraclbet.com:8443';

interface LeagueInfo { id: string; name: string; logo?: string; }
interface CountryInfo { country: string; flag?: string; leagues: LeagueInfo[]; }

// Build next 7 days list
function buildDays() {
  const days = [];
  const labels = ['Today', 'Tomorrow'];
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const label = labels[i] ?? d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
    const value = d.toISOString().split('T')[0];
    const short = i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' });
    days.push({ label, short, value });
  }
  return days;
}

export function HomeSportsSection() {
  const [activeSport, setActiveSport] = useState('football');
  const [timeRange, setTimeRange] = useState(6);
  const [activeTab, setActiveTab] = useState<'prematch' | 'live'>('prematch');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // ── Filter state ─────────────────────────────────────────────────────────
  const [openDropdown, setOpenDropdown] = useState<'days' | 'countries' | 'leagues' | null>(null);
  const [selectedDay, setSelectedDay] = useState<{ label: string; short: string; value: string }>(buildDays()[0]);
  const [selectedCountry, setSelectedCountry] = useState<CountryInfo | null>(null);
  const [selectedLeague, setSelectedLeague] = useState<LeagueInfo | null>(null);
  const [countryData, setCountryData] = useState<CountryInfo[]>([]);
  const [loadingCountries, setLoadingCountries] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const days = buildDays();

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Fetch countries+leagues when Countries dropdown opens
  useEffect(() => {
    if (openDropdown !== 'countries' || countryData.length > 0) return;
    setLoadingCountries(true);
    fetch(`${API_BASE}/api/v1/fixtures?date=${selectedDay.value}&sport=football`)
      .then(r => r.json())
      .then((data: { country?: string; league?: string; league_id?: string; league_logo_url?: string; country_flag?: string }[]) => {
        if (!Array.isArray(data)) return;
        const map: Record<string, CountryInfo> = {};
        for (const f of data) {
          const c = f.country || 'Other';
          if (!map[c]) map[c] = { country: c, flag: f.country_flag, leagues: [] };
          if (!map[c].flag && f.country_flag) map[c].flag = f.country_flag;
          if (f.league_id && f.league) {
            const exists = map[c].leagues.find(l => l.id === String(f.league_id));
            if (!exists) map[c].leagues.push({ id: String(f.league_id), name: f.league, logo: f.league_logo_url });
          }
        }
        setCountryData(
          Object.values(map)
            .filter(c => c.leagues.length > 0)
            .sort((a, b) => a.country.localeCompare(b.country))
        );
      })
      .catch(() => {})
      .finally(() => setLoadingCountries(false));
  }, [openDropdown, selectedDay.value, countryData.length]);

  // Reset country data when day changes so it re-fetches
  const selectDay = (day: typeof days[0]) => {
    setSelectedDay(day);
    setSelectedCountry(null);
    setSelectedLeague(null);
    setCountryData([]);
    setOpenDropdown(null);
  };

  const resetFilters = () => {
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
        onSelectSport={(sport) => { setActiveSport(sport); resetFilters(); }}
        onSelectLeague={(id, name) => {
          setSelectedLeague({ id, name });
          setActiveSport('football');
          setOpenDropdown(null);
        }}
      />
      <SearchOverlay isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />

      <SportsNav
        activeSport={activeSport}
        onSportChange={(sport) => { setActiveSport(sport); resetFilters(); }}
        timeRange={timeRange}
        onTimeRangeChange={setTimeRange}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onOpenSidebar={() => setIsSidebarOpen(true)}
        onOpenSearch={() => setIsSearchOpen(true)}
      />

      {/* ── 3 Filter Buttons ─────────────────────────────────────────────── */}
      <div className="relative" ref={dropdownRef}>
        <div className="flex items-center gap-2 px-3 py-2.5 border-b border-gray-100 bg-white">

          {/* DAY selector */}
          <button
            onClick={() => setOpenDropdown(prev => prev === 'days' ? null : 'days')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[12px] font-bold transition-all ${
              openDropdown === 'days'
                ? 'bg-gray-200 text-gray-800'
                : !isFiltered
                ? 'bg-[#19E66B] text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            <span className="truncate">{selectedDay.short}</span>
            <svg viewBox="0 0 24 24" className={`w-3 h-3 shrink-0 transition-transform ${openDropdown === 'days' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>

          {/* COUNTRIES */}
          <button
            onClick={() => setOpenDropdown(prev => prev === 'countries' ? null : 'countries')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[12px] font-bold transition-all ${
              selectedCountry && !selectedLeague
                ? 'bg-[#19E66B] text-white'
                : openDropdown === 'countries'
                ? 'bg-gray-200 text-gray-800'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            🌍
            <span className="truncate max-w-[55px]">{selectedCountry?.country ?? 'Countries'}</span>
            <svg viewBox="0 0 24 24" className={`w-3 h-3 shrink-0 transition-transform ${openDropdown === 'countries' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>

          {/* LEAGUES */}
          <button
            onClick={() => {
              if (!selectedCountry) return;
              setOpenDropdown(prev => prev === 'leagues' ? null : 'leagues');
            }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[12px] font-bold transition-all ${
              selectedLeague
                ? 'bg-[#19E66B] text-white'
                : openDropdown === 'leagues'
                ? 'bg-gray-200 text-gray-800'
                : selectedCountry
                ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                : 'bg-gray-50 text-gray-300 cursor-not-allowed'
            }`}
          >
            🏆
            <span className="truncate max-w-[55px]">{selectedLeague?.name ?? 'Leagues'}</span>
            <svg viewBox="0 0 24 24" className={`w-3 h-3 shrink-0 transition-transform ${openDropdown === 'leagues' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>
        </div>

        {/* ── Day Dropdown ──────────────────────────────────────────────── */}
        {openDropdown === 'days' && (
          <div className="absolute left-0 right-0 top-full z-50 bg-white border border-gray-200 shadow-xl">
            {days.map((day, i) => (
              <button
                key={day.value}
                onClick={() => selectDay(day)}
                className={`w-full text-left px-4 py-3 text-sm border-b border-gray-50 flex items-center justify-between ${
                  selectedDay.value === day.value
                    ? 'bg-[#E8FFF2] text-[#0D8A3C] font-bold'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span className="font-medium">
                  {i === 0 ? '📅 Today' : i === 1 ? '📅 Tomorrow' : `📅 ${day.label}`}
                </span>
                <span className="text-[11px] text-gray-400">{day.value}</span>
              </button>
            ))}
          </div>
        )}

        {/* ── Countries Dropdown ──────────────────────────────────────── */}
        {openDropdown === 'countries' && (
          <div className="absolute left-0 right-0 top-full z-50 bg-white border border-gray-200 shadow-xl max-h-72 overflow-y-auto">
            {loadingCountries ? (
              <div className="flex items-center justify-center py-8 gap-2">
                <div className="w-4 h-4 border-2 border-[#19E66B] border-t-transparent rounded-full animate-spin" />
                <span className="text-sm text-gray-400">Loading countries...</span>
              </div>
            ) : countryData.length === 0 ? (
              <div className="text-center py-6 text-sm text-gray-400">No countries found</div>
            ) : (
              countryData.map(c => (
                <button
                  key={c.country}
                  onClick={() => {
                    setSelectedCountry(c);
                    setSelectedLeague(null);
                    setOpenDropdown('leagues');
                  }}
                  className={`w-full text-left px-3 py-2.5 border-b border-gray-50 flex items-center gap-2.5 ${
                    selectedCountry?.country === c.country
                      ? 'bg-[#E8FFF2] text-[#0D8A3C]'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {/* Country flag */}
                  {c.flag ? (
                    <Image src={c.flag} alt={c.country} width={20} height={14} className="object-cover rounded-sm shrink-0" unoptimized />
                  ) : (
                    <span className="text-base shrink-0">🌍</span>
                  )}
                  <span className="text-sm font-medium flex-1">{c.country}</span>
                  <span className="text-[11px] text-gray-400 shrink-0">{c.leagues.length} leagues</span>
                  <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-gray-300 shrink-0" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="9 6 15 12 9 18"/>
                  </svg>
                </button>
              ))
            )}
          </div>
        )}

        {/* ── Leagues Dropdown ────────────────────────────────────────── */}
        {openDropdown === 'leagues' && selectedCountry && (
          <div className="absolute left-0 right-0 top-full z-50 bg-white border border-gray-200 shadow-xl max-h-72 overflow-y-auto">
            {/* Breadcrumb back */}
            <div className="px-3 py-2 bg-gray-50 border-b border-gray-100 flex items-center gap-1.5 sticky top-0">
              {selectedCountry.flag ? (
                <Image src={selectedCountry.flag} alt={selectedCountry.country} width={16} height={11} className="object-cover rounded-sm shrink-0" unoptimized />
              ) : <span className="text-sm">🌍</span>}
              <button
                onClick={() => setOpenDropdown('countries')}
                className="text-[12px] text-[#19E66B] font-bold hover:underline"
              >
                {selectedCountry.country}
              </button>
              <span className="text-[11px] text-gray-400">/ Select League</span>
            </div>

            {selectedCountry.leagues.length === 0 ? (
              <div className="text-center py-6 text-sm text-gray-400">No leagues found</div>
            ) : (
              selectedCountry.leagues.map(league => (
                <button
                  key={league.id}
                  onClick={() => {
                    setSelectedLeague(league);
                    setOpenDropdown(null);
                  }}
                  className={`w-full text-left px-3 py-2.5 border-b border-gray-50 flex items-center gap-2.5 ${
                    selectedLeague?.id === league.id
                      ? 'bg-[#E8FFF2] text-[#0D8A3C]'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {league.logo ? (
                    <Image src={league.logo} alt={league.name} width={20} height={20} className="object-contain shrink-0" unoptimized />
                  ) : (
                    <span className="text-base shrink-0">🏆</span>
                  )}
                  <span className="text-sm font-medium">{league.name}</span>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {/* Active filter chips */}
      {isFiltered && (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-[#F0FDF4] border-b border-[#BBF7D0]">
          {selectedCountry && !selectedLeague && (
            <span className="flex items-center gap-1 px-2 py-0.5 bg-[#DCFCE7] text-[#16A34A] text-[11px] font-semibold rounded-full">
              {selectedCountry.flag
                ? <Image src={selectedCountry.flag} alt="" width={12} height={9} className="object-cover rounded-sm" unoptimized />
                : '🌍'
              }
              {selectedCountry.country}
              <button onClick={resetFilters}>
                <svg viewBox="0 0 24 24" className="w-2.5 h-2.5" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </span>
          )}
          {selectedLeague && (
            <span className="flex items-center gap-1 px-2 py-0.5 bg-[#DCFCE7] text-[#16A34A] text-[11px] font-semibold rounded-full">
              {selectedLeague.logo
                ? <Image src={selectedLeague.logo} alt="" width={12} height={12} className="object-contain" unoptimized />
                : '🏆'
              }
              {selectedLeague.name}
              <button onClick={() => { setSelectedLeague(null); }}>
                <svg viewBox="0 0 24 24" className="w-2.5 h-2.5" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </span>
          )}
          <button onClick={resetFilters} className="ml-auto text-[11px] text-gray-400 hover:text-gray-600">
            Clear all
          </button>
        </div>
      )}

      {/* Match list */}
      <section>
        <FixtureTabs
          sport={activeSport}
          timeRange={timeRange}
          leagueId={selectedLeague?.id ?? undefined}
          activeTab={activeTab}
          filterDate={selectedDay.value}
          filterCountry={selectedCountry && !selectedLeague ? selectedCountry.country : undefined}
        />
      </section>
    </div>
  );
}
