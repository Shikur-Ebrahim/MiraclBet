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

// ─── Odd Button Layout (Horizontal label and odd) ─────────────────────────────
function OddButton({ label, value, odd, onClick, selected }: {
  label?: string; value: string; odd: string;
  onClick?: () => void; selected?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center justify-between rounded px-3 py-2.5 transition-colors ${
        selected
          ? 'bg-[#1e2a38] border border-[#ffb800]'
          : 'bg-[#151c26] hover:bg-[#1e2a38] border border-transparent'
      }`}
    >
      <span className={`text-[12px] ${selected ? 'text-white' : 'text-gray-400'}`}>
        {label || value}
      </span>
      <span className="text-[13px] font-bold text-[#19E66B]">{odd}</span>
    </button>
  );
}

// ─── Market Collapsible Card ──────────────────────────────────────────────────
function MarketCard({ market }: { market: Market }) {
  const [expanded, setExpanded] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);

  // Grouping columns (e.g. 1X2 -> 3 cols, BTTS -> 2 cols)
  const cols = market.values.length === 3 ? 3 : market.values.length % 2 === 0 ? 2 : 3;

  return (
    <div className="mb-2">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-3 py-3 bg-[#111827] border-b border-[#1e2a38]"
      >
        <div className="flex items-center gap-2">
          <svg viewBox="0 0 24 24" className="w-4 h-4 text-[#ffb800]" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
          </svg>
          <span className="text-[13px] font-bold text-white uppercase tracking-wide">{market.name}</span>
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
        <div className="p-3 bg-[#0f151f]">
          <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
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

  if (loading) return <FullPageLoader />;
  if (!match) return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#0d131c] text-white">
      <p className="text-xl mb-4">Match not found</p>
      <button onClick={() => router.back()} className="px-4 py-2 bg-[#ffb800] text-black font-bold rounded-lg">← Go Back</button>
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
    <div className="min-h-screen bg-[#0d131c] text-white flex flex-col font-sans">
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between border-b border-[#1e2a38]">
        <span className="text-[13px] text-gray-300">{match.league}</span>
        <button onClick={() => router.back()} className="w-6 h-6 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20">
          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" strokeWidth="3">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Match Scoreboard */}
      <div className="px-4 py-6 border-b border-[#1e2a38]">
        <div className="flex items-center justify-between mb-4">
          {/* Home Team */}
          <div className="flex flex-col items-center flex-1 gap-2">
            <div className="w-12 h-12 flex items-center justify-center">
              {match.home_team_logo
                ? <Image src={match.home_team_logo} alt={match.home_team} width={48} height={48} className="object-contain" unoptimized />
                : <span className="text-2xl">⚽</span>}
            </div>
            <span className="text-[12px] font-semibold text-center text-white">{match.home_team}</span>
          </div>

          {/* Center (VS or Score) */}
          <div className="flex flex-col items-center justify-center shrink-0 w-24">
            {match.is_live ? (
              <div className="flex flex-col items-center">
                <span className="text-[11px] text-red-500 font-bold mb-1 animate-pulse">LIVE {match.elapsed}'</span>
                <span className="text-2xl font-black">{match.home_score} - {match.away_score}</span>
              </div>
            ) : (
              <span className="text-xl font-black text-white">VS</span>
            )}
            {!match.is_live && (
              <div className="flex items-center gap-1 text-[11px] text-gray-400 mt-1">
                <svg viewBox="0 0 24 24" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                </svg>
                <span>{dateStr} {timeStr}</span>
              </div>
            )}
          </div>

          {/* Away Team */}
          <div className="flex flex-col items-center flex-1 gap-2">
            <div className="w-12 h-12 flex items-center justify-center">
              {match.away_team_logo
                ? <Image src={match.away_team_logo} alt={match.away_team} width={48} height={48} className="object-contain" unoptimized />
                : <span className="text-2xl">⚽</span>}
            </div>
            <span className="text-[12px] font-semibold text-center text-white">{match.away_team}</span>
          </div>
        </div>
      </div>

      {/* Market Tabs */}
      <div className="px-3 py-3 border-b border-[#1e2a38] overflow-x-auto scrollbar-hide flex gap-2">
        {MARKET_GROUPS.map(g => {
          const count = g.label === 'All' ? allMarkets.length : allMarkets.filter(m => g.filter(m.name)).length;
          if (count === 0 && g.label !== 'All') return null;
          
          const isActive = activeTab === g.label;
          return (
            <button
              key={g.label}
              onClick={() => setActiveTab(g.label)}
              className={`whitespace-nowrap rounded-full px-4 py-1.5 text-[12px] font-medium transition-colors ${
                isActive
                  ? 'border border-[#ffb800] text-white bg-transparent'
                  : 'text-gray-400 bg-[#1e2a38] hover:bg-[#28374a]'
              }`}
            >
              {g.label}
            </button>
          );
        })}
      </div>

      {/* Markets List */}
      <div className="flex-1 overflow-y-auto pb-8 bg-[#0d131c]">
        {visibleMarkets.length > 0 ? (
          visibleMarkets.map(market => (
            <MarketCard key={market.id} market={market} />
          ))
        ) : (
          <div className="text-center py-10 text-gray-500 text-sm">
            No odds available for this tab.
          </div>
        )}
      </div>
    </div>
  );
}
