'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { clsx } from 'clsx';

interface Fixture {
  id: string;
  home_team: string;
  away_team: string;
  league: string;
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
}

const LEAGUE_LOGO_MAP: Record<string, string> = {
  'Premier League': '39', 'La Liga': '140', 'Serie A': '135',
  'Bundesliga': '78', 'Ligue 1': '61', 'UEFA Champions League': '2',
  'UEFA Europa League': '3', 'UEFA Nations League': '5', 'Copa Libertadores': '13',
};

function getLeagueLogo(leagueName: string): string | null {
  for (const [key, id] of Object.entries(LEAGUE_LOGO_MAP)) {
    if (leagueName.toLowerCase().includes(key.toLowerCase())) {
      return `https://media.api-sports.io/football/leagues/${id}.png`;
    }
  }
  return null;
}

function MatchRow({ fix }: { fix: Fixture }) {
  const kickoff = new Date(fix.kickoff_at);
  const timeStr = kickoff.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const dateStr = kickoff.toLocaleDateString([], { day: '2-digit', month: '2-digit' });

  return (
    <div className="bg-white border-b border-gray-100 last:border-b-0 px-3 py-3">
      {/* Time and Date */}
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

      {/* Teams (Stacked) */}
      <div className="flex justify-between items-start mb-3">
        <div className="flex flex-col gap-2">
          {/* Home Team */}
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 flex items-center justify-center shrink-0">
              <span className="text-sm">⚽</span>
            </div>
            <span className="text-[14px] font-medium text-gray-900 leading-tight">{fix.home_team}</span>
          </div>
          {/* Away Team */}
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 flex items-center justify-center shrink-0">
              <span className="text-sm">⚽</span>
            </div>
            <span className="text-[14px] font-medium text-gray-900 leading-tight">{fix.away_team}</span>
          </div>
        </div>

        {/* Score (if live) */}
        {fix.is_live && (
          <div className="flex flex-col gap-2 items-end justify-center pr-2">
            <span className="text-[14px] font-bold text-gray-900">{fix.home_score ?? 0}</span>
            <span className="text-[14px] font-bold text-gray-900">{fix.away_score ?? 0}</span>
          </div>
        )}
      </div>

      {/* Odds Buttons */}
      <div className="grid grid-cols-3 gap-1">
        {[
          { label: '1', val: fix.odds_home },
          { label: 'X', val: fix.odds_draw },
          { label: '2', val: fix.odds_away },
        ].map(({ label, val }) => (
          <button
            key={label}
            className="bg-[#E4E9F2] hover:bg-[#D5DCE8] active:bg-[#C6CFDE] rounded-md py-2.5 px-3 flex items-center justify-between transition-colors"
          >
            <div className="text-[14px] font-semibold text-gray-900">{(val || 1.9).toFixed(2)}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

function LeagueGroup({ league, fixtures }: { league: string; fixtures: Fixture[] }) {
  const [expanded, setExpanded] = useState(true);
  const logoUrl = getLeagueLogo(league);
  
  return (
    <div className="mb-4 rounded-xl overflow-hidden shadow-sm">
      {/* Green League Header (VikingBet Style) */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left transition-colors"
        style={{ background: 'linear-gradient(90deg, #0A5F38 0%, #11834F 100%)' }}
      >
        <svg viewBox="0 0 24 24" className={clsx('w-4 h-4 text-white transition-transform shrink-0', expanded ? '' : '-rotate-90')} fill="none" stroke="currentColor" strokeWidth="2.5">
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
  timeRange?: number; // 0 to 6
  leagueId?: string;  // filter by specific league external_id
  activeTab?: 'prematch' | 'live';
}

export function FixtureTabs({ sport = 'football', timeRange = 6, leagueId, activeTab = 'prematch' }: FixtureTabsProps) {
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchFixtures = useCallback(async () => {
    setLoading(true);
    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://api.miraclbet.com:8443';

      if (activeTab === 'live') {
        let url = `${API_BASE}/api/v1/fixtures/live?sport=${sport}`;
        if (leagueId) url += `&league=${leagueId}`;
        const data = await fetch(url, { cache: 'no-store' }).then(r => r.json());
        setFixtures(Array.isArray(data) ? data : []);
      } else {
        const promises = [];
        const baseDate = new Date();
        for (let i = 0; i <= timeRange; i++) {
          const d = new Date(baseDate);
          d.setDate(d.getDate() + i);
          const dateStr = d.toISOString().split('T')[0];
          let url = `${API_BASE}/api/v1/fixtures?date=${dateStr}&sport=${sport}`;
          if (leagueId) url += `&league=${leagueId}`;
          promises.push(fetch(url, { cache: 'no-store' }).then(r => r.json()).catch(() => []));
        }
        const results = await Promise.all(promises);
        const allData = results.flatMap(data => Array.isArray(data) ? data : []);
        const unique = Array.from(new Map(allData.map(item => [item.id, item])).values());
        unique.sort((a, b) => new Date(a.kickoff_at).getTime() - new Date(b.kickoff_at).getTime());
        setFixtures(unique);
      }
    } catch {
      setFixtures([]);
    } finally {
      setLoading(false);
    }
  }, [timeRange, sport, leagueId, activeTab]);

  useEffect(() => {
    fetchFixtures();
  }, [fetchFixtures]);

  const grouped: Record<string, Fixture[]> = {};
  for (const fix of fixtures) {
    const key = fix.league || 'Other';
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(fix);
  }

  return (
    <div>
      {loading ? (
        <div className="py-12 flex items-center justify-center gap-2 text-muted">
          <svg className="animate-spin h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
          </svg>
          Loading events...
        </div>
      ) : Object.keys(grouped).length > 0 ? (
        <div>
          {Object.entries(grouped).map(([league, leagueFixtures]) => (
            <LeagueGroup key={league} league={league} fixtures={leagueFixtures} />
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
