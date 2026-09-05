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
}

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSport: (sport: string) => void;
  onSelectLeague: (leagueId: string, leagueName: string) => void;
}

export function Sidebar({ isOpen, onClose, onSelectSport, onSelectLeague }: SidebarProps) {
  const [activeTab, setActiveTab] = useState<'prematch' | 'live'>('prematch');
  const [timeRange, setTimeRange] = useState(6);
  const [expandedSection, setExpandedSection] = useState<'leagues' | 'sports' | null>('leagues');
  const [expandedCountries, setExpandedCountries] = useState<Set<string>>(new Set(['World', 'England', 'Spain', 'Germany', 'Italy', 'France']));
  const [searchQuery, setSearchQuery] = useState('');
  const [countryFilter, setCountryFilter] = useState<string>('All');

  const [topLeagues, setTopLeagues] = useState<LeagueInfo[]>([]);
  const [sportsList, setSportsList] = useState<SportInfo[]>([]);

  useEffect(() => {
    if (!isOpen) return;
    const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://api.miraclbet.com:8443';

    fetch(`${API_BASE}/api/v1/meta/leagues/top`)
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setTopLeagues(data); })
      .catch(console.error);

    fetch(`${API_BASE}/api/v1/meta/sports`)
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setSportsList(data); })
      .catch(console.error);
  }, [isOpen]);

  // Unique sorted countries
  const allCountries = useMemo(() => {
    const countries = [...new Set(topLeagues.map(l => l.country || 'World'))].sort();
    return ['All', ...countries];
  }, [topLeagues]);

  // Filter leagues by search + country
  const filteredLeagues = useMemo(() => {
    return topLeagues.filter(l => {
      const matchesSearch = !searchQuery ||
        l.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.country.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCountry = countryFilter === 'All' || l.country === countryFilter;
      return matchesSearch && matchesCountry;
    });
  }, [topLeagues, searchQuery, countryFilter]);

  // Group filtered leagues by country
  const groupedLeagues = useMemo(() => {
    const groups: Record<string, LeagueInfo[]> = {};
    for (const league of filteredLeagues) {
      const country = league.country || 'World';
      if (!groups[country]) groups[country] = [];
      groups[country].push(league);
    }
    return Object.entries(groups).sort(([a], [b]) => {
      // World first, then alphabetical
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
    <div
      className="fixed inset-0 z-50 overflow-y-auto"
      style={{ background: '#072414' }}
    >
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
              className={clsx(
                'flex-1 py-2.5 text-sm font-bold rounded-lg capitalize transition-colors',
                activeTab === tab ? 'text-[#072414]' : 'text-white/60 hover:text-white'
              )}
              style={activeTab === tab ? { background: '#19E66B' } : {}}
            >
              {tab === 'live' ? (
                <span className="flex items-center justify-center gap-1.5">
                  Live <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
                </span>
              ) : 'Prematch'}
            </button>
          ))}
        </div>

        {/* Time Slider */}
        <div className="flex items-center gap-3 mb-5">
          <div className="text-[11px] leading-tight text-white font-medium min-w-[44px]">
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
            className="w-full py-3 pl-10 pr-4 rounded-xl text-sm text-white placeholder-white/40 outline-none focus:ring-1"
            style={{ background: '#0A361E', focusRingColor: '#19E66B' }}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white">
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          )}
        </div>

        {/* ── TOP LEAGUES SECTION ── */}
        <div className="mb-3">
          <button
            onClick={() => setExpandedSection(expandedSection === 'leagues' ? null : 'leagues')}
            className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#19E66B' }}>
                <svg viewBox="0 0 24 24" className="w-5 h-5 text-[#072414]" fill="currentColor">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </svg>
              </div>
              <span className="font-bold text-white">Top Leagues</span>
              <span className="text-xs text-white/40 font-normal">({filteredLeagues.length})</span>
            </div>
            <svg viewBox="0 0 24 24" className={clsx('w-5 h-5 text-white/50 transition-transform', expandedSection === 'leagues' ? 'rotate-180' : '')} fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>

          {expandedSection === 'leagues' && (
            <div className="mt-1">
              {/* Country Filter Pills */}
              <div className="flex gap-2 overflow-x-auto pb-2 mb-3 px-1" style={{ scrollbarWidth: 'none' }}>
                {allCountries.map(country => (
                  <button
                    key={country}
                    onClick={() => setCountryFilter(country)}
                    className={clsx(
                      'whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-colors',
                      countryFilter === country
                        ? 'text-[#072414]'
                        : 'text-white/60 hover:text-white'
                    )}
                    style={countryFilter === country ? { background: '#19E66B' } : { background: '#0A361E' }}
                  >
                    {country}
                  </button>
                ))}
              </div>

              {/* Leagues grouped by country */}
              {groupedLeagues.length === 0 ? (
                <div className="text-center text-sm text-white/40 py-6">No leagues found</div>
              ) : (
                groupedLeagues.map(([country, leagues]) => (
                  <div key={country} className="mb-1">
                    {/* Country header row */}
                    <button
                      onClick={() => toggleCountry(country)}
                      className="w-full flex items-center justify-between px-3 py-2 hover:bg-white/5 rounded-lg transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white/50 uppercase tracking-wider">{country}</span>
                        <span className="text-[10px] text-white/30">({leagues.length})</span>
                      </div>
                      <svg
                        viewBox="0 0 24 24"
                        className={clsx('w-3.5 h-3.5 text-white/30 transition-transform', expandedCountries.has(country) ? 'rotate-180' : '')}
                        fill="none" stroke="currentColor" strokeWidth="2"
                      >
                        <polyline points="6 9 12 15 18 9"/>
                      </svg>
                    </button>

                    {/* League rows inside country */}
                    {expandedCountries.has(country) && leagues.map(league => (
                      <button
                        key={league.id}
                        onClick={() => { onSelectLeague(league.id, league.name); onClose(); }}
                        className="w-full flex items-center gap-3 pl-6 pr-3 py-2.5 hover:bg-white/5 transition-colors group rounded-lg"
                      >
                        <div className="w-6 h-6 shrink-0 flex items-center justify-center">
                          {league.logo_url ? (
                            <Image src={league.logo_url} alt={league.name} width={24} height={24} className="object-contain" unoptimized />
                          ) : (
                            <span className="text-sm">⚽</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0 text-left">
                          <div className="text-sm font-medium text-white/90 group-hover:text-white truncate">{league.name}</div>
                          <div className="text-[11px] text-white/40">{league.country}{league.season ? ` · ${league.season}` : ''}</div>
                        </div>
                        <svg viewBox="0 0 24 24" className="w-4 h-4 text-white/20 group-hover:text-white/50 shrink-0" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="9 18 15 12 9 6"/>
                        </svg>
                      </button>
                    ))}
                  </div>
                ))
              )}
            </div>
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
                <svg viewBox="0 0 24 24" className="w-5 h-5 text-[#072414]" fill="currentColor">
                  <circle cx="12" cy="12" r="10"/>
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
