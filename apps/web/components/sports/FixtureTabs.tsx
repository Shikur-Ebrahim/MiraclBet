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
  league_logo_url?: string;
  country: string;
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
  const home  = findOdd(ao, [1], ['match winner', '1x2'], ['home', '1']);
  const draw  = findOdd(ao, [1], ['match winner', '1x2'], ['draw', 'x']);
  const away  = findOdd(ao, [1], ['match winner', '1x2'], ['away', '2']);
  const hd    = findOdd(ao, [10, 12], ['double chance'], ['home/draw', '1x', 'home or draw']);
  const da    = findOdd(ao, [10, 12], ['double chance'], ['draw/away', 'x2', 'draw or away']);
  const ha    = findOdd(ao, [10, 12], ['double chance'], ['home/away', '12', 'home or away']);

  // Count total markets available
  const totalMarkets = ao?.markets?.length ?? 0;

  return { home, draw, away, hd, da, ha, totalMarkets };
}

const PAGE_SIZE = 50;

// ─── Single Match Row ─────────────────────────────────────────────────────────
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
}

export function FixtureTabs({
  sport = 'football',
  timeRange = 6,
  leagueId,
  activeTab = 'prematch',
  filterDate,
  filterCountry,
}: FixtureTabsProps) {
  const [allFixtures, setAllFixtures] = useState<Fixture[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://api.miraclbet.com:8443';

  // Reset page when filters change
  useEffect(() => { setPage(0); }, [sport, leagueId, activeTab, timeRange, filterDate, filterCountry]);

  useEffect(() => {
    setAllFixtures([]);
    setLoading(true);

    if (activeTab === 'live') {
      let url = `${API_BASE}/api/v1/fixtures/live?sport=${sport}`;
      if (leagueId) url += `&league=${leagueId}`;
      fetch(url, { cache: 'no-store' })
        .then(r => r.json())
        .then(data => setAllFixtures(Array.isArray(data) ? data : []))
        .catch(() => setAllFixtures([]))
        .finally(() => setLoading(false));
    } else {
      const promises = [];
      const daysToLoad = filterDate ? 0 : timeRange;
      const baseDate = filterDate ? new Date(filterDate + 'T00:00:00') : new Date();

      for (let i = 0; i <= daysToLoad; i++) {
        const d = new Date(baseDate);
        if (!filterDate) d.setDate(d.getDate() + i);
        const dateStr = d.toISOString().split('T')[0];
        let url = `${API_BASE}/api/v1/fixtures?date=${dateStr}&sport=${sport}`;
        if (leagueId) url += `&league=${leagueId}`;
        promises.push(fetch(url, { cache: 'no-store' }).then(r => r.json()).catch(() => []));
      }

      Promise.all(promises).then(results => {
        const flat = results.flatMap(data => Array.isArray(data) ? data : []);
        const unique = Array.from(new Map(flat.map(f => [f.id, f])).values());
        unique.sort((a, b) => new Date(a.kickoff_at).getTime() - new Date(b.kickoff_at).getTime());
        setAllFixtures(unique);
      }).finally(() => setLoading(false));
    }
  }, [sport, leagueId, activeTab, timeRange, API_BASE, filterDate]);

  // Apply country filter
  const displayFixtures = filterCountry
    ? allFixtures.filter(f =>
        f.country === filterCountry ||
        f.league?.toLowerCase().includes(filterCountry.toLowerCase())
      )
    : allFixtures;

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
        <FullPageLoader />
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
