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

// Markets that get 3-column layout (like 1X2 style)
const THREE_COL_MARKETS = new Set([1, 2, 3, 7, 12, 13]);

function OddButton({ label, value, odd, onClick, selected }: {
  label?: string; value: string; odd: string;
  onClick?: () => void; selected?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center justify-center rounded-lg py-3 px-2 transition-all border ${
        selected
          ? 'bg-[#19E66B] border-[#19E66B] text-black'
          : 'bg-[#1A2634] hover:bg-[#233142] border-white/5 text-white'
      }`}
    >
      {label && <span className={`text-[10px] mb-0.5 ${selected ? 'text-black/60' : 'text-white/40'}`}>{label}</span>}
      <span className={`text-[11px] font-medium mb-1 truncate w-full text-center ${selected ? 'text-black/70' : 'text-white/60'}`}>{value}</span>
      <span className={`text-sm font-bold ${selected ? 'text-black' : 'text-[#19E66B]'}`}>{odd}</span>
    </button>
  );
}

function MarketCard({ market }: { market: Market }) {
  const [selected, setSelected] = useState<string | null>(null);
  const cols = THREE_COL_MARKETS.has(market.id) || market.values.length === 3
    ? 3
    : market.values.length === 2
    ? 2
    : market.values.length >= 6
    ? 3
    : 2;

  return (
    <div className="bg-[#111827] rounded-xl overflow-hidden border border-white/5">
      <div className="px-4 py-2.5 bg-[#0F1C2D] flex items-center justify-between">
        <span className="text-sm font-semibold text-white/90">{market.name}</span>
        <span className="text-[10px] text-white/30">Bet365</span>
      </div>
      <div className={`p-2 grid gap-2`} style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
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
  );
}

// Group markets into tabs like a real sportsbook
const MARKET_GROUPS: { label: string; ids: number[] }[] = [
  { label: 'Main', ids: [1, 2, 3, 12, 13, 14] },
  { label: 'Goals', ids: [5, 6, 26, 8, 27, 28] },
  { label: 'Handicap', ids: [4, 9, 15, 16] },
  { label: 'Halftime', ids: [7, 17, 18, 19, 20, 31, 32] },
  { label: 'Score', ids: [10, 33, 34] },
  { label: 'Other', ids: [] }, // catches all remaining
];

export default function MatchPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [match, setMatch] = useState<MatchDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Main');

  const findMatch = useCallback(async () => {
    const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://api.miraclbet.com:8443';
    try {
      // Try live first, then today, then tomorrow
      const sources = [
        `${API_BASE}/api/v1/fixtures/live`,
        `${API_BASE}/api/v1/fixtures?date=${new Date().toISOString().split('T')[0]}`,
      ];
      // Add next 3 days
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

  const markets = match?.advanced_odds?.markets ?? [];

  // Build tab groups
  const groupedMarkets = React.useMemo(() => {
    const assigned = new Set<number>();
    const result: Record<string, Market[]> = {};
    for (const group of MARKET_GROUPS) {
      if (group.ids.length > 0) {
        result[group.label] = markets.filter(m => group.ids.includes(m.id));
        result[group.label].forEach(m => assigned.add(m.id));
      }
    }
    result['Other'] = markets.filter(m => !assigned.has(m.id));
    return result;
  }, [markets]);

  const visibleTabs = MARKET_GROUPS.filter(g => (groupedMarkets[g.label] ?? []).length > 0);
  const activeMarkets = groupedMarkets[activeTab] ?? [];

  if (loading) return <FullPageLoader />;
  if (!match) return (
    <div className="flex flex-col items-center justify-center min-h-screen text-white bg-[#0A0E1A]">
      <p className="text-xl mb-4">Match not found</p>
      <button onClick={() => router.back()} className="px-4 py-2 bg-[#19E66B] text-black font-bold rounded-lg">← Go Back</button>
    </div>
  );

  const kickoff = new Date(match.kickoff_at);

  return (
    <div className="min-h-screen bg-[#0A0E1A] text-white flex flex-col">
      {/* Sticky header */}
      <header className="sticky top-0 z-50 bg-[#0A0E1A]/95 backdrop-blur border-b border-white/5 px-4 py-3 flex items-center gap-3">
        <button onClick={() => router.back()} className="p-1 text-white/60 hover:text-white">
          <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        {match.league_logo_url && (
          <Image src={match.league_logo_url} alt="" width={18} height={18} unoptimized className="opacity-80" />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-[#19E66B] truncate">{match.league}</p>
          <p className="text-[10px] text-white/40">{match.country}</p>
        </div>
      </header>

      {/* Scoreboard */}
      <div className="bg-[#111827] px-4 py-5 border-b border-white/5">
        <div className="flex items-center justify-between gap-2">
          {/* Home */}
          <div className="flex flex-col items-center gap-2 flex-1">
            <div className="w-14 h-14 bg-white rounded-full p-1.5 flex items-center justify-center shrink-0">
              {match.home_team_logo
                ? <Image src={match.home_team_logo} alt={match.home_team} width={44} height={44} className="object-contain" unoptimized />
                : <span className="text-xl">⚽</span>}
            </div>
            <span className="text-xs font-bold text-center leading-tight max-w-[80px]">{match.home_team}</span>
          </div>

          {/* Centre */}
          <div className="flex flex-col items-center gap-1">
            {match.is_live ? (
              <>
                <span className="text-[10px] font-bold text-red-500 animate-pulse tracking-wider">● LIVE {match.elapsed}&apos;</span>
                <span className="text-4xl font-black tabular-nums">{match.home_score ?? 0} - {match.away_score ?? 0}</span>
              </>
            ) : (
              <>
                <span className="text-white/40 text-[10px] uppercase tracking-widest">{match.status === 'NS' ? 'Upcoming' : match.status}</span>
                <span className="text-2xl font-bold">{kickoff.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                <span className="text-white/40 text-[10px]">{kickoff.toLocaleDateString([], { day: '2-digit', month: 'short' })}</span>
              </>
            )}
          </div>

          {/* Away */}
          <div className="flex flex-col items-center gap-2 flex-1">
            <div className="w-14 h-14 bg-white rounded-full p-1.5 flex items-center justify-center shrink-0">
              {match.away_team_logo
                ? <Image src={match.away_team_logo} alt={match.away_team} width={44} height={44} className="object-contain" unoptimized />
                : <span className="text-xl">⚽</span>}
            </div>
            <span className="text-xs font-bold text-center leading-tight max-w-[80px]">{match.away_team}</span>
          </div>
        </div>
      </div>

      {/* No odds notice */}
      {markets.length === 0 && (
        <div className="px-4 py-6 text-center text-white/40 text-sm">
          Odds not available for this match yet
        </div>
      )}

      {markets.length > 0 && (
        <>
          {/* Market count badge */}
          <div className="px-4 py-2 flex items-center gap-2 border-b border-white/5">
            <span className="text-xs text-white/40">{markets.length} markets available</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#19E66B]/10 text-[#19E66B]">Bet365</span>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 px-3 py-2 overflow-x-auto scrollbar-hide border-b border-white/5">
            {visibleTabs.map(g => (
              <button
                key={g.label}
                onClick={() => setActiveTab(g.label)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                  activeTab === g.label
                    ? 'bg-[#19E66B] text-black'
                    : 'bg-white/5 text-white/60 hover:bg-white/10'
                }`}
              >
                {g.label}
                <span className="ml-1 text-[10px] opacity-60">({(groupedMarkets[g.label] ?? []).length})</span>
              </button>
            ))}
          </div>

          {/* Markets list */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 pb-8">
            {activeMarkets.map(market => (
              <MarketCard key={market.id} market={market} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
