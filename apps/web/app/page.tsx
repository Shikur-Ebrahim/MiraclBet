import React from 'react';
import Link from 'next/link';
import { Container } from '@/components/ui/Container';
import { Button } from '@/components/ui/Button';
import { SportCard } from '@/components/sports/SportCard';
import { Trophy, Zap, Shield, Star, Activity, CircleDollarSign } from 'lucide-react';
import { apiClient, type Fixture } from '@/lib/api/client';

// ---- Live Event Card (inline, server component) ----
function LiveCard({ fix }: { fix: Fixture }) {
  const time = fix.is_live && fix.status ? fix.status : new Date(fix.kickoff_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return (
    <div className="bg-card border border-brand rounded-xl p-4 flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted truncate max-w-[70%]">{fix.league}</span>
        {fix.is_live
          ? <span className="text-xs font-bold text-red-500 flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 animate-pulse inline-block" />{time}&apos;</span>
          : <span className="text-xs text-muted">{time}</span>
        }
      </div>
      {/* Teams + Score */}
      <div className="flex items-center justify-between gap-2">
        <span className="font-semibold text-sm flex-1 truncate">{fix.home_team}</span>
        <div className="flex items-center gap-1 shrink-0 px-2">
          {fix.home_score !== null && fix.away_score !== null
            ? <span className="font-black text-primary text-lg">{fix.home_score} - {fix.away_score}</span>
            : <span className="text-muted text-sm">vs</span>
          }
        </div>
        <span className="font-semibold text-sm flex-1 truncate text-right">{fix.away_team}</span>
      </div>
      {/* Odds */}
      <div className="grid grid-cols-3 gap-2">
        <button className="bg-surface border border-brand hover:border-primary transition-colors rounded-lg py-2 text-center">
          <div className="text-xs text-muted">1</div>
          <div className="font-bold text-primary text-sm">{fix.odds_home.toFixed(2)}</div>
        </button>
        <button className="bg-surface border border-brand hover:border-primary transition-colors rounded-lg py-2 text-center">
          <div className="text-xs text-muted">X</div>
          <div className="font-bold text-primary text-sm">{fix.odds_draw.toFixed(2)}</div>
        </button>
        <button className="bg-surface border border-brand hover:border-primary transition-colors rounded-lg py-2 text-center">
          <div className="text-xs text-muted">2</div>
          <div className="font-bold text-primary text-sm">{fix.odds_away.toFixed(2)}</div>
        </button>
      </div>
    </div>
  );
}

// ---- Upcoming match row ----
function UpcomingRow({ fix }: { fix: Fixture }) {
  const time = new Date(fix.kickoff_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return (
    <div className="bg-card border border-brand rounded-xl p-3 flex items-center gap-3">
      <div className="text-xs text-muted w-10 shrink-0 text-center">{time}</div>
      <div className="flex-1 min-w-0">
        <div className="text-xs text-muted truncate mb-0.5">{fix.league}</div>
        <div className="flex items-center gap-1">
          <span className="text-sm font-semibold truncate">{fix.home_team}</span>
          <span className="text-muted text-xs mx-1">vs</span>
          <span className="text-sm font-semibold truncate">{fix.away_team}</span>
        </div>
      </div>
      <div className="flex gap-1 shrink-0">
        <button className="bg-surface border border-brand hover:border-primary rounded-lg px-2.5 py-1.5 text-xs font-bold text-primary transition-colors">{fix.odds_home.toFixed(2)}</button>
        <button className="bg-surface border border-brand hover:border-primary rounded-lg px-2.5 py-1.5 text-xs font-bold text-primary transition-colors">{fix.odds_draw.toFixed(2)}</button>
        <button className="bg-surface border border-brand hover:border-primary rounded-lg px-2.5 py-1.5 text-xs font-bold text-primary transition-colors">{fix.odds_away.toFixed(2)}</button>
      </div>
    </div>
  );
}

// ---- Main page (Server Component — fetches data at render time) ----
export default async function HomePage() {
  const [liveRes, todayRes] = await Promise.allSettled([
    apiClient.getLiveFixtures(),
    apiClient.getTodayFixtures(),
  ]);

  const liveFixtures: Fixture[] = liveRes.status === 'fulfilled' && liveRes.value.data ? liveRes.value.data : [];
  const todayFixtures: Fixture[] = todayRes.status === 'fulfilled' && todayRes.value.data ? todayRes.value.data : [];

  return (
    <div>
      {/* ── Hero ── */}
      <section className="relative px-4 py-10 sm:py-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-brand-surface/40 to-dark -z-10" />
        <Container>
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/30 rounded-full px-3 py-1 mb-4">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="text-xs text-primary font-semibold">{liveFixtures.length} Live Matches Now</span>
            </div>
            <h1 className="text-4xl sm:text-6xl font-black mb-4 tracking-tight leading-tight">
              Bet Smarter.<br />
              <span className="text-primary">Win Bigger.</span>
            </h1>
            <p className="text-base text-muted mb-6 leading-relaxed">
              Live odds, instant payouts, and a platform built for winners.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link href="/register" className="w-full sm:w-auto">
                <Button size="lg" className="w-full font-bold">Join Now — Free</Button>
              </Link>
              <Link href="/sports" className="w-full sm:w-auto">
                <Button size="lg" variant="secondary" className="w-full">Browse Sports</Button>
              </Link>
            </div>
          </div>
        </Container>
      </section>

      {/* ── Stats Bar ── */}
      <section className="border-y border-brand bg-surface/50 py-4">
        <Container>
          <div className="flex overflow-x-auto gap-0 divide-x divide-brand">
            <div className="flex flex-col items-center px-6 py-1 min-w-[120px] flex-1">
              <Activity className="w-5 h-5 text-primary mb-1" />
              <span className="text-lg font-bold">{liveFixtures.length || '50'}+</span>
              <span className="text-xs text-muted">Live Now</span>
            </div>
            <div className="flex flex-col items-center px-6 py-1 min-w-[120px] flex-1">
              <Zap className="w-5 h-5 text-primary mb-1" />
              <span className="text-lg font-bold">{todayFixtures.length || '100'}+</span>
              <span className="text-xs text-muted">Today</span>
            </div>
            <div className="flex flex-col items-center px-6 py-1 min-w-[120px] flex-1">
              <CircleDollarSign className="w-5 h-5 text-primary mb-1" />
              <span className="text-lg font-bold">Fast</span>
              <span className="text-xs text-muted">Payouts</span>
            </div>
          </div>
        </Container>
      </section>

      {/* ── Live Matches ── */}
      {liveFixtures.length > 0 && (
        <section className="py-8 sm:py-12">
          <Container>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                Live Now
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

      {/* ── Today's Matches ── */}
      <section className="py-8 sm:py-12 bg-surface/20">
        <Container>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl sm:text-2xl font-bold">Today&apos;s Matches</h2>
            <Link href="/sports" className="text-primary text-sm font-semibold">View All →</Link>
          </div>
          {todayFixtures.length > 0 ? (
            <div className="flex flex-col gap-2">
              {todayFixtures.slice(0, 10).map((fix) => (
                <UpcomingRow key={fix.id} fix={fix} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted">
              <p className="text-lg mb-2">No fixtures yet for today</p>
              <p className="text-sm">Data syncs automatically once the Football API is active</p>
            </div>
          )}
        </Container>
      </section>

      {/* ── Sports Grid ── */}
      <section className="py-8 sm:py-12">
        <Container>
          <div className="flex justify-between items-center mb-5">
            <h2 className="text-xl sm:text-2xl font-bold">Popular Sports</h2>
            <Link href="/sports" className="text-primary text-sm font-semibold">View All →</Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <SportCard name="Football" icon={<Trophy />} eventCount={142} href="/sports/football" />
            <SportCard name="Basketball" icon={<Trophy />} eventCount={45} href="/sports/basketball" />
            <SportCard name="Tennis" icon={<Trophy />} eventCount={38} href="/sports/tennis" />
            <SportCard name="Cricket" icon={<Trophy />} eventCount={12} href="/sports/cricket" />
            <SportCard name="Baseball" icon={<Trophy />} eventCount={24} href="/sports/baseball" />
            <SportCard name="Rugby" icon={<Trophy />} eventCount={8} href="/sports/rugby" />
          </div>
        </Container>
      </section>

      {/* ── Why Us ── */}
      <section className="py-10 sm:py-16 bg-surface/20">
        <Container>
          <h2 className="text-xl sm:text-2xl font-bold text-center mb-6">Why Choose MiraclBet?</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-card border border-brand p-5 rounded-2xl text-center">
              <Shield className="w-9 h-9 text-primary mx-auto mb-3" />
              <h3 className="font-bold mb-1">Bank-Grade Security</h3>
              <p className="text-sm text-muted">Industry-leading encryption protects your funds and data.</p>
            </div>
            <div className="bg-card border border-brand p-5 rounded-2xl text-center">
              <Star className="w-9 h-9 text-primary mx-auto mb-3" />
              <h3 className="font-bold mb-1">VIP Treatment</h3>
              <p className="text-sm text-muted">Exclusive rewards, better odds, and dedicated support.</p>
            </div>
            <div className="bg-card border border-brand p-5 rounded-2xl text-center">
              <Activity className="w-9 h-9 text-primary mx-auto mb-3" />
              <h3 className="font-bold mb-1">Instant Settlements</h3>
              <p className="text-sm text-muted">Winning bets settled immediately after the event ends.</p>
            </div>
          </div>
        </Container>
      </section>

      {/* ── Bottom CTA ── */}
      <section className="py-10 border-t border-brand">
        <Container>
          <div className="text-center px-4">
            <h2 className="text-2xl sm:text-3xl font-black mb-2">Ready to start winning?</h2>
            <p className="text-muted text-sm mb-5">Join thousands of bettors already on MiraclBet.</p>
            <Link href="/register" className="block sm:inline-block">
              <Button size="lg" className="w-full sm:w-auto font-bold px-10">Create Free Account</Button>
            </Link>
          </div>
        </Container>
      </section>
    </div>
  );
}
