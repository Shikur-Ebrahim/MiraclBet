'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';

interface OddValue {
  value: string;
  odd: string;
}

interface Market {
  id: number;
  name: string;
  status?: string;
  odds_version?: number;
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

// ─── Odd Button with Animation ─────────────────────────────────────────────────
function OddButton({ value, odd, onClick, selected, disabled }: {
  value: string; odd: string;
  onClick?: () => void; selected?: boolean; disabled?: boolean;
}) {
  const [flash, setFlash] = useState<'up' | 'down' | null>(null);
  const prevVal = React.useRef(odd);

  useEffect(() => {
    if (odd !== null && prevVal.current !== null && odd !== prevVal.current && !disabled) {
      const numVal = parseFloat(odd);
      const numPrev = parseFloat(prevVal.current);
      if (!isNaN(numVal) && !isNaN(numPrev)) {
        setFlash(numVal > numPrev ? 'up' : 'down');
        const t = setTimeout(() => setFlash(null), 2000);
        return () => clearTimeout(t);
      }
    }
    prevVal.current = odd;
  }, [odd, disabled]);

  const displayVal = !isNaN(parseFloat(odd)) ? Number(odd).toFixed(2) : odd;

  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={`flex items-center justify-between rounded px-3 py-2.5 transition-all duration-300 border ${
        disabled         ? 'bg-gray-100 border-gray-100 opacity-60 cursor-not-allowed' :
        flash === 'up'   ? 'bg-[#16A34A] border-[#16A34A]' :
        flash === 'down' ? 'bg-[#DC2626] border-[#DC2626]' :
        selected         ? 'bg-[#0D8A3C] border-[#0D8A3C]' :
                           'bg-white hover:bg-[#F0FDF4] border-gray-200 hover:border-[#19E66B]/40'
      }`}
    >
      <span className={`text-[12px] transition-colors duration-300 ${
        flash ? 'text-white/90' : selected ? 'text-white font-semibold' : 'text-gray-500'
      }`}>
        {value}
      </span>
      <span className={`text-[13px] font-bold transition-colors duration-300 ${
        flash ? 'text-white' : selected ? 'text-white' : disabled ? 'text-gray-400' : 'text-[#19E66B]'
      }`}>
        {displayVal}
      </span>
    </button>
  );
}

// ─── Market Collapsible Card ───────────────────────────────────────────────────
function MarketCard({
  market, globalSelMarketId, globalSelIdx, onSelect,
}: {
  market: Market;
  globalSelMarketId: number | null;
  globalSelIdx: number | null;
  onSelect: (marketId: number, idx: number) => void;
}) {
  const [expanded, setExpanded] = useState(true);

  if (market.status === 'CLOSED') return null;

  const isSuspended = market.status === 'SUSPENDED';
  const cols = market.values.length === 2 ? 2 : market.values.length === 3 ? 3 : market.values.length % 2 === 0 ? 2 : 3;

  return (
    <div className={`mb-1.5 mx-3 mt-1.5 rounded-lg overflow-hidden border ${isSuspended ? 'border-gray-200 opacity-75' : 'border-gray-100 shadow-sm'}`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-3 py-2.5 bg-gray-50 border-b border-gray-100"
      >
        <div className="flex items-center gap-2">
          {isSuspended ? (
             <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" strokeWidth="2.5">
               <rect x="5" y="11" width="14" height="10" rx="2" ry="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>
             </svg>
          ) : (
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-[#19E66B]" fill="currentColor">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
            </svg>
          )}
          <span className="text-[12px] font-bold text-gray-800">
            {market.name} {isSuspended && <span className="text-gray-500 ml-1">(Suspended)</span>}
          </span>
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
        <div className="p-2 bg-white relative">
          <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
            {market.values.map((v, i) => {
              const isSelected = globalSelMarketId === market.id && globalSelIdx === i;
              return (
                <OddButton
                  key={i}
                  value={v.value}
                  odd={v.odd}
                  selected={isSelected}
                  disabled={isSuspended}
                  onClick={() => {
                     if (!isSuspended) onSelect(isSelected ? -1 : market.id, isSelected ? -1 : i);
                  }}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// Group markets into tabs like a real sportsbook
const MARKET_GROUPS: { label: string; filter: (m: string) => boolean }[] = [
  { label: 'All', filter: () => true },
  { label: 'Main Market', filter: (m) => ['1x2', 'match winner', 'double chance', 'draw no bet', 'both teams to score', 'home/away'].includes(m.toLowerCase()) },
  { label: 'Total', filter: (m) => m.toLowerCase().includes('total') || m.toLowerCase().includes('over/under') || m.toLowerCase().includes('goal line') },
  { label: 'Half Time', filter: (m) => m.toLowerCase().includes('half') || m.toLowerCase().includes('ht/ft') },
  { label: 'Corners', filter: (m) => m.toLowerCase().includes('corner') },
  { label: 'Handicap', filter: (m) => m.toLowerCase().includes('handicap') },
  { label: 'Score', filter: (m) => m.toLowerCase().includes('correct score') || m.toLowerCase().includes('exact score') || m.toLowerCase().includes('exact goals') },
  { label: 'Other', filter: () => true }, // will show markets not in other tabs
];

export default function MatchPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [match, setMatch] = useState<MatchDetails | null>(null);
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('All');
  // Global selection: only ONE odd can be selected across ALL markets at once
  const [globalSel, setGlobalSel] = useState<{ marketId: number; idx: number } | null>(null);
  const [isPlacing, setIsPlacing] = useState(false);
  const [betResult, setBetResult] = useState<{ success: boolean; message: string } | null>(null);

  const findMatch = useCallback(async () => {
    const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://api.miraclbet.com:8443';
    let knownSourceUrl: string | null = null;

    // 1. Instant Zero-Latency Load from session cache
    try {
      const cached = sessionStorage.getItem(`match_cache_${id}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        setMatch(parsed);
        // Use UTC date from kickoff to match what the backend expects
        const kickoffUTC = new Date(parsed.kickoff_at);
        const dateStr = kickoffUTC.toISOString().split('T')[0];
        knownSourceUrl = parsed.is_live ? `${API_BASE}/api/v1/fixtures/live` : `${API_BASE}/api/v1/fixtures?date=${dateStr}`;
        setSourceUrl(knownSourceUrl);
        setLoading(false);
      }
    } catch { /* ignore */ }

    // 2. Fetch the absolute latest odds to ensure the page isn't stale
    try {
      if (knownSourceUrl) {
        // We know exactly where to look! Just fetch one URL.
        const data = await fetch(knownSourceUrl, { cache: 'no-store' }).then(r => r.json());
        const found = (Array.isArray(data) ? data : []).find((f: MatchDetails) => f.id === id);
        if (found) setMatch(found);
      } else {
        // Fallback: If they arrived via direct link (no cache), we must search for the match.
        // To avoid browser connection limits (max 6), we fetch Live + Today + Tomorrow first.
        const baseUTC = new Date();
        const prioritySources = [
          `${API_BASE}/api/v1/fixtures/live`,
          `${API_BASE}/api/v1/fixtures?date=${baseUTC.toISOString().split('T')[0]}`,
          `${API_BASE}/api/v1/fixtures?date=${new Date(Date.UTC(baseUTC.getUTCFullYear(), baseUTC.getUTCMonth(), baseUTC.getUTCDate() + 1)).toISOString().split('T')[0]}`
        ];

        let foundMatch = null;
        for (const url of prioritySources) {
          const data = await fetch(url, { cache: 'no-store' }).then(r => r.json()).catch(() => []);
          const found = (Array.isArray(data) ? data : []).find((f: MatchDetails) => f.id === id);
          if (found) {
            foundMatch = found;
            setMatch(found);
            setSourceUrl(url);
            break;
          }
        }

        // If still not found, check the rest of the week sequentially to not overload
        if (!foundMatch) {
          for (let i = 2; i <= 7; i++) {
            const d = new Date(Date.UTC(baseUTC.getUTCFullYear(), baseUTC.getUTCMonth(), baseUTC.getUTCDate() + i));
            const url = `${API_BASE}/api/v1/fixtures?date=${d.toISOString().split('T')[0]}`;
            const data = await fetch(url, { cache: 'no-store' }).then(r => r.json()).catch(() => []);
            const found = (Array.isArray(data) ? data : []).find((f: MatchDetails) => f.id === id);
            if (found) {
              setMatch(found);
              setSourceUrl(url);
              break;
            }
          }
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [id]);

  // Hard safety timeout: if still loading after 5s, stop spinner so user sees "not found"
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 5000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => { findMatch(); }, [findMatch]);

  // Polling Effect
  useEffect(() => {
    if (!sourceUrl) return;
    const interval = setInterval(async () => {
      try {
        const data = await fetch(sourceUrl, { cache: 'no-store' }).then(r => r.json());
        const found = (Array.isArray(data) ? data : []).find((f: MatchDetails) => f.id === id);
        if (found) {
          setMatch(prev => {
            if (!prev) return found;
            if (JSON.stringify(prev.advanced_odds) !== JSON.stringify(found.advanced_odds) ||
                prev.home_score !== found.home_score || prev.away_score !== found.away_score || prev.elapsed !== found.elapsed) {
              return found;
            }
            return prev;
          });
        }
      } catch {}
    }, sourceUrl.includes('/live') ? 10000 : 30000); // 10s for live, 30s for prematch
    return () => clearInterval(interval);
  }, [sourceUrl, id]);
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

  const allMarkets = match.advanced_odds?.markets ?? [];

  // Build per-tab market lists
  const nonOtherGroups = MARKET_GROUPS.filter(g => g.label !== 'All' && g.label !== 'Other');
  const categorizedIds = new Set(
    allMarkets
      .filter(m => nonOtherGroups.some(g => g.filter(m.name)))
      .map(m => m.id)
  );

  const getMarketsForTab = (label: string) => {
    if (label === 'All') return allMarkets;
    if (label === 'Other') return allMarkets.filter(m => !categorizedIds.has(m.id));
    const grp = MARKET_GROUPS.find(g => g.label === label);
    return grp ? allMarkets.filter(m => grp.filter(m.name)) : [];
  };

  const visibleMarkets = getMarketsForTab(activeTab);

  const handleSelect = (marketId: number, idx: number) => {
    if (marketId === -1) setGlobalSel(null);
    else setGlobalSel({ marketId, idx });
    setBetResult(null);
  };

  const placeBet = async () => {
    if (!globalSel) return;
    setIsPlacing(true);
    setBetResult(null);
    
    const market = allMarkets.find(m => m.id === globalSel.marketId);
    if (!market) return;
    const selection = market.values[globalSel.idx];

    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://api.miraclbet.com:8443';
      const res = await fetch(`${API_BASE}/api/v1/bets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fixture_id: match.id,
          market_id: market.id,
          selection: selection.value,
          odds: parseFloat(selection.odd),
          odds_version: market.odds_version || 1
        })
      });
      const data = await res.json();
      setBetResult(data);
      if (data.success) {
        setTimeout(() => setGlobalSel(null), 2000); // clear selection on success
      }
    } catch {
      setBetResult({ success: false, message: 'Network error. Please try again.' });
    } finally {
      setIsPlacing(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 flex flex-col font-sans relative pb-20">

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
                  <span>{new Date(match.kickoff_at).toLocaleDateString()} {new Date(match.kickoff_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
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

      {/* Market Tabs — only show tabs that have at least one market */}
      <div className="px-3 py-2.5 border-b border-gray-100 bg-white overflow-x-auto scrollbar-hide flex gap-2">
        {MARKET_GROUPS.map(g => {
          const count = getMarketsForTab(g.label).length;
          if (count === 0) return null;
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
              <span className="ml-1 text-[10px] opacity-70">({count})</span>
            </button>
          );
        })}
      </div>

      {/* Markets List */}
      <div className="flex-1 overflow-y-auto pb-8 bg-gray-50">
        {visibleMarkets.length > 0 ? (
          visibleMarkets.map(market => (
            <MarketCard
              key={market.id}
              market={market}
              globalSelMarketId={globalSel?.marketId ?? null}
              globalSelIdx={globalSel?.idx ?? null}
              onSelect={handleSelect}
            />
          ))
        ) : (
          <div className="text-center py-10 text-gray-400 text-sm">
            No odds available for this tab.
          </div>
        )}
      </div>

      {/* Bet Slip Footer (Only visible when selection is active) */}
      {globalSel && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-[0_-4px_10px_rgba(0,0,0,0.05)] p-4 z-50">
          {betResult && (
            <div className={`mb-3 p-2 text-center text-sm font-bold rounded-lg ${betResult.success ? 'bg-[#E8FFF2] text-[#0D8A3C]' : 'bg-red-50 text-red-600'}`}>
              {betResult.message}
            </div>
          )}
          <button
            onClick={placeBet}
            disabled={isPlacing}
            className={`w-full py-3.5 rounded-xl text-white font-bold text-sm shadow-md transition-all ${
              isPlacing ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#0D8A3C] hover:bg-[#0A6B2E]'
            }`}
          >
            {isPlacing ? 'Validating...' : 'Place Bet'}
          </button>
        </div>
      )}
    </div>
  );
}
