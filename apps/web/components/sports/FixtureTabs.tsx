'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { FullPageLoader } from '@/components/ui/Loader';

interface Fixture {
  id: string;
  home_team: string;
  home_team_logo?: string;
  away_team: string;
  away_team_logo?: string;
  league: string;
  league_id?: string;
  league_external_id?: string;
  league_logo_url?: string;
  country: string;
  country_flag_url?: string;
  kickoff_at: string;
  status: string;
  elapsed?: number;
  home_score: number | null;
  away_score: number | null;
  is_live: boolean;
  odds_home: number;
  odds_draw: number;
  odds_away: number;
  sport: string;
  advanced_odds?: {
    markets?: { id: number; name: string; values: { value: string; odd: string }[] }[];
    match_winner?: { value: string; odd: string }[];
  };
}

// ─── Extract an odd from the advanced_odds markets ───────────────────────────
function findOdd(
  advanced_odds: Fixture['advanced_odds'],
  marketIds: number[],
  marketNames: string[],
  targetValues: string[]
): string | null {
  if (!advanced_odds) return null;

  if (advanced_odds.markets) {
    for (const id of marketIds) {
      const mkt = advanced_odds.markets.find(m => m.id === id);
      if (mkt) {
        const v = mkt.values.find(v => targetValues.some(t => v.value.toLowerCase() === t.toLowerCase()));
        if (v) return v.odd;
      }
    }
    for (const name of marketNames) {
      const mkt = advanced_odds.markets.find(m => m.name.toLowerCase().includes(name.toLowerCase()));
      if (mkt) {
        const v = mkt.values.find(v => targetValues.some(t => v.value.toLowerCase() === t.toLowerCase()));
        if (v) return v.odd;
      }
    }
  }

  if (advanced_odds.match_winner) {
    const v = advanced_odds.match_winner.find(v =>
      targetValues.some(t => v.value.toLowerCase() === t.toLowerCase())
    );
    if (v) return v.odd;
  }

  return null;
}

function getOdds(fix: Fixture) {
  const ao = fix.advanced_odds;

  const home = findOdd(ao, [1], ['match winner', '1x2'], ['home', '1']);
  const draw = findOdd(ao, [1], ['match winner', '1x2'], ['draw', 'x']);
  const away = findOdd(ao, [1], ['match winner', '1x2'], ['away', '2']);
  const hd   = findOdd(ao, [10, 12], ['double chance'], ['home/draw', '1x', 'home or draw']);
  const da   = findOdd(ao, [10, 12], ['double chance'], ['draw/away', 'x2', 'draw or away']);
  const ha   = findOdd(ao, [10, 12], ['double chance'], ['home/away', '12', 'home or away']);

  const hasRealOdds = !!(home || draw || away || hd || da || ha);
  const totalMarkets = ao?.markets?.length ?? 0;

  return { home, draw, away, hd, da, ha, totalMarkets, hasRealOdds };
}

const PAGE_SIZE = 50;

// ─── Skeleton Shimmer Row ─────────────────────────────────────────────────────
function SkeletonRow() {
  return (
    <div className="px-3 py-2.5 border-b border-gray-100 animate-pulse">
      <div className="flex items-start gap-2 mb-2">
        <div className="shrink-0 min-w-[36px] flex flex-col gap-1">
          <div className="h-2.5 w-7 bg-gray-200 rounded" />
          <div className="h-3 w-8 bg-gray-200 rounded" />
        </div>
        <div className="flex-1 flex flex-col gap-1.5">
          <div className="h-3 w-32 bg-gray-200 rounded" />
          <div className="h-3 w-28 bg-gray-200 rounded" />
        </div>
        <div className="h-4 w-7 bg-gray-200 rounded shrink-0" />
      </div>
      <div className="grid grid-cols-6 gap-1 ml-[44px]">
        {[0,1,2,3,4,5].map(i => (
          <div key={i} className="h-8 bg-gray-100 rounded" />
        ))}
      </div>
    </div>
  );
}


function MatchRow({ fix }: { fix: Fixture }) {
  const kickoff = new Date(fix.kickoff_at);
  const timeStr = kickoff.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const dateStr = `${String(kickoff.getDate()).padStart(2, '0')}/${String(kickoff.getMonth() + 1).padStart(2, '0')}`;

  const { home, draw, away, hd, da, ha, totalMarkets } = getOdds(fix);

  const oddCells = [
    { label: '1',  val: home },
    { label: 'X',  val: draw },
    { label: '2',  val: away },
    { label: '1X', val: hd },
    { label: 'X2', val: da },
    { label: '12', val: ha },
  ];

  return (
    <Link
      href={`/match/${fix.id}`}
      className="block px-3 py-2.5 border-b border-gray-100 hover:bg-gray-50 transition-colors"
    >
      {/* Row 1: date + teams + market count */}
      <div className="flex items-start gap-2 mb-2">
        {/* Date/time */}
        <div className="shrink-0 text-center min-w-[36px]">
          {fix.is_live ? (
            <span className="text-red-500 text-[11px] font-bold flex flex-col items-center gap-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse inline-block" />
              {fix.elapsed ? `${fix.elapsed}'` : 'LIVE'}
            </span>
          ) : (
            <>
              <div className="text-[10px] text-gray-400 leading-none">{dateStr}</div>
              <div className="text-[12px] font-bold text-gray-600 leading-tight">{timeStr}</div>
            </>
          )}
        </div>

        {/* Teams */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            {fix.home_team_logo && (
              <Image src={fix.home_team_logo} alt={fix.home_team} width={14} height={14} className="object-contain shrink-0" unoptimized />
            )}
            <span className="text-[13px] font-semibold text-gray-900 truncate">{fix.home_team}</span>
            {fix.is_live && <span className="ml-auto text-[12px] font-bold text-gray-800 shrink-0">{fix.home_score ?? 0}</span>}
          </div>
          <div className="flex items-center gap-1.5">
            {fix.away_team_logo && (
              <Image src={fix.away_team_logo} alt={fix.away_team} width={14} height={14} className="object-contain shrink-0" unoptimized />
            )}
            <span className="text-[13px] font-semibold text-gray-900 truncate">{fix.away_team}</span>
            {fix.is_live && <span className="ml-auto text-[12px] font-bold text-gray-800 shrink-0">{fix.away_score ?? 0}</span>}
          </div>
        </div>

        {/* Market count badge */}
        {totalMarkets > 0 && (
          <div className="shrink-0 self-center">
            <span
              className="text-[10px] font-bold px-1.5 py-0.5 rounded"
              style={{ background: '#1a2e22', color: '#19E66B' }}
            >
              +{totalMarkets}
            </span>
          </div>
        )}
      </div>

      {/* Row 2: 6 odds buttons */}
      <div className="grid grid-cols-6 gap-1 ml-[44px]">
        {oddCells.map(({ label, val }) => (
          <button
            key={label}
            onClick={(e) => e.preventDefault()}
            className={`py-1.5 rounded flex flex-col items-center justify-center gap-0 transition-colors ${
              val !== null
                ? 'bg-[#E4F4EC] border border-[#19E66B]/30 hover:bg-[#D0EAD9]'
                : 'bg-[#F2F4F7]'
            }`}
          >
            <span className="text-[9px] text-gray-400 leading-none">{label}</span>
            <span className={`text-[11px] font-bold leading-tight ${val !== null ? 'text-[#0D8A3C]' : 'text-gray-300'}`}>
              {val ?? '—'}
            </span>
          </button>
        ))}
      </div>
    </Link>
  );
}

// ─── Main FixtureTabs ─────────────────────────────────────────────────────────
interface FixtureTabsProps {
  sport?: string;
  timeRange?: number;
  leagueId?: string;
  activeTab?: 'prematch' | 'live';
  filterDate?: string;
  filterCountry?: string;
  priorityDate?: string;
  onFixturesLoaded?: (countries: { country: string; flag?: string }[]) => void;
  onLeaguesLoaded?: (leagues: { id: string; name: string; logo?: string; country: string }[]) => void;
}

// League popularity ranking — lower = more popular
function leaguePopularity(name: string): number {
  const n = (name || '').toLowerCase();
  if (n.includes('champions league')) return 1;
  if (n.includes('premier league') && !n.includes('russia') && !n.includes('egypt')) return 2;
  if (n.includes('la liga')) return 3;
  if (n.includes('serie a') && n.includes('ital')) return 4;
  if (n.includes('bundesliga') && !n.includes('2')) return 5;
  if (n.includes('ligue 1')) return 6;
  if (n.includes('europa league')) return 7;
  if (n.includes('conference league')) return 8;
  if (n.includes('copa libertadores')) return 9;
  if (n.includes('world cup') || n.includes('euro ') || n.includes('copa america')) return 10;
  if (n.includes('eredivisie')) return 11;
  if (n.includes('primeira liga')) return 12;
  if (n.includes('super lig') || n.includes('süper lig')) return 13;
  if (n.includes('mls')) return 14;
  if (n.includes('brasileiro') || n.includes('serie a brazil')) return 15;
  if (n.includes('premier league')) return 16; // other premier leagues
  if (n.includes('nations league')) return 17;
  if (n.includes('championship')) return 50;
  return 99;
}

export function FixtureTabs({
  sport = 'football',
  timeRange = 6,
  leagueId,
  activeTab = 'prematch',
  filterDate,
  filterCountry,
  priorityDate,
  onFixturesLoaded,
  onLeaguesLoaded,
}: FixtureTabsProps) {
  const [allFixtures, setAllFixtures] = useState<Fixture[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://api.miraclbet.com:8443';

  // Notify parent whenever fixtures change — emit countries + leagues
  useEffect(() => {
    if (allFixtures.length === 0) return;

    // Countries (alphabetical)
    if (onFixturesLoaded) {
      const seen = new Set<string>();
      const list: { country: string; flag?: string }[] = [];
      for (const f of allFixtures) {
        if (f.country && !seen.has(f.country)) {
          seen.add(f.country);
          list.push({ country: f.country, flag: f.country_flag_url });
        }
      }
      list.sort((a, b) => a.country.localeCompare(b.country));
      onFixturesLoaded(list);
    }

    // Leagues (popularity-sorted, deduplicated by league_external_id or name)
    if (onLeaguesLoaded) {
      const seenL = new Set<string>();
      const leagues: { id: string; name: string; logo?: string; country: string }[] = [];
      for (const f of allFixtures) {
        const key = f.league_external_id || f.league;
        if (key && !seenL.has(key)) {
          seenL.add(key);
          leagues.push({
            id: f.league_external_id || f.league,
            name: f.league,
            logo: f.league_logo_url,
            country: f.country,
          });
        }
      }
      leagues.sort((a, b) => leaguePopularity(a.name) - leaguePopularity(b.name) || a.name.localeCompare(b.name));
      onLeaguesLoaded(leagues);
    }
  }, [allFixtures, onFixturesLoaded, onLeaguesLoaded]);

  // Reset page when filters change
  useEffect(() => { setPage(0); }, [sport, leagueId, activeTab, timeRange, filterDate, filterCountry]);

  useEffect(() => {
    setAllFixtures([]);
    setLoading(true);
    setLoadingMore(false);

    if (activeTab === 'live') {
      let url = `${API_BASE}/api/v1/fixtures/live?sport=${sport}`;
      if (leagueId) url += `&league=${leagueId}`;
      fetch(url, { cache: 'no-store' })
        .then(r => r.json())
        .then(data => setAllFixtures(Array.isArray(data) ? data : []))
        .catch(() => setAllFixtures([]))
        .finally(() => setLoading(false));
      return;
    }

    // ── Progressive loading for prematch ─────────────────────────────────────
    const daysToLoad = filterDate ? 0 : timeRange;
    const baseDate = filterDate ? new Date(filterDate + 'T00:00:00') : new Date();
    const seen = new Set<string>();

    const mergeFixtures = (fresh: Fixture[]) => {
      setAllFixtures(prev => {
        const combined = [...prev];
        for (const f of fresh) {
          if (!seen.has(f.id)) {
            seen.add(f.id);
            combined.push(f);
          }
        }
        // Sort by priority league, then by time
        combined.sort((a, b) => {
          // (priority sort handled below in displayFixtures)
          return new Date(a.kickoff_at).getTime() - new Date(b.kickoff_at).getTime();
        });
        return combined;
      });
    };

    const buildUrl = (dateStr: string) => {
      let url = `${API_BASE}/api/v1/fixtures?date=${dateStr}&sport=${sport}`;
      if (leagueId) url += `&league=${leagueId}`;
      return url;
    };

    // Step 1: Load selected date instantly → first paint
    const todayStr = baseDate.toISOString().split('T')[0];
    fetch(buildUrl(todayStr), { cache: 'no-store' })
      .then(r => r.json())
      .then(data => {
        const fixtures = Array.isArray(data) ? data : [];
        for (const f of fixtures) seen.add(f.id);
        setAllFixtures(fixtures);
      })
      .catch(() => {})
      .finally(() => {
        setLoading(false);
        // Only load extra days if timeRange > 0 AND no specific date is locked
        if (daysToLoad > 0 && !filterDate) setLoadingMore(true);
      });

    // Step 2: Load remaining days in background only when timeRange > 0
    if (daysToLoad > 0 && !filterDate) {
      const loadRemaining = async () => {
        for (let i = 1; i <= daysToLoad; i++) {
          try {
            const d = new Date(baseDate);
            d.setDate(baseDate.getDate() + i);
            const data = await fetch(buildUrl(d.toISOString().split('T')[0]), { cache: 'no-store' }).then(r => r.json());
            mergeFixtures(Array.isArray(data) ? data : []);
          } catch { /* ignore */ }
          await new Promise(r => setTimeout(r, 300));
        }
        setLoadingMore(false);
      };
      loadRemaining();
    }
  }, [sport, leagueId, activeTab, timeRange, API_BASE, filterDate]);

  function getLeaguePriority(leagueName: string): number {
    const name = (leagueName || '').toLowerCase();
    if (name.includes('premier league') || name.includes('champions league') || name.includes('europa league')) return 1;
    if (name.includes('la liga') || name.includes('serie a') || name.includes('bundesliga') || name.includes('ligue 1')) return 2;
    if (name.includes('world cup') || name.includes('euro ') || name.includes('copa america') || name.includes('copa libertadores')) return 3;
    if (name.includes('championship') || name.includes('eredivisie') || name.includes('primeira liga')) return 4;
    if (name.includes('mls') || name.includes('brasileiro')) return 5;
    return 99; // Default for others
  }

  // When country is selected, show ALL its matches (even without standard odds)
  // Otherwise only show fixtures with real displayable odds
  const baseFixtures = (() => {
    if (filterCountry) {
      // Country selected: show all matches from that country across all loaded days
      const countryMatches = allFixtures.filter(f =>
        f.country === filterCountry ||
        f.country?.toLowerCase() === filterCountry.toLowerCase()
      );
      return countryMatches.length > 0 ? countryMatches : allFixtures.filter(f =>
        f.league?.toLowerCase().includes(filterCountry.toLowerCase())
      );
    }
    // No country filter: only show fixtures with real displayable odds
    const withOdds = allFixtures.filter(f => {
      const markets = f.advanced_odds?.markets;
      if (!markets || markets.length === 0) return false;
      return getOdds(f).hasRealOdds;
    });
    return withOdds.length > 0 ? withOdds : allFixtures;
  })();

  const displayFixtures = leagueId
    ? baseFixtures.filter(f => {
        // league filter by ID or name
        return String(f.league_id) === String(leagueId) ||
               String(f.league_external_id) === String(leagueId);
      })
    : [...baseFixtures];

  // Group by league and sort: priority date first, then top leagues, then time
  displayFixtures.sort((a, b) => {
    // 1. Priority date first
    if (priorityDate) {
      const aIsToday = a.kickoff_at.startsWith(priorityDate);
      const bIsToday = b.kickoff_at.startsWith(priorityDate);
      if (aIsToday && !bIsToday) return -1;
      if (!aIsToday && bIsToday) return 1;
    }

    // 2. League priority (Champions League, Premier League etc first)
    const pA = getLeaguePriority(a.league);
    const pB = getLeaguePriority(b.league);
    if (pA !== pB) return pA - pB;

    // 3. Alphabetical league name within same priority
    const leagueA = (a.league || '').toLowerCase();
    const leagueB = (b.league || '').toLowerCase();
    if (leagueA < leagueB) return -1;
    if (leagueA > leagueB) return 1;

    // 4. Kickoff time
    return new Date(a.kickoff_at).getTime() - new Date(b.kickoff_at).getTime();
  });

  const totalPages = Math.ceil(displayFixtures.length / PAGE_SIZE);
  const pageFixtures = displayFixtures.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  // Build flat list with league separator rows
  const rows: ({ type: 'separator'; league: string; logoUrl?: string } | { type: 'fixture'; fix: Fixture })[] = [];
  let lastLeague = '';
  for (const fix of pageFixtures) {
    const leagueName = fix.league || 'Other';
    if (leagueName !== lastLeague) {
      rows.push({ type: 'separator', league: leagueName, logoUrl: fix.league_logo_url });
      lastLeague = leagueName;
    }
    rows.push({ type: 'fixture', fix });
  }

  // Pagination page numbers to show
  function getPageNumbers() {
    if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i);
    if (page <= 2) return [0, 1, 2, null, totalPages - 1];
    if (page >= totalPages - 3) return [0, null, totalPages - 3, totalPages - 2, totalPages - 1];
    return [0, null, page, null, totalPages - 1];
  }

  return (
    <div>
      {loading ? (
        /* ── First Load: Show 8 skeleton rows instantly ── */
        <div className="bg-white">
          {Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)}
        </div>
      ) : displayFixtures.length > 0 ? (
        <>
          <div className="bg-white">
            {rows.map((row, i) => {
              if (row.type === 'separator') {
                return (
                  <div
                    key={`sep-${row.league}-${i}`}
                    className="flex items-center gap-2 px-3 py-1.5 border-b border-gray-100"
                    style={{ background: '#f7f9f8' }}
                  >
                    {row.logoUrl ? (
                      <Image src={row.logoUrl} alt={row.league} width={14} height={14} className="object-contain shrink-0" unoptimized />
                    ) : (
                      <span className="text-[12px]">⚽</span>
                    )}
                    <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide truncate">
                      {row.league}
                    </span>
                  </div>
                );
              }
              return <MatchRow key={row.fix.id} fix={row.fix} />;
            })}

            {/* Loading more indicator — subtle shimmer at bottom */}
            {loadingMore && (
              <div className="bg-white">
                {Array.from({ length: 3 }).map((_, i) => <SkeletonRow key={`more-${i}`} />)}
              </div>
            )}
          </div>

          {/* Global pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-1.5 mt-6 mb-2 flex-wrap">
              {/* Prev */}
              <button
                onClick={() => { setPage(p => Math.max(0, p - 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                disabled={page === 0}
                className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors disabled:opacity-30"
                style={{ background: '#1a2e22', color: '#19E66B' }}
              >
                ‹
              </button>

              {getPageNumbers().map((pg, i) =>
                pg === null ? (
                  <span key={`dot-${i}`} className="text-gray-400 text-sm">…</span>
                ) : (
                  <button
                    key={pg}
                    onClick={() => { setPage(pg as number); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-bold transition-colors"
                    style={
                      page === pg
                        ? { background: '#19E66B', color: '#072414' }
                        : { background: '#1a2e22', color: '#19E66B' }
                    }
                  >
                    {(pg as number) + 1}
                  </button>
                )
              )}

              {/* Next */}
              <button
                onClick={() => { setPage(p => Math.min(totalPages - 1, p + 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                disabled={page === totalPages - 1}
                className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors disabled:opacity-30"
                style={{ background: '#1a2e22', color: '#19E66B' }}
              >
                ›
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-12 rounded-xl" style={{ background: '#0D1913', border: '1px solid #19E66B33' }}>
          <p className="text-2xl mb-2">🏟️</p>
          <p className="text-base font-semibold mb-1 text-white">No fixtures scheduled</p>
          <p className="text-sm text-gray-400">Check another date or sport</p>
        </div>
      )}
    </div>
  );
}
