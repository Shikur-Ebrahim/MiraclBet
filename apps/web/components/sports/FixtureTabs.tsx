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
    // New format: flat markets array
    markets?: { id: number; name: string; values: { value: string; odd: string }[] }[];
    // Old format (backwards compat)
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

// Extract 1X2 odds - search by market ID=1 OR by common names
function getMatchWinnerOdd(advanced_odds: Fixture['advanced_odds'], targetValue: 'Home' | 'Draw' | 'Away'): string | null {
  if (!advanced_odds) return null;

  // New format: search markets array
  if (advanced_odds.markets && advanced_odds.markets.length > 0) {
    // Try by ID=1 first
    let mw = advanced_odds.markets.find(m => m.id === 1);
    // Fallback: search by name (Match Winner / 1X2 / Home/Draw/Away)
    if (!mw) {
      mw = advanced_odds.markets.find(m => {
        const n = m.name.toLowerCase();
        return n.includes('match winner') || n === '1x2' || n.includes('home/draw/away') || n.includes('result');
      });
    }
    if (mw) {
      // value from API can be "Home"/"Away"/"Draw" or "1"/"X"/"2"
      const valueMap: Record<string, string[]> = {
        Home: ['Home', '1', 'home'],
        Draw: ['Draw', 'X', 'draw'],
        Away: ['Away', '2', 'away'],
      };
      const val = mw.values.find(v => valueMap[targetValue]?.includes(v.value));
      return val ? val.odd : null;
    }
  }

  // Old format fallback
  if (advanced_odds.match_winner) {
    const val = advanced_odds.match_winner.find(v => v.value === targetValue);
    return val ? val.odd : null;
  }

  return null;
}

function MatchRow({ fix }: { fix: Fixture }) {
  const kickoff = new Date(fix.kickoff_at);
  const timeStr = kickoff.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const dateStr = kickoff.toLocaleDateString([], { day: '2-digit', month: '2-digit' });

  return (
    <Link href={`/match/${fix.id}`} className="block bg-white border-b border-gray-100 last:border-b-0 px-3 py-3 hover:bg-gray-50 transition-colors">
      <div className="text-[13px] font-bold text-gray-800 mb-2 flex items-center gap-2">
        {fix.is_live ? (
          <span className="text-red-500 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"/>
            {fix.elapsed ? `${fix.elapsed}'` : fix.status}
          </span>
        ) : (
          <span>{timeStr} {dateStr.replace(/\//g, '.')}</span>
        )}
      </div>

      <div className="flex justify-between items-start mb-3">
        <div className="flex flex-col gap-2 flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <TeamLogo logo={fix.home_team_logo} name={fix.home_team} />
            <span className="text-[14px] font-medium text-gray-900 leading-tight truncate">{fix.home_team}</span>
          </div>
          <div className="flex items-center gap-2">
            <TeamLogo logo={fix.away_team_logo} name={fix.away_team} />
            <span className="text-[14px] font-medium text-gray-900 leading-tight truncate">{fix.away_team}</span>
          </div>
        </div>

        {fix.is_live && (
          <div className="flex flex-col gap-2 items-end justify-center pr-2">
            <span className="text-[14px] font-bold text-gray-900">{fix.home_score ?? 0}</span>
            <span className="text-[14px] font-bold text-gray-900">{fix.away_score ?? 0}</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-1">
        {[
          { label: '1', val: getMatchWinnerOdd(fix.advanced_odds, 'Home') },
          { label: 'X', val: getMatchWinnerOdd(fix.advanced_odds, 'Draw') },
          { label: '2', val: getMatchWinnerOdd(fix.advanced_odds, 'Away') },
        ].map(({ label, val }) => {
          const hasReal = val !== null;
          return (
            <button
              key={label}
              onClick={(e) => { e.preventDefault(); }}
              className={`rounded-md py-2 px-2 flex flex-col items-center justify-center transition-colors gap-0.5 ${
                hasReal
                  ? 'bg-[#E4F4EC] hover:bg-[#D0EAD9] border border-[#19E66B]/30'
                  : 'bg-[#E4E9F2] hover:bg-[#D5DCE8]'
              }`}
            >
              <span className="text-[10px] text-gray-400">{label}</span>
              <span className={`text-[13px] font-bold ${hasReal ? 'text-[#0D8A3C]' : 'text-gray-400'}`}>
                {val ?? '—'}
              </span>
            </button>
          );
        })}
      </div>
    </Link>
  );
}

function LeagueGroup({
  league, fixtures, leagueLogoUrl, defaultExpanded,
}: {
  league: string; fixtures: Fixture[]; leagueLogoUrl?: string; defaultExpanded: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const logoUrl = getLeagueLogo(league, leagueLogoUrl);

  // No auto-open effect. User must explicitly click to expand.
  return (
    <div className="mb-4 rounded-xl overflow-hidden shadow-sm">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left transition-colors"
        style={{ background: 'linear-gradient(90deg, #0A5F38 0%, #11834F 100%)' }}
      >
        <svg
          viewBox="0 0 24 24"
          className={clsx('w-4 h-4 text-white transition-transform shrink-0', expanded ? '' : '-rotate-90')}
          fill="none" stroke="currentColor" strokeWidth="2.5"
        >
          <polyline points="6 9 12 15 18 9"/>
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

      {expanded && (
        <div className="bg-white">
          {fixtures.map((fix) => <MatchRow key={fix.id} fix={fix} />)}
        </div>
      )}
    </div>
  );
}

interface FixtureTabsProps {
  sport?: string;
  timeRange?: number;
  leagueId?: string;
  activeTab?: 'prematch' | 'live';
  filterDate?: string;    // specific date override from FilterPanel
  filterCountry?: string; // country filter from FilterPanel
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
        .then(data => {
          setAllFixtures(Array.isArray(data) ? data : []);
        })
        .catch(() => setAllFixtures([]))
        .finally(() => setLoading(false));
    } else {
      const promises = [];
      // If filterDate is set, just load that date. Otherwise, load timeRange days.
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

  // Apply country filter client-side
  const displayFixtures = filterCountry
    ? allFixtures.filter(f => f.country === filterCountry || f.league?.toLowerCase().includes(filterCountry.toLowerCase()))
    : allFixtures;

  // Group by league and maintain order
  const grouped: Record<string, { fixtures: Fixture[]; logoUrl?: string }> = {};
  for (const fix of displayFixtures) {
    const key = fix.league || 'Other';
    if (!grouped[key]) grouped[key] = { fixtures: [], logoUrl: fix.league_logo_url };
    grouped[key].fixtures.push(fix);
  }

  // Determine which leagues are in the first 200 matches to set defaultExpanded
  let matchesCount = 0;
  const initialLeagues = new Set<string>();
  for (const [league, { fixtures }] of Object.entries(grouped)) {
    if (matchesCount < 200) {
      initialLeagues.add(league);
    }
    matchesCount += fixtures.length;
  }

  return (
    <div>
      {loading ? (
        <FullPageLoader />
      ) : Object.keys(grouped).length > 0 ? (
        <div>
          {Object.entries(grouped).map(([league, { fixtures, logoUrl }]) => (
            <LeagueGroup
              key={league}
              league={league}
              fixtures={fixtures}
              leagueLogoUrl={logoUrl}
              defaultExpanded={initialLeagues.has(league)}
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
