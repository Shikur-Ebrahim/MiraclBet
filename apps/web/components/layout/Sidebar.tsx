'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { clsx } from 'clsx';

interface SportInfo {
  slug: string;
  name: string;
  emoji: string;
  count: number;
}

interface LeagueInfo {
  id: string;
  name: string;
  country: string;
  logo_url: string;
  season: number;
  is_top_league: boolean;
}

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSport: (sport: string) => void;
  onSelectLeague: (leagueId: string, leagueName: string) => void;
}

function seasonLabel(season: number): string {
  if (!season) return '';
  if (season >= 2020) return `${season}/${season + 1}`;
  return `${season}`;
}

const COUNTRY_FLAGS: Record<string, string> = {
  'World': '🌍', 'England': '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'Spain': '🇪🇸', 'Italy': '🇮🇹', 'Germany': '🇩🇪',
  'France': '🇫🇷', 'Netherlands': '🇳🇱', 'Portugal': '🇵🇹', 'Turkey': '🇹🇷',
  'Russia': '🇷🇺', 'Egypt': '🇪🇬', 'South America': '🌎', 'Brazil': '🇧🇷',
  'Argentina': '🇦🇷', 'USA': '🇺🇸', 'Mexico': '🇲🇽'
};

function getFlag(country: string): string {
  return COUNTRY_FLAGS[country] || '🏳️';
}

export function Sidebar({ isOpen, onClose, onSelectSport, onSelectLeague }: SidebarProps) {
  const [activeTab, setActiveTab] = useState<'prematch' | 'live'>('prematch');
  const [timeRange, setTimeRange] = useState(6);
  const [expandedSection, setExpandedSection] = useState<'leagues' | 'sports' | null>('leagues');
  const [expandedCountries, setExpandedCountries] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');

  const [allLeagues, setAllLeagues] = useState<LeagueInfo[]>([]);
  const [sportsList, setSportsList] = useState<SportInfo[]>([]);

  useEffect(() => {
    if (!isOpen) return;
    const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://api.miraclbet.com:8443';

    // Fetch ALL leagues from the new endpoint
    fetch(`${API_BASE}/api/v1/meta/leagues`)
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setAllLeagues(data);
        } else {
          // Fallback to top leagues if the new endpoint is not deployed yet
          fetch(`${API_BASE}/api/v1/meta/leagues/top`)
            .then(r => r.json())
            .then(fallbackData => {
              if (Array.isArray(fallbackData)) setAllLeagues(fallbackData);
            })
            .catch(console.error);
        }
      })
      .catch(() => {
        // Fallback on error
        fetch(`${API_BASE}/api/v1/meta/leagues/top`)
          .then(r => r.json())
          .then(fallbackData => {
            if (Array.isArray(fallbackData)) setAllLeagues(fallbackData);
          })
          .catch(console.error);
      });

    fetch(`${API_BASE}/api/v1/meta/sports`)
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setSportsList(data); })
      .catch(console.error);
  }, [isOpen]);

  // Filter based on search query
  const filteredLeagues = useMemo(() => {
    return allLeagues.filter(l => {
      const q = searchQuery.toLowerCase();
      return !q || l.name.toLowerCase().includes(q) || (l.country || '').toLowerCase().includes(q);
    });
  }, [allLeagues, searchQuery]);

  // Separate Top Leagues (flat list, max 15)
  const topLeagues = useMemo(() => {
    return filteredLeagues.filter(l => l.is_top_league).slice(0, 15);
  }, [filteredLeagues]);

  // Group the REMAINING leagues by country
  const groupedByCountry = useMemo(() => {
    const remaining = filteredLeagues.filter(l => !l.is_top_league);
    const groups: Record<string, LeagueInfo[]> = {};
    for (const league of remaining) {
      const country = league.country || 'World';
      if (!groups[country]) groups[country] = [];
      groups[country].push(league);
    }
    return Object.entries(groups).sort(([a], [b]) => {
      if (a === 'World') return -1;
      if (b === 'World') return 1;
      return a.localeCompare(b);
    });
  }, [filteredLeagues]);

  const toggleCountry = (country: string) => {
    setExpandedCountries(prev => {
      const next = new Set(prev);
      if (next.has(country)) next.delete(country);
      else next.add(country);
      return next;
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" style={{ background: '#072414' }}>
      <div className="p-4 pb-24">

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="text-2xl font-bold tracking-tight">
            <span className="text-white">Miracl</span>
            <span style={{ color: '#19E66B' }}>Bet</span>
          </div>
          <button onClick={onClose} className="p-2 text-white hover:bg-white/10 rounded-full transition-colors">
            <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Prematch / Live Toggle */}
        <div className="flex rounded-xl p-1 mb-5" style={{ background: '#0A361E' }}>
          {(['prematch', 'live'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={clsx('flex-1 py-2.5 text-sm font-bold rounded-lg capitalize transition-colors',
                activeTab === tab ? 'text-[#072414]' : 'text-white/60 hover:text-white'
              )}
              style={activeTab === tab ? { background: '#19E66B' } : {}}
            >
              {tab === 'live' ? (
                <span className="flex items-center justify-center gap-1.5">
                  Live
                  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="9 18 15 12 9 6"/>
                  </svg>
                </span>
              ) : 'Prematch'}
            </button>
          ))}
        </div>

        {/* Time Slider */}
        <div className="flex items-center gap-3 mb-5">
          <div className="text-[11px] leading-tight text-white font-medium min-w-[44px] whitespace-pre-wrap">
            {timeRange === 0 ? 'Today\nEvents' : timeRange === 6 ? 'All\nEvents' : `${timeRange + 1} Days\nEvents`}
          </div>
          <div
            className="flex-1 relative h-6 flex items-center cursor-pointer"
            onClick={e => {
              const rect = e.currentTarget.getBoundingClientRect();
              setTimeRange(Math.round(Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)) * 6));
            }}
          >
            <div className="absolute inset-x-0 flex gap-[3px]">
              {[0,1,2,3,4,5,6].map(i => (
                <div key={i} className={`flex-1 h-1.5 rounded-full transition-colors ${i <= timeRange ? 'bg-gray-300' : 'bg-gray-600'}`} />
              ))}
            </div>
            <div
              className="absolute h-5 w-5 rounded-full bg-gray-200 shadow-md transition-all pointer-events-none"
              style={{ left: `calc(${(timeRange/6)*100}% - ${(timeRange/6)*20}px)` }}
            />
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative mb-4">
          <svg viewBox="0 0 24 24" className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-white/40" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
          </svg>
          <input
            type="text"
            placeholder="Search leagues or countries..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full py-3 pl-10 pr-4 rounded-xl text-sm text-white placeholder-white/40 outline-none border border-transparent focus:border-[#19E66B]"
            style={{ background: '#0A361E' }}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white">
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          )}
        </div>

        {/* ── TOP LEAGUES SECTION (Flat) ── */}
        <div className="mb-3">
          <button
            onClick={() => setExpandedSection(expandedSection === 'leagues' ? null : 'leagues')}
            className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-colors mb-2"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#19E66B' }}>
                <svg viewBox="0 0 24 24" className="w-5 h-5 text-[#072414]" fill="currentColor">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </svg>
              </div>
              <span className="font-bold text-white">Top Leagues</span>
              <span className="text-xs text-white/30 font-normal ml-1">({topLeagues.length})</span>
            </div>
            <svg viewBox="0 0 24 24" className={clsx('w-5 h-5 text-white/50 transition-transform', expandedSection === 'leagues' ? 'rotate-180' : '')} fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>

          {expandedSection === 'leagues' && (
            <div className="mb-4">
              {topLeagues.map(league => (
                <button
                  key={`top-${league.id}`}
                  onClick={() => { onSelectLeague(league.id, league.name); onClose(); }}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors group rounded-lg"
                >
                  <div className="w-6 h-6 shrink-0 flex items-center justify-center rounded overflow-hidden">
                    {league.logo_url ? (
                      <Image src={league.logo_url} alt={league.name} width={24} height={24} className="object-contain" unoptimized />
                    ) : (
                      <span className="text-base">⚽</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <div className="text-sm font-medium text-white/90 group-hover:text-white truncate">{league.name}</div>
                    <div className="text-[11px] text-white/35">
                      {league.country}{league.season ? ` · ${seasonLabel(league.season)}` : ''}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── ALL COUNTRIES & LEAGUES SECTION ── */}
        <div className="mb-3">
          <div className="px-4 py-2 text-xs font-bold tracking-widest text-white/40 uppercase mb-2">
            All Countries
          </div>
          
          {groupedByCountry.length === 0 ? (
            <div className="text-center text-sm text-white/40 py-4">No countries found</div>
          ) : (
            groupedByCountry.map(([country, leagues]) => (
              <div key={country} className="mb-1">
                {/* Country header */}
                <button
                  onClick={() => toggleCountry(country)}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-lg hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{getFlag(country)}</span>
                    <span className="text-sm font-bold text-white/80">{country}</span>
                    <span className="text-[10px] text-white/30 px-1.5 py-0.5 rounded-full" style={{ background: '#0D2018' }}>
                      {leagues.length}
                    </span>
                  </div>
                  <svg
                    viewBox="0 0 24 24"
                    className={clsx('w-4 h-4 text-white/30 transition-transform', expandedCountries.has(country) ? 'rotate-180' : '')}
                    fill="none" stroke="currentColor" strokeWidth="2"
                  >
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </button>

                {/* Leagues inside this country */}
                {expandedCountries.has(country) && (
                  <div className="mb-2 bg-[#0D2018]/50 rounded-lg py-1 mt-1">
                    {leagues.map(league => (
                      <button
                        key={`all-${league.id}`}
                        onClick={() => { onSelectLeague(league.id, league.name); onClose(); }}
                        className="w-full flex items-center gap-3 pl-12 pr-4 py-2.5 hover:bg-white/5 transition-colors group"
                      >
                        <div className="w-5 h-5 shrink-0 flex items-center justify-center rounded overflow-hidden">
                          {league.logo_url ? (
                            <Image src={league.logo_url} alt={league.name} width={20} height={20} className="object-contain" unoptimized />
                          ) : (
                            <span className="text-xs">⚽</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0 text-left">
                          <div className={clsx("text-sm truncate transition-colors", league.is_top_league ? "font-bold text-[#19E66B]" : "font-medium text-white/80 group-hover:text-white")}>
                            {league.name}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* ── SPORTS SECTION ── */}
        <div>
          <button
            onClick={() => setExpandedSection(expandedSection === 'sports' ? null : 'sports')}
            className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#19E66B' }}>
                <svg viewBox="0 0 24 24" className="w-5 h-5 text-[#072414]" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M12 8l1.5 3H17l-2.5 2 1 3.5L12 14.5l-3.5 2 1-3.5L7 11h3.5z" fill="currentColor" opacity="0.5"/>
                </svg>
              </div>
              <span className="font-bold text-white">Sports</span>
            </div>
            <svg viewBox="0 0 24 24" className={clsx('w-5 h-5 text-white/50 transition-transform', expandedSection === 'sports' ? 'rotate-180' : '')} fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>

          {expandedSection === 'sports' && (
            <div className="pt-1">
              {sportsList.map(sport => (
                <button
                  key={sport.slug}
                  onClick={() => { onSelectSport(sport.slug); onClose(); }}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors group rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    <span className="text-xl">{sport.emoji}</span>
                    <span className="text-sm font-medium text-white/90 group-hover:text-white">{sport.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {sport.count > 0 && (
                      <span className="text-xs font-semibold text-white/40">{sport.count}</span>
                    )}
                    <svg viewBox="0 0 24 24" className="w-4 h-4 text-white/20 group-hover:text-white/50" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="9 18 15 12 9 6"/>
                    </svg>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
