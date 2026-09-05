import React from 'react';
import Link from 'next/link';
import { Container } from '@/components/ui/Container';
import { FixtureTabs } from '@/components/sports/FixtureTabs';
import { TopLeagues } from '@/components/sports/TopLeagues';
import { HeroBanner } from '@/components/layout/HeroBanner';
import { apiClient, type Fixture } from '@/lib/api/client';

function LiveCard({ fix }: { fix: Fixture }) {
  return (
    <div className="bg-card border border-brand rounded-xl p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted truncate max-w-[70%]">{fix.league}</span>
        <span className="text-xs font-bold text-red-500 flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse inline-block" />
          {fix.status}&apos;
        </span>
      </div>
      <div className="flex items-center justify-between gap-2">
        <span className="font-semibold text-sm flex-1 truncate">{fix.home_team}</span>
        <span className="font-black text-primary text-lg shrink-0 px-1">
          {fix.home_score ?? 0} - {fix.away_score ?? 0}
        </span>
        <span className="font-semibold text-sm flex-1 truncate text-right">{fix.away_team}</span>
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        <button className="bg-surface border border-brand hover:border-primary rounded-lg py-2 text-center transition-colors">
          <div className="text-xs text-muted">1</div>
          <div className="font-bold text-primary text-sm">{(fix.odds_home || 1.9).toFixed(2)}</div>
        </button>
        <button className="bg-surface border border-brand hover:border-primary rounded-lg py-2 text-center transition-colors">
          <div className="text-xs text-muted">X</div>
          <div className="font-bold text-primary text-sm">{(fix.odds_draw || 3.2).toFixed(2)}</div>
        </button>
        <button className="bg-surface border border-brand hover:border-primary rounded-lg py-2 text-center transition-colors">
          <div className="text-xs text-muted">2</div>
          <div className="font-bold text-primary text-sm">{(fix.odds_away || 1.9).toFixed(2)}</div>
        </button>
      </div>
    </div>
  );
}

export default async function HomePage() {
  const liveRes = await apiClient.getLiveFixtures().catch(() => ({ data: null }));
  const liveFixtures: Fixture[] = liveRes.data ?? [];

  return (
    <div>
      {/* ── Hero Banner ── */}
      <HeroBanner />

      {/* ── Top Leagues ── */}
      <TopLeagues />

      {/* ── Live Matches ── */}
      {liveFixtures.length > 0 && (
        <section className="py-6">
          <Container>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                Live Now
                <span className="text-xs text-red-400 font-normal">({liveFixtures.length})</span>
              </h2>
              <Link href="/sports" className="text-primary text-sm font-semibold">View All →</Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {liveFixtures.slice(0, 8).map((fix) => (
                <LiveCard key={fix.id} fix={fix} />
              ))}
            </div>
          </Container>
        </section>
      )}

      {/* ── Football Matches by Date ── */}
      <section className="py-4">
        <Container>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <svg viewBox="0 0 24 24" className="w-5 h-5 text-primary" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <path d="M12 8l1.5 3H17l-2.5 2 1 3.5L12 14.5l-3.5 2 1-3.5L7 11h3.5z"/>
              </svg>
              Football
            </h2>
            <Link href="/sports" className="text-primary text-sm font-semibold">View All →</Link>
          </div>
          <FixtureTabs />
        </Container>
      </section>
    </div>
  );
}
