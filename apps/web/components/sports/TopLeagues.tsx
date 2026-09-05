'use client';

import React, { useState } from 'react';
import Link from 'next/link';

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
}

export function SportsNav({ onSportChange, activeSport = 'football' }: SportNavProps) {
  const [selected, setSelected] = useState(activeSport);
  const [showLive, setShowLive] = useState(false);

  const handleSelect = (key: string) => {
    setSelected(key);
    onSportChange?.(key);
  };

  return (
    <section style={{ background: '#0D1913' }} className="border-b border-brand">
      {/* Sports horizontal scroll */}
      <div className="flex overflow-x-auto gap-1 px-2 pt-3 pb-2" style={{ scrollbarWidth: 'none' }}>
        {SPORTS.map((sport) => {
          const isActive = selected === sport.key;
          return (
            <button
              key={sport.key}
              onClick={() => handleSelect(sport.key)}
              className="flex flex-col items-center gap-1.5 min-w-[72px] px-2 py-2 rounded-xl transition-all"
              style={{
                background: isActive ? '#19E66B18' : 'transparent',
                borderBottom: isActive ? '2px solid #19E66B' : '2px solid transparent',
              }}
            >
              <span className="text-3xl leading-none">{sport.icon}</span>
              <span className={`text-xs font-semibold whitespace-nowrap ${isActive ? 'text-primary' : 'text-muted'}`}>
                {sport.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* All Sports | Open Live buttons */}
      <div className="flex gap-2 px-3 pb-3 pt-1">
        <button
          onClick={() => setShowLive(false)}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-colors"
          style={{ background: !showLive ? '#19E66B22' : '#132012', border: `1px solid ${!showLive ? '#19E66B55' : '#1C3026'}`, color: !showLive ? '#19E66B' : '#8D9B94' }}
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
            <rect x="3" y="5" width="7" height="2"/><rect x="3" y="10" width="10" height="2"/><rect x="3" y="15" width="8" height="2"/>
          </svg>
          All Sports
        </button>
        <button
          onClick={() => setShowLive(true)}
          className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-colors"
          style={{ background: showLive ? '#19E66B22' : '#132012', border: `1px solid ${showLive ? '#19E66B55' : '#1C3026'}`, color: showLive ? '#19E66B' : '#8D9B94' }}
        >
          Open Live
        </button>
        <Link
          href="/sports"
          className="flex items-center justify-center w-10 h-10 rounded-lg"
          style={{ background: '#132012', border: '1px solid #1C3026' }}
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4 text-muted" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
        </Link>
      </div>
    </section>
  );
}
