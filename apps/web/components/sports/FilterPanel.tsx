'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { clsx } from 'clsx';

// ─── Types ───────────────────────────────────────────────────
export interface FilterState {
  date: string | null;     // "2026-09-05" or null (= use timeRange / all)
  country: string | null;
  leagueId: string | null;
  leagueName: string | null;
}

interface LeagueInfo {
  id: string;
  name: string;
  country: string;
  country_flag_url?: string;
  logo_url: string;
}

// ─── Day helpers ──────────────────────────────────────────────
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
function getDayChips() {
  const today = new Date();
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const dateStr = d.toISOString().split('T')[0];
    const label = i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : DAY_NAMES[d.getDay()];
    const sub = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
    return { label, sub, dateStr };
  });
}

// ─── FilterPanel ──────────────────────────────────────────────
interface FilterPanelProps {
  isOpen: boolean;
  onClose: () => void;
  filter: FilterState;
  onApply: (f: FilterState) => void;
}

export function FilterPanel({ isOpen, onClose, filter, onApply }: FilterPanelProps) {
  const [local, setLocal] = useState<FilterState>(filter);
  const [leagues, setLeagues] = useState<LeagueInfo[]>([]);
  const [section, setSection] = useState<'days' | 'countries' | 'leagues'>('days');
  const [countrySearch, setCountrySearch] = useState('');
  const [leagueSearch, setLeagueSearch] = useState('');

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://api.miraclbet.com:8443';

  useEffect(() => {
    setLocal(filter);
  }, [filter, isOpen]);

  useEffect(() => {
    fetch(`${API_BASE}/api/v1/meta/leagues`)
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setLeagues(data); })
      .catch(() => {});
  }, [API_BASE]);

  const dayChips = getDayChips();

  // Unique countries
  const countries = Array.from(
    leagues.reduce((map, l) => {
      if (!map.has(l.country)) map.set(l.country, l.country_flag_url || '');
      return map;
    }, new Map<string, string>())
  ).sort((a, b) => a[0].localeCompare(b[0]));

  const filteredCountries = countries.filter(([name]) =>
    name.toLowerCase().includes(countrySearch.toLowerCase())
  );

  // Leagues for selected country (or all)
  const leagueList = local.country
    ? leagues.filter(l => l.country === local.country)
    : leagues;

  const filteredLeagues = leagueList.filter(l =>
    l.name.toLowerCase().includes(leagueSearch.toLowerCase())
  );

  const hasActive = local.date || local.country || local.leagueId;

  const handleApply = useCallback(() => {
    onApply(local);
    onClose();
  }, [local, onApply, onClose]);

  const handleClear = useCallback(() => {
    const cleared = { date: null, country: null, leagueId: null, leagueName: null };
    setLocal(cleared);
    onApply(cleared);
    onClose();
  }, [onApply, onClose]);

  return (
    <>
      {/* Backdrop */}
      <div
        className={clsx('fixed inset-0 z-50 bg-black/60 transition-opacity duration-300',
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        onClick={onClose}
      />

      {/* Bottom sheet */}
      <div
        className={clsx(
          'fixed left-0 right-0 bottom-0 z-50 rounded-t-2xl flex flex-col transition-transform duration-300',
          isOpen ? 'translate-y-0' : 'translate-y-full'
        )}
        style={{ background: '#0A1810', maxHeight: '90vh' }}
      >
        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-white/20"/>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 pb-3 pt-1 border-b border-white/10">
          <div className="flex items-center gap-2">
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="#19E66B" strokeWidth="2">
              <line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="11" y1="18" x2="13" y2="18"/>
            </svg>
            <span className="text-white font-bold text-lg">Advanced Filter</span>
            {hasActive && (
              <span className="bg-[#19E66B] text-[#072414] text-[10px] font-black px-1.5 py-0.5 rounded-full">
                {[local.date, local.country, local.leagueId].filter(Boolean).length}
              </span>
            )}
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-white/10 text-white/60 hover:text-white">
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        {/* Section tabs */}
        <div className="flex px-4 gap-2 py-3 border-b border-white/10 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          {([
            { key: 'days', label: '📅 Days', active: !!local.date },
            { key: 'countries', label: '🌍 Country', active: !!local.country },
            { key: 'leagues', label: '🏆 Leagues', active: !!local.leagueId },
          ] as const).map(({ key, label, active }) => (
            <button
              key={key}
              onClick={() => setSection(key)}
              className="shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-colors"
              style={section === key
                ? { background: '#19E66B', color: '#072414' }
                : active
                  ? { background: '#19E66B22', border: '1px solid #19E66B44', color: '#19E66B' }
                  : { background: '#0D2018', color: '#9CA3AF' }
              }
            >
              {label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 py-4">

          {/* ── DAYS ── */}
          {section === 'days' && (
            <div>
              <p className="text-white/50 text-xs mb-3 uppercase tracking-wider">Select a Day</p>
              <div className="grid grid-cols-2 gap-2">
                {dayChips.map(chip => {
                  const isSelected = local.date === chip.dateStr;
                  return (
                    <button
                      key={chip.dateStr}
                      onClick={() => setLocal(l => ({ ...l, date: isSelected ? null : chip.dateStr }))}
                      className="flex flex-col items-start px-4 py-3 rounded-xl font-semibold text-left transition-all"
                      style={isSelected
                        ? { background: '#19E66B', color: '#072414' }
                        : { background: '#0D2018', color: '#fff', border: '1px solid #1C3026' }
                      }
                    >
                      <span className="text-base font-bold">{chip.label}</span>
                      <span className="text-xs opacity-60">{chip.sub}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── COUNTRIES ── */}
          {section === 'countries' && (
            <div>
              <p className="text-white/50 text-xs mb-3 uppercase tracking-wider">Select a Country</p>
              {/* Country Search */}
              <div className="relative mb-3">
                <svg viewBox="0 0 24 24" className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/40" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
                </svg>
                <input
                  type="text"
                  placeholder="Search country..."
                  value={countrySearch}
                  onChange={e => setCountrySearch(e.target.value)}
                  className="w-full py-2.5 pl-9 pr-3 rounded-xl text-sm text-white placeholder-white/30 outline-none border border-transparent focus:border-[#19E66B]"
                  style={{ background: '#0D2018' }}
                />
              </div>
              <div className="space-y-1 max-h-72 overflow-y-auto">
                {filteredCountries.map(([name, flagUrl]) => {
                  const isSelected = local.country === name;
                  return (
                    <button
                      key={name}
                      onClick={() => setLocal(l => ({
                        ...l,
                        country: isSelected ? null : name,
                        leagueId: null,
                        leagueName: null,
                      }))}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left"
                      style={isSelected
                        ? { background: '#19E66B20', border: '1px solid #19E66B55' }
                        : { background: '#0D2018' }
                      }
                    >
                      <div className="w-7 h-5 shrink-0 flex items-center justify-center">
                        {flagUrl
                          ? <Image src={flagUrl} alt={name} width={28} height={20} unoptimized className="object-cover rounded-sm" />
                          : <span className="text-lg">🌐</span>
                        }
                      </div>
                      <span className={clsx('text-sm font-medium flex-1 truncate', isSelected ? 'text-[#19E66B]' : 'text-white/80')}>
                        {name}
                      </span>
                      {isSelected && (
                        <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0 text-[#19E66B]" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── LEAGUES ── */}
          {section === 'leagues' && (
            <div>
              <p className="text-white/50 text-xs mb-3 uppercase tracking-wider">
                {local.country ? `Leagues in ${local.country}` : 'All Leagues'}
              </p>
              {/* League Search */}
              <div className="relative mb-3">
                <svg viewBox="0 0 24 24" className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/40" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
                </svg>
                <input
                  type="text"
                  placeholder="Search league..."
                  value={leagueSearch}
                  onChange={e => setLeagueSearch(e.target.value)}
                  className="w-full py-2.5 pl-9 pr-3 rounded-xl text-sm text-white placeholder-white/30 outline-none border border-transparent focus:border-[#19E66B]"
                  style={{ background: '#0D2018' }}
                />
              </div>
              <div className="space-y-1 max-h-72 overflow-y-auto">
                {filteredLeagues.map(league => {
                  const isSelected = local.leagueId === league.id;
                  return (
                    <button
                      key={league.id}
                      onClick={() => setLocal(l => ({
                        ...l,
                        leagueId: isSelected ? null : league.id,
                        leagueName: isSelected ? null : league.name,
                      }))}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left"
                      style={isSelected
                        ? { background: '#19E66B20', border: '1px solid #19E66B55' }
                        : { background: '#0D2018' }
                      }
                    >
                      <div className="w-7 h-7 shrink-0 flex items-center justify-center rounded-full bg-white/10 p-0.5">
                        {league.logo_url
                          ? <Image src={league.logo_url} alt={league.name} width={24} height={24} unoptimized className="object-contain" />
                          : <span className="text-sm">⚽</span>
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className={clsx('text-sm font-medium truncate', isSelected ? 'text-[#19E66B]' : 'text-white/90')}>
                          {league.name}
                        </div>
                        <div className="text-xs text-white/40 truncate">{league.country}</div>
                      </div>
                      {isSelected && (
                        <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0 text-[#19E66B]" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer buttons */}
        <div className="flex gap-3 px-4 py-4 border-t border-white/10">
          <button
            onClick={handleClear}
            className="flex-1 py-3 rounded-xl font-bold text-sm transition-colors"
            style={{ background: '#0D2018', color: '#9CA3AF', border: '1px solid #1C3026' }}
          >
            Clear All
          </button>
          <button
            onClick={handleApply}
            className="flex-[2] py-3 rounded-xl font-bold text-sm transition-colors"
            style={{ background: '#19E66B', color: '#072414' }}
          >
            Apply Filters
          </button>
        </div>
      </div>
    </>
  );
}
