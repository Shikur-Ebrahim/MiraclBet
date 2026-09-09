'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { clsx } from 'clsx';
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

const LEAGUE_LOGO_MAP: Record<string, string> = {
  'Premier League': '39', 'La Liga': '140', 'Serie A': '135',
  'Bundesliga': '78', 'Ligue 1': '61', 'UEFA Champions League': '2',
  'UEFA Europa League': '3', 'UEFA Nations League': '5', 'Copa Libertadores': '13',
};

function getLeagueLogo(leagueName: string, logoUrl?: string): string | null {
  if (logoUrl) return logoUrl;
  for (const [key, id] of Object.entries(LEAGUE_LOGO_MAP)) {
    if (leagueName.toLowerCase().includes(key.toLowerCase())) {
      return `https://media.api-sports.io/football/leagues/${id}.png`;
    }
  }
  return null;
}

function TeamLogo({ logo, name }: { logo?: string; name: string }) {
  if (logo) {
    return (
      <div className="w-5 h-5 flex items-center justify-center shrink-0">
        <Image src={logo} alt={name} width={20} height={20} className="object-contain" unoptimized />
      </div>
    );
  }
  return <div className="w-5 h-5 flex items-center justify-center shrink-0 text-sm">⚽</div>;
}

function getMatchWinnerOdd(advanced_odds: Fixture['advanced_odds'], targetValue: 'Home' | 'Draw' | 'Away'): string | null {
  if (!advanced_odds) return null;

  if (advanced_odds.markets && advanced_odds.markets.length > 0) {
    let mw = advanced_odds.markets.find(m => m.id === 1);
    if (!mw) {
      mw = advanced_odds.markets.find(m => {
        const n = m.name.toLowerCase();
        return n.includes('match winner') || n === '1x2' || n.includes('home/draw/away') || n.includes('result');
      });
    }
    if (mw) {
      const valueMap: Record<string, string[]> = {
        Home: ['Home', '1', 'home'],
        Draw: ['Draw', 'X', 'draw'],
        Away: ['Away', '2', 'away'],
      };
      const val = mw.values.find(v => valueMap[targetValue]?.includes(v.value));
      return val ? val.odd : null;
    }
  }

  if (advanced_odds.match_winner) {
    const val = advanced_odds.match_winner.find(v => v.value === targetValue);
    return val ? val.odd : null;
  }

  return null;
}

// ─── Single match row (vertical list style) ───────────────────────────────────
function MatchRow({ fix }: { fix: Fixture }) {
  const kickoff = new Date(fix.kickoff_at);
  const timeStr = kickoff.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const dateStr = kickoff.toLocaleDateString([], { day: '2-digit', month: '2-digit' });

  const homeOdd = getMatchWinnerOdd(fix.advanced_odds, 'Home');
  const drawOdd = getMatchWinnerOdd(fix.advanced_odds, 'Draw');
  const awayOdd = getMatchWinnerOdd(fix.advanced_odds, 'Away');
  const hasOdds = homeOdd !== null;

  return (
    <Link
      href={`/match/${fix.id}`}
      className="block bg-white border-b border-gray-100 last:border-b-0 px-3 py-3 hover:bg-gray-50 transition-colors"
    >
      {/* Time */}
      <div className="text-[12px] font-semibold text-gray-400 mb-2 flex items-center gap-1.5">
        {fix.is_live ? (
          <span className="text-red-500 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse inline-block" />
            {fix.elapsed ? `${fix.elapsed}'` : 'LIVE'}
          </span>
        ) : (
          <span>{timeStr} · {dateStr.replace(/\//g, '.')}</span>
        )}
      </div>

      <div className="flex items-start justify-between gap-2">
        {/* Teams */}
        <div className="flex flex-col gap-1.5 flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <TeamLogo logo={fix.home_team_logo} name={fix.home_team} />
            <span className="text-[13px] font-semibold text-gray-900 leading-tight truncate">{fix.home_team}</span>
          </div>
          <div className="flex items-center gap-2">
            <TeamLogo logo={fix.away_team_logo} name={fix.away_team} />
            <span className="text-[13px] font-semibold text-gray-900 leading-tight truncate">{fix.away_team}</span>
          </div>
        </div>

        {/* Score if live */}
        {fix.is_live && (
          <div className="flex flex-col gap-1.5 items-end justify-center shrink-0 pr-2">
            <span className="text-[13px] font-bold text-gray-900">{fix.home_score ?? 0}</span>
            <span className="text-[13px] font-bold text-gray-900">{fix.away_score ?? 0}</span>
          </div>
        )}

        {/* Odds buttons */}
        <div className="flex gap-1 shrink-0">
          {[
            { label: '1', val: homeOdd },
            { label: 'X', val: drawOdd },
            { label: '2', val: awayOdd },
          ].map(({ label, val }) => (
            <button
              key={label}
              onClick={(e) => e.preventDefault()}
              className={`w-14 py-2 rounded-lg flex flex-col items-center justify-center gap-0.5 transition-colors ${
                hasOdds
                  ? 'bg-[#E4F4EC] border border-[#19E66B]/30 hover:bg-[#D0EAD9]'
                  : 'bg-[#F2F4F7]'
              }`}
            >
              <span className="text-[10px] text-gray-400">{label}</span>
              <span className={`text-[12px] font-bold leading-none ${hasOdds ? 'text-[#0D8A3C]' : 'text-gray-300'}`}>
                {val ?? '—'}
              </span>
            </button>
          ))}
        </div>
      </div>
    </Link>
  );
}

// ─── League group with collapsible vertical list ───────────────────────────────
const PAGE_SIZE = 15;

function LeagueGroup({
  league, fixtures, leagueLogoUrl, defaultExpanded,
}: {
  league: string; fixtures: Fixture[]; leagueLogoUrl?: string; defaultExpanded: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [page, setPage] = useState(0);
  const logoUrl = getLeagueLogo(league, leagueLogoUrl);

  const totalPages = Math.ceil(fixtures.length / PAGE_SIZE);
  const pageFixtures = fixtures.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <div className="mb-4 rounded-xl overflow-hidden shadow-sm">
      {/* League Header */}
      <button
        onClick={() => { setExpanded(!expanded); setPage(0); }}
        className="w-full flex items-center gap-2 px-3 py-2 text-left transition-colors"
        style={{ background: 'linear-gradient(90deg, #0A5F38 0%, #11834F 100%)' }}
      >
        <svg
          viewBox="0 0 24 24"
          className={clsx('w-4 h-4 text-white transition-transform shrink-0', expanded ? '' : '-rotate-90')}
          fill="none" stroke="currentColor" strokeWidth="2.5"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
        <div className="w-5 h-5 shrink-0 flex items-center justify-center bg-white rounded-full p-0.5">
          {logoUrl ? (
            <Image src={logoUrl} alt={league} width={16} height={16} className="object-contain" unoptimized />
          ) : (
            <span className="text-[10px]">⚽</span>
          )}
        </div>
        <span className="text-[13px] font-bold text-white flex-1 truncate uppercase">{league}</span>
        <span className="text-xs text-white/60">{fixtures.length}</span>
      </button>

      {/* Match list */}
      {expanded && (
        <div className="bg-white">
          {pageFixtures.map((fix) => (
            <MatchRow key={fix.id} fix={fix} />
          ))}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-3 py-2 border-t border-gray-100 bg-gray-50">
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                style={{ background: '#E4F4EC', color: '#0D8A3C' }}
              >
                ← Prev
              </button>
              <span className="text-[11px] text-gray-400">
                Page {page + 1} of {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={page === totalPages - 1}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                style={{ background: '#E4F4EC', color: '#0D8A3C' }}
              >
                Next →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
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

export function FixtureTabs({ sport = 'football', timeRange = 6, leagueId, activeTab = 'prematch', filterDate, filterCountry }: FixtureTabsProps) {
  const [allFixtures, setAllFixtures] = useState<Fixture[]>([]);
  const [loading, setLoading] = useState(false);
  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://api.miraclbet.com:8443';

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

  const displayFixtures = filterCountry
    ? allFixtures.filter(f => f.country === filterCountry || f.league?.toLowerCase().includes(filterCountry.toLowerCase()))
    : allFixtures;

  // Group by league
  const grouped: Record<string, { fixtures: Fixture[]; logoUrl?: string }> = {};
  for (const fix of displayFixtures) {
    const key = fix.league || 'Other';
    if (!grouped[key]) grouped[key] = { fixtures: [], logoUrl: fix.league_logo_url };
    grouped[key].fixtures.push(fix);
  }

  // First 3 leagues expanded by default
  const leagueKeys = Object.keys(grouped);
  const defaultExpandedSet = new Set(leagueKeys.slice(0, 3));

  return (
    <div>
      {loading ? (
        <FullPageLoader />
      ) : leagueKeys.length > 0 ? (
        <div>
          {Object.entries(grouped).map(([league, { fixtures, logoUrl }]) => (
            <LeagueGroup
              key={league}
              league={league}
              fixtures={fixtures}
              leagueLogoUrl={logoUrl}
              defaultExpanded={defaultExpandedSet.has(league)}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-muted bg-surface/30 rounded-xl border border-brand">
          <p className="text-2xl mb-2">🏟️</p>
          <p className="text-base font-semibold mb-1">No fixtures scheduled</p>
          <p className="text-sm">Check another date or sport</p>
        </div>
      )}
    </div>
  );
}
