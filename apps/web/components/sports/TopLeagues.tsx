'use client';

import React, { useState } from 'react';
import Link from 'next/link';

const SPORTS = [
  {
    key: 'football', label: 'Football',
    icon: (
      <svg viewBox="0 0 24 24" className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="12" cy="12" r="10"/>
        <path d="M12 7l1.5 3.5H17l-2.5 2 1 3.5L12 14l-3.5 2 1-3.5L7 10.5h3.5z" fill="currentColor" opacity="0.5"/>
      </svg>
    ),
  },
  {
    key: 'hockey', label: 'Hockey',
    icon: (
      <svg viewBox="0 0 24 24" className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="1.5">
        <ellipse cx="12" cy="18" rx="8" ry="3"/>
        <path d="M4 10c0-2 1.5-4 3.5-5l1 3 3 2 3-2 1-3c2 1 3.5 3 3.5 5" />
        <circle cx="12" cy="7" r="3"/>
      </svg>
    ),
  },
  {
    key: 'tennis', label: 'Tennis',
    icon: (
      <svg viewBox="0 0 24 24" className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="12" cy="12" r="10"/>
        <path d="M12 2c0 5.5 5 10 0 20M12 2c0 5.5-5 10 0 20" />
      </svg>
    ),
  },
  {
    key: 'basketball', label: 'Basketball',
    icon: (
      <svg viewBox="0 0 24 24" className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="12" cy="12" r="10"/>
        <path d="M12 2v20M2 12h20M5 5c2 2 2 5 0 7M19 5c-2 2-2 5 0 7M5 19c2-2 2-5 0-7M19 19c-2-2-2-5 0-7"/>
      </svg>
    ),
  },
  {
    key: 'baseball', label: 'Baseball',
    icon: (
      <svg viewBox="0 0 24 24" className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="12" cy="12" r="10"/>
        <path d="M7 4.5c2 2 2 5 2 7.5s0 5.5-2 7.5M17 4.5c-2 2-2 5-2 7.5s0 5.5 2 7.5"/>
      </svg>
    ),
  },
  {
    key: 'volleyball', label: 'Volleyball',
    icon: (
      <svg viewBox="0 0 24 24" className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="12" cy="12" r="10"/>
        <path d="M12 2c3 4 3 8 0 12M12 2c-3 4-3 8 0 12M12 14c4 2 6 4 6 6M12 14c-4 2-6 4-6 6M2 12h8M22 12h-8"/>
      </svg>
    ),
  },
  {
    key: 'rugby', label: 'Rugby',
    icon: (
      <svg viewBox="0 0 24 24" className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="1.5">
        <ellipse cx="12" cy="12" rx="6" ry="10"/>
        <path d="M12 2v20M6.5 6.5l11 11M17.5 6.5l-11 11"/>
      </svg>
    ),
  },
  {
    key: 'handball', label: 'Handball',
    icon: (
      <svg viewBox="0 0 24 24" className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="12" cy="12" r="10"/>
        <path d="M8 12c0-2 4-6 8-4M8 12c2 4 6 5 8 4"/>
      </svg>
    ),
  },
  {
    key: 'mma', label: 'MMA',
    icon: (
      <svg viewBox="0 0 24 24" className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M4 18l4-4 4 2 4-6 4-2M8 6l2 4"/>
        <circle cx="12" cy="6" r="2"/>
      </svg>
    ),
  },
  {
    key: 'nba', label: 'NBA',
    icon: (
      <svg viewBox="0 0 24 24" className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="12" cy="12" r="10"/>
        <path d="M12 2v20M7 4c0 4 5 4 5 8s-5 4-5 8M17 4c0 4-5 4-5 8s5 4 5 8"/>
      </svg>
    ),
  },
  {
    key: 'nfl', label: 'NFL',
    icon: (
      <svg viewBox="0 0 24 24" className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="1.5">
        <ellipse cx="12" cy="12" rx="5" ry="9"/>
        <path d="M12 3v18M7.5 7.5l9 9M16.5 7.5l-9 9"/>
      </svg>
    ),
  },
  {
    key: 'formula-1', label: 'Formula 1',
    icon: (
      <svg viewBox="0 0 24 24" className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M3 14h2l2-6h10l2 6h2M7 14v3M17 14v3"/>
        <circle cx="8" cy="17" r="1.5"/>
        <circle cx="16" cy="17" r="1.5"/>
        <path d="M9 8h6"/>
      </svg>
    ),
  },
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
              <div className={isActive ? 'text-primary' : 'text-muted'}>
                {sport.icon}
              </div>
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
