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
  onTimeRangeChange?: (range: number) => void;
  timeRange?: number;
  activeTab?: 'prematch' | 'live';
  onTabChange?: (tab: 'prematch' | 'live') => void;
  onOpenSidebar?: () => void;
}

export function SportsNav({ 
  onSportChange, 
  activeSport = 'football',
  onTimeRangeChange,
  timeRange = 6,
  activeTab = 'prematch',
  onTabChange,
  onOpenSidebar
}: SportNavProps) {
  const handleSelect = (key: string) => {
    onSportChange?.(key);
  };

  const handleSliderClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, x / rect.width));
    const step = Math.round(percentage * 6);
    onTimeRangeChange?.(step);
  };

  const getLabel = () => {
    if (timeRange === 0) return 'Today\nEvents';
    if (timeRange === 6) return 'All\nEvents';
    return `${timeRange + 1} Days\nEvents`;
  };

  const isLive = activeTab === 'live';

  return (
    <section style={{ background: '#0D1913' }} className="border-b border-brand pb-2">
      {/* Sports horizontal scroll */}
      <div className="flex overflow-x-auto gap-1 px-2 pt-3 pb-2" style={{ scrollbarWidth: 'none' }}>
        {SPORTS.map((sport) => {
          const isActive = activeSport === sport.key;
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
      <div className="flex gap-2 px-3 pb-4 pt-1">
        <button
          onClick={() => {
            onTabChange?.('prematch');
            onOpenSidebar?.();
          }}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-colors"
          style={{ background: !isLive ? '#19E66B22' : '#132012', border: `1px solid ${!isLive ? '#19E66B55' : '#1C3026'}`, color: !isLive ? '#19E66B' : '#8D9B94' }}
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
            <rect x="3" y="5" width="7" height="2"/><rect x="3" y="10" width="10" height="2"/><rect x="3" y="15" width="8" height="2"/>
          </svg>
          All Sports
        </button>
        <button
          onClick={() => onTabChange?.(isLive ? 'prematch' : 'live')}
          className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-colors"
          style={{ background: isLive ? '#19E66B22' : '#132012', border: `1px solid ${isLive ? '#19E66B55' : '#1C3026'}`, color: isLive ? '#19E66B' : '#8D9B94' }}
        >
          {isLive ? 'Open Prematch' : 'Open Live'}
        </button>
        <Link
          href="/sports"
          className="flex items-center justify-center w-10 h-10 rounded-lg shrink-0"
          style={{ background: '#132012', border: '1px solid #1C3026' }}
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4 text-muted" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
        </Link>
      </div>

      {/* VikingBet Style Time Tracker / Slider */}
      <div className="flex items-center gap-4 px-3 mb-1">
        <div className="text-[11px] leading-[1.1] text-white font-medium whitespace-pre-wrap min-w-[40px]">
          {getLabel()}
        </div>
        <div 
          className="flex-1 relative h-6 flex items-center cursor-pointer select-none"
          onClick={handleSliderClick}
        >
          {/* Segmented Track */}
          <div className="absolute inset-x-0 h-1.5 flex gap-1 items-center">
            {[0, 1, 2, 3, 4, 5, 6].map((i) => (
              <div 
                key={i} 
                className={`flex-1 h-full rounded-full transition-colors duration-300 ${i <= timeRange ? 'bg-gray-300' : 'bg-gray-700'}`} 
              />
            ))}
          </div>
          {/* Thumb */}
          <div 
            className="absolute h-5 w-5 rounded-full bg-gray-200 shadow-md transition-all duration-300 pointer-events-none"
            style={{ 
              left: `calc(${(timeRange / 6) * 100}% - ${(timeRange / 6) * 20}px)`, 
            }}
          />
        </div>
      </div>
    </section>
  );
}
