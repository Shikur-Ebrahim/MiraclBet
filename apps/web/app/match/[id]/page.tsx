'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { FullPageLoader } from '@/components/ui/Loader';

interface OddValue {
  value: string;
  odd: string;
}

interface Market {
  id: number;
  name: string;
  values: OddValue[];
}

interface AdvancedOdds {
  markets: Market[];
}

interface MatchDetails {
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
  advanced_odds?: AdvancedOdds;
}

// ─── Odd Button Layout (light theme) ─────────────────────────────────────────
function OddButton({ value, odd, onClick, selected }: {
  label?: string; value: string; odd: string;
  onClick?: () => void; selected?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center justify-between rounded px-3 py-2.5 transition-colors border ${
        selected
          ? 'bg-[#E8FFF2] border-[#19E66B] '
          : 'bg-white hover:bg-[#F0FDF4] border-gray-200 hover:border-[#19E66B]/40'
      }`}
    >
      <span className={`text-[12px] ${selected ? 'text-[#0D8A3C] font-semibold' : 'text-gray-500'}`}>
        {value}
      </span>
      <span className={`text-[13px] font-bold ${selected ? 'text-[#0D8A3C]' : 'text-[#19E66B]'}`}>{odd}</span>
    </button>
  );
}

// ─── Market Collapsible Card (light theme) ───────────────────────────────────
function MarketCard({ market }: { market: Market }) {
  const [expanded, setExpanded] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);

  const cols = market.values.length === 2 ? 2 : market.values.length === 3 ? 3 : market.values.length % 2 === 0 ? 2 : 3;

  return (
    <div className="mb-1.5 mx-3 mt-1.5 rounded-lg overflow-hidden border border-gray-100 shadow-sm">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-3 py-2.5 bg-gray-50 border-b border-gray-100"
      >
        <div className="flex items-center gap-2">
          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-[#19E66B]" fill="currentColor">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
          </svg>
          <span className="text-[12px] font-bold text-gray-800">{market.name}</span>
        </div>
        <svg
          viewBox="0 0 24 24"
          className={`w-4 h-4 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" strokeWidth="2"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {expanded && (
        <div className="p-2 bg-white">
          <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
            {market.values.map((v, i) => (
              <OddButton
                key={i}
                value={v.value}
                odd={v.odd}
                selected={selected === `${i}`}
                onClick={() => setSelected(selected === `${i}` ? null : `${i}`)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Group markets into tabs like a real sportsbook
const MARKET_GROUPS: { label: string; filter: (m: string) => boolean }[] = [
  { label: 'All', filter: () => true },
  { label: 'Main Market', filter: (m) => ['1x2', 'match winner', 'double chance', 'draw no bet', 'both teams to score'].includes(m.toLowerCase()) },
  { label: 'Total', filter: (m) => m.toLowerCase().includes('total') || m.toLowerCase().includes('over/under') },
  { label: 'Half Time', filter: (m) => m.toLowerCase().includes('half') },
  { label: 'Corners', filter: (m) => m.toLowerCase().includes('corner') },
];

export default function MatchPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [match, setMatch] = useState<MatchDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('All');

  const findMatch = useCallback(async () => {
    const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://api.miraclbet.com:8443';
    try {
      const sources = [
        `${API_BASE}/api/v1/fixtures/live`,
        `${API_BASE}/api/v1/fixtures?date=${new Date().toISOString().split('T')[0]}`,
      ];
      for (let i = 1; i <= 3; i++) {
        const d = new Date();
        d.setDate(d.getDate() + i);
        sources.push(`${API_BASE}/api/v1/fixtures?date=${d.toISOString().split('T')[0]}`);
      }
      for (const url of sources) {
        const data = await fetch(url).then(r => r.json());
        const found = (Array.isArray(data) ? data : []).find((f: MatchDetails) => f.id === id);
        if (found) { setMatch(found); return; }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { findMatch(); }, [findMatch]);

  if (loading) return (
    <div className="min-h-screen bg-white animate-pulse">
      {/* Header skeleton */}
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <div className="h-4 w-16 bg-gray-200 rounded" />
        <div className="h-3 w-28 bg-gray-200 rounded" />
        <div className="w-8 h-4 bg-gray-100 rounded" />
      </div>
      {/* Scoreboard skeleton */}
      <div className="px-4 py-6 border-b border-gray-100 bg-white">
        <div className="flex items-center justify-between">
          <div className="flex flex-col items-center gap-2 flex-1">
            <div className="w-14 h-14 bg-gray-200 rounded-full" />
            <div className="h-3 w-20 bg-gray-200 rounded" />
          </div>
          <div className="flex flex-col items-center gap-2 w-24">
            <div className="h-6 w-10 bg-gray-200 rounded" />
            <div className="h-3 w-20 bg-gray-100 rounded" />
          </div>
          <div className="flex flex-col items-center gap-2 flex-1">
            <div className="w-14 h-14 bg-gray-200 rounded-full" />
            <div className="h-3 w-20 bg-gray-200 rounded" />
          </div>
        </div>
      </div>
      {/* Tabs skeleton */}
      <div className="px-3 py-2.5 border-b border-gray-100 bg-white flex gap-2">
        {[80, 60, 50, 70, 55].map((w, i) => (
          <div key={i} className="h-7 rounded-full bg-gray-200" style={{ width: w }} />
        ))}
      </div>
      {/* Market cards skeleton */}
      <div className="p-3 space-y-2 bg-gray-50">
        {[1,2,3,4].map(i => (
          <div key={i} className="bg-white rounded-lg border border-gray-100 overflow-hidden shadow-sm">
            <div className="px-3 py-2.5 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
              <div className="w-3.5 h-3.5 bg-gray-200 rounded" />
              <div className="h-3 w-32 bg-gray-200 rounded" />
            </div>
            <div className="p-2 grid grid-cols-3 gap-1.5">
              {[1,2,3].map(j => <div key={j} className="h-10 bg-gray-100 rounded" />)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
  if (!match) return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-white text-gray-800">
      <p className="text-xl mb-4">Match not found</p>
      <button onClick={() => router.back()} className="px-4 py-2 bg-[#19E66B] text-white font-bold rounded-lg">← Go Back</button>
    </div>
  );

  const kickoff = new Date(match.kickoff_at);
  const dateStr = `${String(kickoff.getDate()).padStart(2, '0')}/${String(kickoff.getMonth() + 1).padStart(2, '0')}`;
  const timeStr = kickoff.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const allMarkets = match.advanced_odds?.markets ?? [];
  const activeTabFilter = MARKET_GROUPS.find(g => g.label === activeTab)?.filter || (() => true);
  const visibleMarkets = activeTab === 'All'
    ? allMarkets
    : allMarkets.filter(m => activeTabFilter(m.name));

  return (
    <div className="min-h-screen bg-white text-gray-900 flex flex-col font-sans">

      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between border-b border-gray-100 bg-white sticky top-0 z-10">
        <button onClick={() => router.back()} className="flex items-center gap-1.5 text-[13px] font-semibold text-gray-600 hover:text-gray-900">
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          Back
        </button>
        <span className="text-[13px] font-semibold text-gray-700 truncate max-w-[180px]">{match.league}</span>
        <div className="w-8" />
      </div>

      {/* Match Scoreboard */}
      <div className="px-4 py-5 border-b border-gray-100 bg-white">
        <div className="flex items-center justify-between">
          {/* Home Team */}
          <div className="flex flex-col items-center flex-1 gap-2">
            <div className="w-14 h-14 flex items-center justify-center">
              {match.home_team_logo
                ? <Image src={match.home_team_logo} alt={match.home_team} width={56} height={56} className="object-contain" unoptimized />
                : <span className="text-3xl">⚽</span>}
            </div>
            <span className="text-[12px] font-bold text-center text-gray-900 leading-tight">{match.home_team}</span>
          </div>

          {/* Center */}
          <div className="flex flex-col items-center justify-center shrink-0 w-24">
            {match.is_live ? (
              <div className="flex flex-col items-center gap-1">
                <span className="text-[11px] text-red-500 font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse inline-block" />
                  LIVE {match.elapsed}&apos;
                </span>
                <span className="text-2xl font-black text-gray-900">{match.home_score} - {match.away_score}</span>
              </div>
            ) : (
              <>
                <span className="text-2xl font-black text-gray-300">VS</span>
                <div className="flex items-center gap-1 text-[11px] text-gray-400 mt-1">
                  <svg viewBox="0 0 24 24" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                  </svg>
                  <span>{dateStr} {timeStr}</span>
                </div>
              </>
            )}
          </div>

          {/* Away Team */}
          <div className="flex flex-col items-center flex-1 gap-2">
            <div className="w-14 h-14 flex items-center justify-center">
              {match.away_team_logo
                ? <Image src={match.away_team_logo} alt={match.away_team} width={56} height={56} className="object-contain" unoptimized />
                : <span className="text-3xl">⚽</span>}
            </div>
            <span className="text-[12px] font-bold text-center text-gray-900 leading-tight">{match.away_team}</span>
          </div>
        </div>
      </div>

      {/* Market Tabs */}
      <div className="px-3 py-2.5 border-b border-gray-100 bg-white overflow-x-auto scrollbar-hide flex gap-2">
        {MARKET_GROUPS.map(g => {
          const count = g.label === 'All' ? allMarkets.length : allMarkets.filter(m => g.filter(m.name)).length;
          if (count === 0 && g.label !== 'All') return null;
          const isActive = activeTab === g.label;
          return (
            <button
              key={g.label}
              onClick={() => setActiveTab(g.label)}
              className={`whitespace-nowrap rounded-full px-4 py-1.5 text-[12px] font-semibold transition-colors ${
                isActive
                  ? 'bg-[#19E66B] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {g.label}
              {count > 0 && <span className="ml-1 text-[10px] opacity-70">({count})</span>}
            </button>
          );
        })}
      </div>

      {/* Markets List */}
      <div className="flex-1 overflow-y-auto pb-8 bg-gray-50">
        {visibleMarkets.length > 0 ? (
          visibleMarkets.map(market => (
            <MarketCard key={market.id} market={market} />
          ))
        ) : (
          <div className="text-center py-10 text-gray-400 text-sm">
            No odds available for this tab.
          </div>
        )}
      </div>
    </div>
  );
}
