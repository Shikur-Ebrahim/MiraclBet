'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { clsx } from 'clsx';

interface SearchFixture {
  id: string;
  home_team: string;
  home_team_logo?: string;
  away_team: string;
  away_team_logo?: string;
  league: string;
  league_logo_url?: string;
  kickoff_at: string;
  status: string;
  elapsed?: number;
  home_score: number | null;
  away_score: number | null;
  is_live: boolean;
  odds_home: number;
  odds_draw: number;
  odds_away: number;
}

interface SearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SearchOverlay({ isOpen, onClose }: SearchOverlayProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchFixture[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://api.miraclbet.com:8443';

  // Focus input when overlay opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setQuery('');
      setResults([]);
    }
  }, [isOpen]);

  // Debounced search
  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); return; }
    setLoading(true);
    try {
      // Fetch today + tomorrow to get enough results
      const today = new Date();
      const dates = [0, 1, 2].map(i => {
        const d = new Date(today);
        d.setDate(d.getDate() + i);
        return d.toISOString().split('T')[0];
      });
      const all = await Promise.all(
        dates.map(date =>
          fetch(`${API_BASE}/api/v1/fixtures?date=${date}&sport=football`, { cache: 'no-store' })
            .then(r => r.json()).catch(() => [])
        )
      );
      const flat: SearchFixture[] = all.flatMap(d => Array.isArray(d) ? d : []);
      const lower = q.toLowerCase();
      const filtered = flat.filter(f =>
        f.home_team?.toLowerCase().includes(lower) ||
        f.away_team?.toLowerCase().includes(lower) ||
        f.league?.toLowerCase().includes(lower)
      );
      // Deduplicate
      const unique = Array.from(new Map(filtered.map(f => [f.id, f])).values());
      unique.sort((a, b) => new Date(a.kickoff_at).getTime() - new Date(b.kickoff_at).getTime());
      setResults(unique.slice(0, 50));
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [API_BASE]);

  useEffect(() => {
    const timer = setTimeout(() => doSearch(query), 300);
    return () => clearTimeout(timer);
  }, [query, doSearch]);

  // Group results by league
  const grouped: Record<string, { fixtures: SearchFixture[]; logoUrl?: string }> = {};
  for (const fix of results) {
    const key = fix.league || 'Other';
    if (!grouped[key]) grouped[key] = { fixtures: [], logoUrl: fix.league_logo_url };
    grouped[key].fixtures.push(fix);
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className={clsx('fixed inset-0 z-50 bg-black/70 transition-opacity duration-200',
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        onClick={onClose}
      />

      {/* Overlay panel */}
      <div
        className={clsx(
          'fixed inset-x-0 top-0 z-50 flex flex-col transition-transform duration-300',
          isOpen ? 'translate-y-0' : '-translate-y-full'
        )}
        style={{ background: '#0A0E1A', maxHeight: '90vh' }}
      >
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-white/10">
          <div className="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl" style={{ background: '#0D2018', border: '1px solid #1C3026' }}>
            <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0 text-white/40" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              ref={inputRef}
              type="text"
              placeholder="Search teams or leagues..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="flex-1 bg-transparent text-white placeholder-white/30 text-[15px] outline-none"
            />
            {query && (
              <button onClick={() => setQuery('')} className="text-white/40 hover:text-white/70">
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            )}
          </div>
          <button onClick={onClose} className="text-white/60 hover:text-white text-sm font-semibold px-2">
            Cancel
          </button>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto">
          {!query.trim() ? (
            <div className="py-16 text-center">
              <div className="text-4xl mb-3">🔍</div>
              <p className="text-white/40 text-sm">Search for a team or league</p>
            </div>
          ) : loading ? (
            <div className="py-16 flex items-center justify-center gap-2 text-white/40">
              <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
              </svg>
              Searching...
            </div>
          ) : results.length === 0 ? (
            <div className="py-16 text-center">
              <div className="text-4xl mb-3">😔</div>
              <p className="text-white/40 text-sm">No matches found for &quot;{query}&quot;</p>
            </div>
          ) : (
            <div className="pb-6">
              <p className="px-4 py-2 text-xs text-white/40 uppercase tracking-wider">
                {results.length} match{results.length !== 1 ? 'es' : ''} found
              </p>
              {Object.entries(grouped).map(([league, { fixtures, logoUrl }]) => (
                <div key={league} className="mb-3">
                  {/* League header */}
                  <div
                    className="flex items-center gap-2 px-4 py-2"
                    style={{ background: 'linear-gradient(90deg, #0A5F38 0%, #11834F 100%)' }}
                  >
                    <div className="w-5 h-5 shrink-0 flex items-center justify-center bg-white rounded-full p-0.5">
                      {logoUrl
                        ? <Image src={logoUrl} alt={league} width={16} height={16} className="object-contain" unoptimized />
                        : <span className="text-[10px]">⚽</span>
                      }
                    </div>
                    <span className="text-[12px] font-bold text-white uppercase truncate">{league}</span>
                  </div>

                  {/* Matches */}
                  {fixtures.map(fix => {
                    const kickoff = new Date(fix.kickoff_at);
                    const timeStr = kickoff.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    const dateStr = kickoff.toLocaleDateString([], { day: '2-digit', month: '2-digit' });
                    return (
                      <div key={fix.id} className="bg-white border-b border-gray-100 px-4 py-3">
                        <div className="text-[12px] font-bold text-gray-700 mb-2">
                          {fix.is_live ? (
                            <span className="text-red-500 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse inline-block"/>
                              {fix.elapsed ? `${fix.elapsed}'` : fix.status}
                            </span>
                          ) : (
                            <span>{timeStr} {dateStr.replace(/\//g, '.')}</span>
                          )}
                        </div>
                        {/* Highlight matching text */}
                        <div className="flex flex-col gap-1.5 mb-2">
                          {[
                            { logo: fix.home_team_logo, name: fix.home_team, score: fix.is_live ? fix.home_score : null },
                            { logo: fix.away_team_logo, name: fix.away_team, score: fix.is_live ? fix.away_score : null },
                          ].map((team, i) => (
                            <div key={i} className="flex items-center gap-2">
                              <div className="w-5 h-5 flex items-center justify-center shrink-0">
                                {team.logo
                                  ? <Image src={team.logo} alt={team.name} width={20} height={20} unoptimized className="object-contain" />
                                  : <span className="text-sm">⚽</span>
                                }
                              </div>
                              <span className={clsx('text-[13px] font-medium flex-1 truncate', 
                                team.name.toLowerCase().includes(query.toLowerCase()) ? 'text-[#0A5F38] font-bold' : 'text-gray-900'
                              )}>
                                {team.name}
                              </span>
                              {team.score !== null && (
                                <span className="text-[13px] font-bold text-gray-900">{team.score}</span>
                              )}
                            </div>
                          ))}
                        </div>
                        <div className="grid grid-cols-3 gap-1">
                          {[fix.odds_home, fix.odds_draw, fix.odds_away].map((val, i) => (
                            <button key={i} className="bg-[#E4E9F2] rounded-md py-2 text-[13px] font-semibold text-gray-900 hover:bg-[#D5DCE8]">
                              {(val || 1.9).toFixed(2)}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
