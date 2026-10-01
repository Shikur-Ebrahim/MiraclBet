'use client';

import React from 'react';

const SPORTS = [
  { key: 'football',   label: 'Football',  icon: '⚽' },
  { key: 'hockey',     label: 'Hockey',    icon: '🏒' },
  { key: 'tennis',     label: 'Tennis',    icon: '🎾' },
  { key: 'basketball', label: 'Basketball',icon: '🏀' },
  { key: 'baseball',   label: 'Baseball',  icon: '⚾' },
  { key: 'volleyball', label: 'Volleyball',icon: '🏐' },
  { key: 'rugby',      label: 'Rugby',     icon: '🏉' },
  { key: 'handball',   label: 'Handball',  icon: '🤾' },
  { key: 'mma',        label: 'MMA',       icon: '🥊' },
  { key: 'nba',        label: 'NBA',       icon: '🏀' },
  { key: 'nfl',        label: 'NFL',       icon: '🏈' },
  { key: 'formula-1',  label: 'Formula 1', icon: '🏎️' },
];

interface SportNavProps {
  onSportChange?: (sport: string) => void;
  activeSport?: string;
  onTimeRangeChange?: (range: number) => void;
  timeRange?: number;
  activeTab?: 'prematch' | 'live';
  onTabChange?: (tab: 'prematch' | 'live') => void;
  onOpenSidebar?: () => void;
  onOpenSearch?: () => void;
  onSearchChange?: (q: string) => void;
  searchQuery?: string;
}

export function SportsNav({ 
  onSportChange, 
  activeSport = 'football',
  onTimeRangeChange,
  timeRange = 6,
  activeTab = 'prematch',
  onTabChange,
  onOpenSidebar,
  onSearchChange,
  searchQuery = '',
}: SportNavProps) {
  const handleSelect = (key: string) => {
    onSportChange?.(key);
  };


  const isLive = activeTab === 'live';

  return (
    <section style={{ background: '#0D1913' }} className="border-b border-brand pb-2">
      {/* Sports horizontal scroll — compact pill style */}
      <div className="flex overflow-x-auto gap-1.5 px-3 pt-3 pb-2" style={{ scrollbarWidth: 'none' }}>
        {SPORTS.map((sport) => {
          const isActive = activeSport === sport.key;
          return (
            <button
              key={sport.key}
              onClick={() => handleSelect(sport.key)}
              className="flex items-center gap-1.5 shrink-0 px-3 py-1.5 rounded-full text-[13px] font-bold transition-all whitespace-nowrap"
              style={{
                background: isActive ? '#19E66B' : '#0D2018',
                color: isActive ? '#032107' : '#8D9B94',
                border: isActive ? '1.5px solid #19E66B' : '1.5px solid #1C3026',
              }}
            >
              <span className="text-base leading-none">{sport.icon}</span>
              <span>{sport.label}</span>
            </button>
          );
        })}
      </div>

      {/* All Sports | Open Live buttons */}
      <div className="flex gap-2 px-3 pb-4 pt-1">
        {/* All Sports — always green */}
        <button
          onClick={() => {
            onTabChange?.('prematch');
            onOpenSidebar?.();
          }}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-colors md:hidden"
          style={{ background: '#19E66B22', border: '1px solid #19E66B55', color: '#19E66B' }}
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
            <rect x="3" y="5" width="7" height="2"/><rect x="3" y="10" width="10" height="2"/><rect x="3" y="15" width="8" height="2"/>
          </svg>
          All Sports
        </button>

        {/* Open Live / Open Prematch — always dark, red pulse when live */}
        <button
          onClick={() => onTabChange?.(isLive ? 'prematch' : 'live')}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-semibold transition-colors"
          style={{ background: '#132012', border: '1px solid #1C3026', color: isLive ? '#FF4444' : '#8D9B94' }}
        >
          {isLive && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shrink-0"/>}
          {isLive ? 'Open Prematch' : 'Open Live'}
        </button>

      </div>

      {/* ── Search Bar (real input — type to filter inline) ────────── */}
      <div
        className="mx-3 mb-3 flex items-center gap-3 px-4 py-2.5 rounded-xl"
        style={{ background: '#0D2018', border: '1px solid #1C3026' }}
      >
        <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0" fill="none" stroke="#19E66B" strokeWidth="2.5">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
        <input
          type="text"
          value={searchQuery}
          onChange={e => onSearchChange?.(e.target.value)}
          placeholder="Search teams, leagues…"
          className="flex-1 bg-transparent text-sm outline-none placeholder-[#4A7C63]"
          style={{ color: '#B8D8C8' }}
        />
        {searchQuery ? (
          <button onClick={() => onSearchChange?.('')} className="shrink-0">
            <svg viewBox="0 0 24 24" style={{width:14,height:14}} fill="none" stroke="#4A7C63" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        ) : (
          <span className="ml-auto flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold shrink-0" style={{ background: '#19E66B22', color: '#19E66B' }}>
            SEARCH
          </span>
        )}
      </div>

    </section>
  );
}
