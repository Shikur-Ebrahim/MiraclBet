'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { Fixture } from '@/lib/api/client';
import { clsx } from 'clsx';

// Map league name → API-Football league ID for logos
const LEAGUE_LOGO_MAP: Record<string, string> = {
  'Premier League': '39',
  'La Liga': '140',
  'Serie A': '135',
  'Bundesliga': '78',
  'Ligue 1': '61',
  'UEFA Champions League': '2',
  'UEFA Europa League': '3',
  'UEFA Nations League': '5',
  'Copa Libertadores': '13',
};

function getLeagueLogo(leagueName: string): string | null {
  for (const [key, id] of Object.entries(LEAGUE_LOGO_MAP)) {
    if (leagueName.toLowerCase().includes(key.toLowerCase())) {
      return `https://media.api-sports.io/football/leagues/${id}.png`;
    }
  }
  return null;
}

function MatchCard({ fix }: { fix: Fixture }) {
  const kickoff = new Date(fix.kickoff_at);
  const timeStr = kickoff.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const dateStr = kickoff.toLocaleDateString([], { day: '2-digit', month: '2-digit' });

  return (
    <div
      className="border-b border-brand/40 px-3 py-3 hover:bg-white/5 transition-colors cursor-pointer"
    >
      {/* Match row */}
      <div className="flex items-center gap-2 mb-2.5">
        {/* Home team */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="w-7 h-7 rounded-full bg-surface border border-brand flex items-center justify-center shrink-0">
            <svg viewBox="0 0 24 24" className="w-4 h-4 text-primary/60" fill="currentColor">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" fill="none"/>
              <path d="M12 6l2 4h-4l2-4z" fill="currentColor" opacity="0.7"/>
            </svg>
          </div>
          <span className="text-sm font-semibold text-white truncate">{fix.home_team}</span>
        </div>

        {/* Score / Time */}
        <div className="shrink-0 text-center min-w-[60px]">
          {fix.is_live ? (
            <div>
              <div className="text-base font-black text-primary">{fix.home_score ?? 0} - {fix.away_score ?? 0}</div>
              <div className="text-xs text-red-400 flex items-center justify-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse inline-block"/>
                {fix.status}
              </div>
            </div>
          ) : (
            <div>
              <div className="text-sm font-black text-white">{timeStr}</div>
              <div className="text-xs text-muted">{dateStr}</div>
            </div>
          )}
        </div>

        {/* Away team */}
        <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
          <span className="text-sm font-semibold text-white truncate text-right">{fix.away_team}</span>
          <div className="w-7 h-7 rounded-full bg-surface border border-brand flex items-center justify-center shrink-0">
            <svg viewBox="0 0 24 24" className="w-4 h-4 text-primary/60" fill="currentColor">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" fill="none"/>
              <path d="M12 6l2 4h-4l2-4z" fill="currentColor" opacity="0.7"/>
            </svg>
          </div>
        </div>
      </div>

      {/* Odds row */}
      <div className="grid grid-cols-3 gap-1.5">
        <button className="bg-surface border border-brand hover:border-primary hover:bg-primary/10 rounded-lg py-2 text-center transition-colors group">
          <div className="text-xs text-muted group-hover:text-primary">1</div>
          <div className="text-sm font-bold text-primary">{(fix.odds_home || 1.9).toFixed(2)}</div>
        </button>
        <button className="bg-surface border border-brand hover:border-primary hover:bg-primary/10 rounded-lg py-2 text-center transition-colors group">
          <div className="text-xs text-muted group-hover:text-primary">X</div>
          <div className="text-sm font-bold text-primary">{(fix.odds_draw || 3.2).toFixed(2)}</div>
        </button>
        <button className="bg-surface border border-brand hover:border-primary hover:bg-primary/10 rounded-lg py-2 text-center transition-colors group">
          <div className="text-xs text-muted group-hover:text-primary">2</div>
          <div className="text-sm font-bold text-primary">{(fix.odds_away || 1.9).toFixed(2)}</div>
        </button>
      </div>
    </div>
  );
}

function LeagueGroup({ league, fixtures }: { league: string; fixtures: Fixture[] }) {
  const [expanded, setExpanded] = useState(true);
  const logoUrl = getLeagueLogo(league);

  return (
    <div className="mb-2 rounded-xl overflow-hidden border border-brand/50">
      {/* League header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-white/5 transition-colors"
        style={{ background: '#0D2018' }}
      >
        <div className="w-5 h-5 shrink-0">
          {logoUrl ? (
            <Image src={logoUrl} alt={league} width={20} height={20} className="object-contain" unoptimized />
          ) : (
            <svg viewBox="0 0 24 24" className="w-5 h-5 text-primary" fill="currentColor">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none"/>
            </svg>
          )}
        </div>
        <span className="text-sm font-bold text-white flex-1 truncate">Football. {league}</span>
        <svg
          viewBox="0 0 24 24"
          className={clsx('w-4 h-4 text-muted transition-transform', expanded ? 'rotate-180' : '')}
          fill="none" stroke="currentColor" strokeWidth="2"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* Matches */}
      {expanded && (
        <div style={{ background: '#0A1810' }}>
          {fixtures.map((fix) => (
            <MatchCard key={fix.id} fix={fix} />
          ))}
        </div>
      )}
    </div>
  );
}

export function FixtureTabs() {
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [loading, setLoading] = useState(false);

  const dates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return d;
  });

  const [selectedDate, setSelectedDate] = useState(dates[0].toISOString().split('T')[0]);

  const fetchFixtures = useCallback(async (dateStr: string) => {
    setLoading(true);
    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://api.miraclbet.com:8443';
      const res = await fetch(`${API_BASE}/api/v1/fixtures?date=${dateStr}`, { cache: 'no-store' });
      const data = await res.json();
      setFixtures(Array.isArray(data) ? data : []);
    } catch {
      setFixtures([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFixtures(selectedDate);
  }, [selectedDate, fetchFixtures]);

  const formatDateLabel = (d: Date, index: number) => {
    if (index === 0) return 'Today';
    if (index === 1) return 'Tomorrow';
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  // Group fixtures by league
  const grouped: Record<string, Fixture[]> = {};
  for (const fix of fixtures) {
    const key = fix.league || 'Other';
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(fix);
  }

  return (
    <div>
      {/* Date tabs */}
      <div className="flex overflow-x-auto gap-2 mb-4 pb-1" style={{ scrollbarWidth: 'none' }}>
        {dates.map((d, i) => {
          const dateStr = d.toISOString().split('T')[0];
          const isSelected = selectedDate === dateStr;
          return (
            <button
              key={dateStr}
              onClick={() => setSelectedDate(dateStr)}
              className={clsx(
                'whitespace-nowrap px-4 py-2 rounded-lg text-sm font-semibold transition-all shrink-0',
                isSelected
                  ? 'bg-primary text-dark shadow-lg shadow-primary/30'
                  : 'bg-surface border border-brand text-muted hover:text-white hover:border-primary/50'
              )}
            >
              {formatDateLabel(d, i)}
            </button>
          );
        })}
      </div>

      {/* Content */}
      {loading ? (
        <div className="py-12 flex items-center justify-center gap-2 text-muted">
          <svg className="animate-spin h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
          </svg>
          Loading matches...
        </div>
      ) : Object.keys(grouped).length > 0 ? (
        <div>
          {Object.entries(grouped).map(([league, leagueFixtures]) => (
            <LeagueGroup key={league} league={league} fixtures={leagueFixtures} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-muted bg-surface/30 rounded-xl border border-brand">
          <p className="text-lg mb-1">No fixtures scheduled</p>
          <p className="text-sm">Check another date</p>
        </div>
      )}
    </div>
  );
}
