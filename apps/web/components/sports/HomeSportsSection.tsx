'use client';

import React, { useState, useEffect, useRef } from 'react';
import { FixtureTabs } from '@/components/sports/FixtureTabs';
import { SportsNav } from '@/components/sports/TopLeagues';
import { Sidebar } from '@/components/layout/Sidebar';
import { SearchOverlay } from '@/components/sports/SearchOverlay';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://api.miraclbet.com:8443';

interface CountryLeague {
  country: string;
  leagues: { id: string; name: string }[];
}

export function HomeSportsSection() {
  const [activeSport, setActiveSport] = useState('football');
  const [timeRange, setTimeRange] = useState(6);
  const [activeTab, setActiveTab] = useState<'prematch' | 'live'>('prematch');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // ── Filter state ──────────────────────────────────────────────────────────
  const [openDropdown, setOpenDropdown] = useState<'countries' | 'leagues' | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [selectedLeagueId, setSelectedLeagueId] = useState<string | null>(undefined!);
  const [selectedLeagueName, setSelectedLeagueName] = useState<string | null>(null);
  const [countryLeagues, setCountryLeagues] = useState<CountryLeague[]>([]);
  const [loadingCountries, setLoadingCountries] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  // Fetch countries + leagues when Countries dropdown opens
  useEffect(() => {
    if (openDropdown !== 'countries' || countryLeagues.length > 0) return;
    setLoadingCountries(true);
    fetch(`${API_BASE}/api/v1/fixtures?date=${new Date().toISOString().split('T')[0]}&sport=football`)
      .then(r => r.json())
      .then((data: { country?: string; league?: string; league_id?: string }[]) => {
        if (!Array.isArray(data)) return;
        const map: Record<string, { id: string; name: string }[]> = {};
        for (const f of data) {
          const c = f.country || 'Other';
          if (!map[c]) map[c] = [];
          if (f.league_id && f.league && !map[c].find(l => l.id === String(f.league_id))) {
            map[c].push({ id: String(f.league_id), name: f.league });
          }
        }
        setCountryLeagues(
          Object.entries(map)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([country, leagues]) => ({ country, leagues }))
        );
      })
      .catch(() => {})
      .finally(() => setLoadingCountries(false));
  }, [openDropdown, countryLeagues.length]);

  const currentLeagues = selectedCountry
    ? (countryLeagues.find(c => c.country === selectedCountry)?.leagues ?? [])
    : [];

  const resetFilters = () => {
    setSelectedCountry(null);
    setSelectedLeagueId(undefined!);
    setSelectedLeagueName(null);
    setOpenDropdown(null);
  };

  const isFiltered = !!(selectedCountry || selectedLeagueId);

  return (
    <div>
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onSelectSport={(sport) => { setActiveSport(sport); resetFilters(); }}
        onSelectLeague={(id, name) => {
          setSelectedLeagueId(id);
          setSelectedLeagueName(name);
          setSelectedCountry(null);
          setActiveSport('football');
          setOpenDropdown(null);
        }}
      />

      <SearchOverlay
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
      />

      {/* Sports Navigation */}
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

      {/* ── 3 Filter Buttons ───────────────────────────────────────────────── */}
      <div className="relative" ref={dropdownRef}>
        <div className="flex items-center gap-2 px-3 py-2.5 border-b border-gray-100 bg-white">

          {/* TODAY button */}
          <button
            onClick={resetFilters}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[12px] font-bold transition-all ${
              !isFiltered
                ? 'bg-[#19E66B] text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            Today
          </button>

          {/* COUNTRIES button */}
          <button
            onClick={() => setOpenDropdown(prev => prev === 'countries' ? null : 'countries')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[12px] font-bold transition-all ${
              selectedCountry && !selectedLeagueId
                ? 'bg-[#19E66B] text-white'
                : openDropdown === 'countries'
                ? 'bg-gray-200 text-gray-800'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            🌍
            <span className="truncate max-w-[60px]">{selectedCountry ?? 'Countries'}</span>
            <svg viewBox="0 0 24 24" className={`w-3 h-3 shrink-0 transition-transform ${openDropdown === 'countries' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>

          {/* LEAGUES button */}
          <button
            onClick={() => {
              if (!selectedCountry) return; // must pick country first
              setOpenDropdown(prev => prev === 'leagues' ? null : 'leagues');
            }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[12px] font-bold transition-all ${
              selectedLeagueId
                ? 'bg-[#19E66B] text-white'
                : openDropdown === 'leagues'
                ? 'bg-gray-200 text-gray-800'
                : selectedCountry
                ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                : 'bg-gray-50 text-gray-300 cursor-not-allowed'
            }`}
          >
            🏆
            <span className="truncate max-w-[60px]">{selectedLeagueName ?? 'Leagues'}</span>
            <svg viewBox="0 0 24 24" className={`w-3 h-3 shrink-0 transition-transform ${openDropdown === 'leagues' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>
        </div>

        {/* ── Countries Dropdown ──────────────────────────────────────────── */}
        {openDropdown === 'countries' && (
          <div className="absolute left-0 right-0 top-full z-50 bg-white border border-gray-200 shadow-xl max-h-72 overflow-y-auto">
            {loadingCountries ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-5 h-5 border-2 border-[#19E66B] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : countryLeagues.length === 0 ? (
              <div className="text-center py-6 text-sm text-gray-400">No countries found</div>
            ) : (
              countryLeagues.map(({ country }) => (
                <button
                  key={country}
                  onClick={() => {
                    setSelectedCountry(country);
                    setSelectedLeagueId(undefined!);
                    setSelectedLeagueName(null);
                    setOpenDropdown('leagues'); // auto-open leagues for this country
                  }}
                  className={`w-full text-left px-4 py-3 text-sm font-medium border-b border-gray-50 flex items-center justify-between ${
                    selectedCountry === country ? 'bg-[#E8FFF2] text-[#0D8A3C] font-bold' : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <span>🌍 {country}</span>
                  <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="9 6 15 12 9 18"/>
                  </svg>
                </button>
              ))
            )}
          </div>
        )}

        {/* ── Leagues Dropdown ────────────────────────────────────────────── */}
        {openDropdown === 'leagues' && selectedCountry && (
          <div className="absolute left-0 right-0 top-full z-50 bg-white border border-gray-200 shadow-xl max-h-72 overflow-y-auto">
            <div className="px-3 py-2 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
              <button
                onClick={() => setOpenDropdown('countries')}
                className="text-[11px] text-[#19E66B] font-bold"
              >
                ← {selectedCountry}
              </button>
              <span className="text-[11px] text-gray-400">/ Leagues</span>
            </div>
            {currentLeagues.length === 0 ? (
              <div className="text-center py-6 text-sm text-gray-400">No leagues found</div>
            ) : (
              currentLeagues.map(league => (
                <button
                  key={league.id}
                  onClick={() => {
                    setSelectedLeagueId(league.id);
                    setSelectedLeagueName(league.name);
                    setOpenDropdown(null);
                  }}
                  className={`w-full text-left px-4 py-3 text-sm font-medium border-b border-gray-50 ${
                    selectedLeagueId === league.id ? 'bg-[#E8FFF2] text-[#0D8A3C] font-bold' : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  🏆 {league.name}
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {/* Active filter chips */}
      {isFiltered && (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-[#F0FDF4] border-b border-[#BBF7D0]">
          {selectedCountry && (
            <span className="flex items-center gap-1 px-2 py-0.5 bg-[#DCFCE7] text-[#16A34A] text-[11px] font-semibold rounded-full">
              🌍 {selectedCountry}
              <button onClick={() => { setSelectedCountry(null); setSelectedLeagueId(undefined!); setSelectedLeagueName(null); }}>
                <svg viewBox="0 0 24 24" className="w-2.5 h-2.5" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </span>
          )}
          {selectedLeagueName && (
            <span className="flex items-center gap-1 px-2 py-0.5 bg-[#DCFCE7] text-[#16A34A] text-[11px] font-semibold rounded-full">
              🏆 {selectedLeagueName}
              <button onClick={() => { setSelectedLeagueId(undefined!); setSelectedLeagueName(null); }}>
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
          leagueId={selectedLeagueId ?? undefined}
          activeTab={activeTab}
          filterCountry={selectedCountry ?? undefined}
        />
      </section>
    </div>
  );
}
