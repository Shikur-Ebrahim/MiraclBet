'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import { clsx } from 'clsx';

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

function MatchRow({ fix }: { fix: Fixture }) {
  const kickoff = new Date(fix.kickoff_at);
  const timeStr = kickoff.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const dateStr = kickoff.toLocaleDateString([], { day: '2-digit', month: '2-digit' });

  return (
    <div className="bg-white border-b border-gray-100 last:border-b-0 px-3 py-3">
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
          { label: '1', val: fix.odds_home },
          { label: 'X', val: fix.odds_draw },
          { label: '2', val: fix.odds_away },
        ].map(({ label, val }) => (
          <button
            key={label}
            className="bg-[#E4E9F2] hover:bg-[#D5DCE8] active:bg-[#C6CFDE] rounded-md py-2.5 px-3 flex items-center justify-center transition-colors"
          >
            <div className="text-[14px] font-semibold text-gray-900">{(val || 1.9).toFixed(2)}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

function LeagueGroup({
  league, fixtures, leagueLogoUrl, defaultExpanded,
}: {
  league: string; fixtures: Fixture[]; leagueLogoUrl?: string; defaultExpanded: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const headerRef = useRef<HTMLDivElement>(null);
  const logoUrl = getLeagueLogo(league, leagueLogoUrl);

  // Auto-open when scrolled into view (for collapsed sections loaded via scroll)
  useEffect(() => {
    if (defaultExpanded) return;
    const el = headerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setExpanded(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [defaultExpanded]);

  return (
    <div className="mb-4 rounded-xl overflow-hidden shadow-sm" ref={headerRef}>
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
}

export function FixtureTabs({ sport = 'football', timeRange = 6, leagueId, activeTab = 'prematch' }: FixtureTabsProps) {
  const [allFixtures, setAllFixtures] = useState<Fixture[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [dayIndex, setDayIndex] = useState(0);          // which day we last loaded
  const [hasMoreDays, setHasMoreDays] = useState(true);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://api.miraclbet.com:8443';

  // Which leagues were in the very first batch (shown expanded)
  const initialLeaguesRef = useRef<Set<string> | null>(null);

  // Fetch a single day's worth of fixtures
  const fetchDay = useCallback(async (dayOffset: number) => {
    const d = new Date();
    d.setDate(d.getDate() + dayOffset);
    const dateStr = d.toISOString().split('T')[0];
    let url = `${API_BASE}/api/v1/fixtures?date=${dateStr}&sport=${sport}`;
    if (leagueId) url += `&league=${leagueId}`;
    try {
      const data = await fetch(url, { cache: 'no-store' }).then(r => r.json());
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  }, [API_BASE, sport, leagueId]);

  // Initial load: today only
  useEffect(() => {
    setAllFixtures([]);
    setDayIndex(0);
    setHasMoreDays(timeRange > 0);
    initialLeaguesRef.current = null;

    if (activeTab === 'live') {
      setLoading(true);
      let url = `${API_BASE}/api/v1/fixtures/live?sport=${sport}`;
      if (leagueId) url += `&league=${leagueId}`;
      fetch(url, { cache: 'no-store' })
        .then(r => r.json())
        .then(data => {
          const fixtures = Array.isArray(data) ? data : [];
          setAllFixtures(fixtures);
          initialLeaguesRef.current = new Set(fixtures.map((f: Fixture) => f.league || 'Other'));
          setHasMoreDays(false);
        })
        .catch(() => setAllFixtures([]))
        .finally(() => setLoading(false));
    } else {
      setLoading(true);
      fetchDay(0)
        .then(fixtures => {
          setAllFixtures(fixtures);
          initialLeaguesRef.current = new Set(fixtures.map((f: Fixture) => f.league || 'Other'));
        })
        .finally(() => setLoading(false));
    }
  }, [sport, leagueId, activeTab, timeRange, fetchDay, API_BASE]);

  // Infinite scroll: when sentinel is visible and we have more days, load next day
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(async entries => {
      if (entries[0].isIntersecting && !loadingMore && hasMoreDays && activeTab !== 'live') {
        const nextDay = dayIndex + 1;
        if (nextDay > timeRange) {
          setHasMoreDays(false);
          return;
        }
        setLoadingMore(true);
        const newFixtures = await fetchDay(nextDay);
        setAllFixtures(prev => {
          const merged = [...prev, ...newFixtures];
          const unique = Array.from(new Map(merged.map(f => [f.id, f])).values());
          unique.sort((a, b) => new Date(a.kickoff_at).getTime() - new Date(b.kickoff_at).getTime());
          return unique;
        });
        setDayIndex(nextDay);
        if (nextDay >= timeRange) setHasMoreDays(false);
        setLoadingMore(false);
      }
    }, { threshold: 0.1 });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [dayIndex, loadingMore, hasMoreDays, timeRange, activeTab, fetchDay]);

  // Group by league
  const grouped: Record<string, { fixtures: Fixture[]; logoUrl?: string }> = {};
  for (const fix of allFixtures) {
    const key = fix.league || 'Other';
    if (!grouped[key]) grouped[key] = { fixtures: [], logoUrl: fix.league_logo_url };
    grouped[key].fixtures.push(fix);
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
          {Object.entries(grouped).map(([league, { fixtures, logoUrl }]) => {
            // Leagues from the first fetch are open, new ones from scroll start collapsed
            const isInitial = initialLeaguesRef.current?.has(league) ?? true;
            return (
              <LeagueGroup
                key={league}
                league={league}
                fixtures={fixtures}
                leagueLogoUrl={logoUrl}
                defaultExpanded={isInitial}
              />
            );
          })}

          {/* Scroll sentinel */}
          {(hasMoreDays || loadingMore) && (
            <div ref={sentinelRef} className="py-6 flex items-center justify-center gap-2 text-muted text-sm">
              {loadingMore ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                  </svg>
                  Loading more matches...
                </>
              ) : (
                <span className="text-white/20 text-xs">↓ Scroll for more</span>
              )}
            </div>
          )}
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
