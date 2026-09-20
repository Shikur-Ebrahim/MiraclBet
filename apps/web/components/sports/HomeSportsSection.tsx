'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { FixtureTabs } from '@/components/sports/FixtureTabs';
import { SportsNav } from '@/components/sports/TopLeagues';
import { Sidebar } from '@/components/layout/Sidebar';
import { SearchOverlay } from '@/components/sports/SearchOverlay';

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

interface CountryItem { country: string; flag?: string; }

export function HomeSportsSection() {
  const [activeSport, setActiveSport] = useState('football');
  const [activeTab, setActiveTab] = useState<'prematch' | 'live'>('prematch');
  const [timeRange, setTimeRange] = useState(6); // full bar default
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Day filter
  const days = buildDays();
  const [selectedDay, setSelectedDay] = useState(days[0]);
  const [openDropdown, setOpenDropdown] = useState<'days' | 'countries' | null>(null);

  // Countries — derived from actual loaded fixtures via callback
  const [allCountries, setAllCountries] = useState<CountryItem[]>([]);
  const [selectedCountry, setSelectedCountry] = useState<CountryItem | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node))
        setOpenDropdown(null);
    };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  // Receive countries from FixtureTabs whenever it loads fixtures
  const handleFixturesLoaded = useCallback((list: CountryItem[]) => {
    setAllCountries(list);
  }, []);

  const handleDaySelect = (day: typeof days[0]) => {
    setSelectedDay(day);
    setSelectedCountry(null);
    setOpenDropdown(null);
  };

  const clearCountry = () => {
    setSelectedCountry(null);
  };

  return (
    <div>
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onSelectSport={s => { setActiveSport(s); setSelectedCountry(null); }}
        onSelectLeague={() => { setActiveSport('football'); setSelectedCountry(null); }}
      />
      <SearchOverlay isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />

      <SportsNav
        activeSport={activeSport}
        onSportChange={s => { setActiveSport(s); setSelectedCountry(null); }}
        timeRange={timeRange}
        onTimeRangeChange={setTimeRange}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onOpenSidebar={() => setIsSidebarOpen(true)}
        onOpenSearch={() => setIsSearchOpen(true)}
      />

      {/* ── Filter Bar: Day + Countries ───────────────────────────────── */}
      <div className="relative z-30" ref={dropdownRef}>
        <div className="flex items-center gap-2 px-3 py-2.5 border-b border-gray-100 bg-white">

          {/* 📅 DAY button */}
          <button
            onClick={() => setOpenDropdown(p => p === 'days' ? null : 'days')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[12px] font-bold transition-all ${
              openDropdown === 'days'
                ? 'bg-gray-200 text-gray-800'
                : !selectedCountry
                ? 'bg-[#19E66B] text-white'
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            <span className="truncate">{selectedDay.short}</span>
            <svg viewBox="0 0 24 24" className={`w-3 h-3 shrink-0 transition-transform ${openDropdown === 'days' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>

          {/* 🌍 COUNTRIES button */}
          <button
            onClick={() => setOpenDropdown(p => p === 'countries' ? null : 'countries')}
            className={`flex-[2] flex items-center justify-center gap-1.5 py-2 rounded-lg text-[12px] font-bold transition-all ${
              openDropdown === 'countries'
                ? 'bg-gray-200 text-gray-800'
                : selectedCountry
                ? 'bg-[#19E66B] text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {selectedCountry?.flag ? (
              <Image src={selectedCountry.flag} alt="" width={18} height={12} className="object-cover rounded-sm shrink-0 border border-white/30" unoptimized />
            ) : (
              <span className="text-sm shrink-0">🌍</span>
            )}
            <span className="truncate max-w-[90px]">
              {selectedCountry ? selectedCountry.country : 'All Countries'}
            </span>
            <svg viewBox="0 0 24 24" className={`w-3 h-3 shrink-0 transition-transform ${openDropdown === 'countries' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>

          {/* ✕ Clear country */}
          {selectedCountry && (
            <button
              onClick={clearCountry}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 hover:bg-gray-200 shrink-0"
            >
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          )}
        </div>

        {/* ── Day Dropdown ──────────────────────────────────────────── */}
        {openDropdown === 'days' && (
          <div className="absolute left-0 right-0 top-full bg-white border border-gray-200 shadow-xl z-40">
            {days.map((day, i) => (
              <button
                key={day.value}
                onClick={() => handleDaySelect(day)}
                className={`w-full flex items-center justify-between px-4 py-3 text-sm border-b border-gray-50 ${
                  selectedDay.value === day.value
                    ? 'bg-[#E8FFF2] text-[#0D8A3C] font-bold'
                    : 'text-gray-700 hover:bg-gray-50'
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

        {/* ── Countries Dropdown — from actual fixture data ─────────── */}
        {openDropdown === 'countries' && (
          <div className="absolute left-0 right-0 top-full bg-white border border-gray-200 shadow-xl max-h-80 overflow-y-auto z-40">

            {/* "All Countries" option to reset */}
            <button
              onClick={() => { setSelectedCountry(null); setOpenDropdown(null); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 border-b border-gray-100 ${
                !selectedCountry ? 'bg-[#E8FFF2] text-[#0D8A3C] font-bold' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <span className="text-base">🌍</span>
              <span className="text-sm font-medium">All Countries</span>
              {!selectedCountry && (
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-[#19E66B] ml-auto" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              )}
            </button>

            {allCountries.length === 0 ? (
              <div className="flex items-center justify-center py-8 gap-2">
                <div className="w-4 h-4 border-2 border-[#19E66B] border-t-transparent rounded-full animate-spin" />
                <span className="text-sm text-gray-400">Loading countries...</span>
              </div>
            ) : (
              allCountries.map(c => (
                <button
                  key={c.country}
                  onClick={() => { setSelectedCountry(c); setOpenDropdown(null); }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 border-b border-gray-50 ${
                    selectedCountry?.country === c.country
                      ? 'bg-[#E8FFF2] text-[#0D8A3C]'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {c.flag ? (
                    <Image
                      src={c.flag}
                      alt={c.country}
                      width={24}
                      height={16}
                      className="object-cover rounded-sm shrink-0 border border-gray-200"
                      unoptimized
                    />
                  ) : (
                    <span className="text-base shrink-0">🌍</span>
                  )}
                  <span className="text-sm font-medium flex-1 text-left">{c.country}</span>
                  {selectedCountry?.country === c.country && (
                    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-[#19E66B] shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  )}
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {/* Active filter chip */}
      {selectedCountry && (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-[#F0FDF4] border-b border-[#BBF7D0]">
          <span className="flex items-center gap-1.5 px-2 py-0.5 bg-[#DCFCE7] text-[#16A34A] text-[11px] font-semibold rounded-full">
            {selectedCountry.flag ? (
              <Image src={selectedCountry.flag} alt="" width={12} height={8} className="object-cover rounded-sm" unoptimized />
            ) : '🌍'}
            {selectedCountry.country}
            <button onClick={clearCountry}>
              <svg viewBox="0 0 24 24" className="w-2.5 h-2.5" fill="none" stroke="currentColor" strokeWidth="3">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          </span>
          <button onClick={clearCountry} className="ml-auto text-[11px] text-gray-400 hover:text-gray-600">
            Clear
          </button>
        </div>
      )}

      {/* Match list */}
      <section>
        <FixtureTabs
          sport={activeSport}
          timeRange={timeRange}
          activeTab={activeTab}
          priorityDate={selectedDay.value}
          filterCountry={selectedCountry?.country ?? undefined}
          onFixturesLoaded={handleFixturesLoaded}
        />
      </section>
    </div>
  );
}
