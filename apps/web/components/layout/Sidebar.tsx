'use client';

import React, { useState, useEffect } from 'react';
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
  onSelectLeague: (leagueId: string) => void;
}

export function Sidebar({ isOpen, onClose, onSelectSport, onSelectLeague }: SidebarProps) {
  const [activeTab, setActiveTab] = useState<'prematch' | 'live'>('prematch');
  const [timeRange, setTimeRange] = useState(6);
  const [expandedSection, setExpandedSection] = useState<'leagues' | 'sports' | null>('leagues');

  const [topLeagues, setTopLeagues] = useState<LeagueInfo[]>([]);
  const [sportsList, setSportsList] = useState<SportInfo[]>([]);

  useEffect(() => {
    if (!isOpen) return;

    const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://api.miraclbet.com:8443';

    // Fetch dynamic top leagues
    fetch(`${API_BASE}/api/v1/meta/leagues/top`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setTopLeagues(data);
      })
      .catch(console.error);

    // Fetch dynamic sports with counts
    fetch(`${API_BASE}/api/v1/meta/sports`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setSportsList(data);
      })
      .catch(console.error);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      {/* Sidebar Panel - Full screen on mobile */}
      <div 
        className="fixed inset-0 z-50 overflow-y-auto shadow-2xl transition-transform"
        style={{ background: '#072414' }} // VikingBet dark green
      >
        <div className="p-4">
          {/* Header row (Logo + Close) */}
          <div className="flex items-center justify-between mb-6">
            <div className="text-2xl font-bold tracking-tight">
              <span className="text-white">Miracl</span>
              <span className="text-primary">Bet</span>
            </div>
            <button onClick={onClose} className="p-2 text-white hover:bg-white/10 rounded-full">
              <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Prematch / Live Toggle */}
          <div className="flex bg-[#0A361E] rounded-xl p-1 mb-6">
            <button
              onClick={() => setActiveTab('prematch')}
              className={clsx(
                "flex-1 py-2 text-sm font-bold rounded-lg transition-colors",
                activeTab === 'prematch' ? "bg-[#19E66B] text-[#072414]" : "text-white/70 hover:text-white"
              )}
            >
              Prematch
            </button>
            <button
              onClick={() => setActiveTab('live')}
              className={clsx(
                "flex-1 flex items-center justify-center gap-2 py-2 text-sm font-bold rounded-lg transition-colors",
                activeTab === 'live' ? "bg-[#19E66B] text-[#072414]" : "text-white/70 hover:text-white"
              )}
            >
              Live
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>

          {/* Time Slider (No gear icon) */}
          <div className="flex items-center gap-4 mb-6 pr-2">
            <div className="text-[11px] leading-[1.1] text-white font-medium whitespace-pre-wrap min-w-[40px]">
              {timeRange === 0 ? 'Today\nEvents' : timeRange === 6 ? 'All\nEvents' : `${timeRange + 1} Days\nEvents`}
            </div>
            <div 
              className="flex-1 relative h-6 flex items-center cursor-pointer select-none"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const percentage = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                setTimeRange(Math.round(percentage * 6));
              }}
            >
              <div className="absolute inset-x-0 h-1 flex gap-1 items-center">
                {[0, 1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className={`flex-1 h-full rounded-full ${i <= timeRange ? 'bg-gray-300' : 'bg-gray-600'}`} />
                ))}
              </div>
              <div 
                className="absolute h-5 w-5 rounded-full bg-gray-200 shadow-md transition-all duration-300 pointer-events-none"
                style={{ left: `calc(${(timeRange / 6) * 100}% - ${(timeRange / 6) * 20}px)` }}
              />
            </div>
          </div>

          {/* Search */}
          <div className="relative mb-6">
            <svg viewBox="0 0 24 24" className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-white/50" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
            </svg>
            <input 
              type="text" 
              placeholder="Search" 
              className="w-full bg-[#0A361E] text-white placeholder-white/50 rounded-xl py-3 pl-10 pr-4 outline-none focus:ring-1 focus:ring-[#19E66B]"
            />
          </div>

          {/* Top Leagues Accordion */}
          <div className="mb-2">
            <button 
              onClick={() => setExpandedSection(expandedSection === 'leagues' ? null : 'leagues')}
              className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#19E66B] flex items-center justify-center text-[#072414]">
                  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                  </svg>
                </div>
                <span className="font-semibold text-white">Top Leagues</span>
              </div>
              <svg viewBox="0 0 24 24" className={clsx("w-5 h-5 text-white/70 transition-transform", expandedSection === 'leagues' ? "rotate-180" : "")} fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </button>
            
            {expandedSection === 'leagues' && (
              <div className="pt-2 pb-4">
                {topLeagues.length === 0 ? (
                  <div className="text-center text-sm text-white/50 py-4">No top leagues found</div>
                ) : topLeagues.map((league) => (
                  <button
                    key={league.id}
                    onClick={() => { onSelectLeague(league.id); onClose(); }}
                    className="w-full flex items-center gap-4 px-4 py-3 hover:bg-white/5 transition-colors group"
                  >
                    {league.logo_url ? (
                      <Image
                        src={league.logo_url}
                        alt={league.name}
                        width={24}
                        height={24}
                        className="object-contain opacity-90 group-hover:opacity-100 shrink-0"
                        unoptimized
                      />
                    ) : (
                      <span className="text-lg shrink-0">⚽</span>
                    )}
                    <div className="flex flex-col items-start min-w-0">
                      <span className="text-sm font-medium text-white/90 group-hover:text-white truncate w-full">
                        {league.country && league.country !== 'World' ? `${league.country}. ` : ''}{league.name}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Sports Accordion */}
          <div>
            <button 
              onClick={() => setExpandedSection(expandedSection === 'sports' ? null : 'sports')}
              className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#19E66B] flex items-center justify-center text-[#072414]">
                  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
                    <path d="M21.5 2h-19C1.1 2 .1 3.1.1 4.5v13c0 1.4 1 2.5 2.4 2.5h19c1.4 0 2.4-1.1 2.4-2.5v-13C23.9 3.1 22.9 2 21.5 2zM12 18c-3.3 0-6-2.7-6-6s2.7-6 6-6 6 2.7 6 6-2.7 6-6 6z"/>
                  </svg>
                </div>
                <span className="font-semibold text-white">Sports</span>
              </div>
              <svg viewBox="0 0 24 24" className={clsx("w-5 h-5 text-white/70 transition-transform", expandedSection === 'sports' ? "rotate-180" : "")} fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </button>
            
            {expandedSection === 'sports' && (
              <div className="pt-2 pb-20">
                {sportsList.map((sport) => (
                  <button
                    key={sport.slug}
                    onClick={() => { onSelectSport(sport.slug); onClose(); }}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors group"
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-xl">{sport.emoji}</span>
                      <span className="text-sm font-medium text-white/90 group-hover:text-white">{sport.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      {sport.count > 0 && (
                        <span className="text-xs font-semibold text-white/50">{sport.count}</span>
                      )}
                      <svg viewBox="0 0 24 24" className="w-4 h-4 text-white/30 group-hover:text-white/70" fill="none" stroke="currentColor" strokeWidth="2">
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
    </>
  );
}
