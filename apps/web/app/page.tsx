import React from 'react';
import { Container } from '@/components/ui/Container';
import { Button } from '@/components/ui/Button';
import { SportCard } from '@/components/sports/SportCard';
import { EventCard } from '@/components/sports/EventCard';
import Link from 'next/link';
import { Trophy, Zap, Shield, Star, Activity, CircleDollarSign } from 'lucide-react';

export default function HomePage() {
  return (
    <div>
      {/* Hero Section — mobile first */}
      <section className="relative px-4 py-12 sm:py-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-brand-surface/50 to-dark -z-10" />
        <Container>
          <div className="max-w-2xl">
            <h1 className="text-4xl sm:text-5xl md:text-7xl font-black mb-4 sm:mb-6 tracking-tight leading-tight">
              Bet Smarter.<br />
              <span className="text-primary">Win Bigger.</span>
            </h1>
            <p className="text-base sm:text-lg text-muted mb-6 sm:mb-8 max-w-xl leading-relaxed">
              Experience the next generation of sports betting. Industry-leading odds, instant deposits, and a platform built for winners.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <Link href="/register" className="w-full sm:w-auto">
                <Button size="lg" className="w-full font-bold text-lg">Join Now — It&apos;s Free</Button>
              </Link>
              <Link href="/sports" className="w-full sm:w-auto">
                <Button size="lg" variant="secondary" className="w-full text-lg">Browse Sports</Button>
              </Link>
            </div>
          </div>
        </Container>
      </section>

      {/* Stats Bar — horizontal scroll on mobile */}
      <section className="border-y border-brand bg-surface/50 py-6">
        <Container>
          <div className="flex overflow-x-auto gap-0 divide-x divide-brand">
            <div className="flex flex-col items-center justify-center px-6 py-2 min-w-[130px] flex-1">
              <Activity className="w-7 h-7 text-primary mb-1" />
              <h3 className="text-xl font-bold whitespace-nowrap">50+ Sports</h3>
              <p className="text-xs text-muted whitespace-nowrap">Global coverage</p>
            </div>
            <div className="flex flex-col items-center justify-center px-6 py-2 min-w-[130px] flex-1">
              <Zap className="w-7 h-7 text-primary mb-1" />
              <h3 className="text-xl font-bold whitespace-nowrap">Live Betting</h3>
              <p className="text-xs text-muted whitespace-nowrap">In-play 24/7</p>
            </div>
            <div className="flex flex-col items-center justify-center px-6 py-2 min-w-[130px] flex-1">
              <CircleDollarSign className="w-7 h-7 text-primary mb-1" />
              <h3 className="text-xl font-bold whitespace-nowrap">Fast Payouts</h3>
              <p className="text-xs text-muted whitespace-nowrap">Secure & instant</p>
            </div>
          </div>
        </Container>
      </section>

      {/* Featured Sports — 2 cols on mobile */}
      <section className="py-10 sm:py-16">
        <Container>
          <div className="flex justify-between items-center mb-5 sm:mb-8">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold mb-1">Popular Sports</h2>
              <p className="text-sm text-muted">Explore markets worldwide</p>
            </div>
            <Link href="/sports" className="text-primary hover:text-primary-hover text-sm font-semibold whitespace-nowrap">
              View All →
            </Link>
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

      {/* Live Events — 1 col on mobile */}
      <section className="py-10 sm:py-16 bg-surface/30">
        <Container>
          <h2 className="text-2xl sm:text-3xl font-bold mb-5 sm:mb-8 flex items-center gap-3">
            <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
            Live Now
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <EventCard
              league="Premier League" homeTeam="Arsenal" awayTeam="Chelsea"
              time="65'" isLive score={{home: 1, away: 0}}
              odds={{home: 1.45, draw: 3.20, away: 5.50}}
            />
            <EventCard
              league="La Liga" homeTeam="Real Madrid" awayTeam="Barcelona"
              time="12'" isLive score={{home: 0, away: 0}}
              odds={{home: 2.10, draw: 3.40, away: 2.80}}
            />
            <EventCard
              league="Serie A" homeTeam="Juventus" awayTeam="AC Milan"
              time="45'" isLive score={{home: 2, away: 1}}
              odds={{home: 1.15, draw: 6.50, away: 12.00}}
            />
            <EventCard
              league="Bundesliga" homeTeam="Bayern" awayTeam="Dortmund"
              time="89'" isLive score={{home: 3, away: 3}}
              odds={{home: 7.50, draw: 1.20, away: 9.00}}
            />
          </div>
        </Container>
      </section>

      {/* Features — 1 col on mobile */}
      <section className="py-12 sm:py-20">
        <Container>
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-8 sm:mb-12">Why Choose MiraclBet?</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-8">
            <div className="bg-surface border border-brand p-6 sm:p-8 rounded-2xl text-center">
              <Shield className="w-10 h-10 sm:w-12 sm:h-12 text-primary mx-auto mb-3 sm:mb-4" />
              <h3 className="text-lg sm:text-xl font-bold mb-2 sm:mb-3">Bank-Grade Security</h3>
              <p className="text-sm text-muted leading-relaxed">Your funds and data are protected by industry-leading encryption and security protocols.</p>
            </div>
            <div className="bg-surface border border-brand p-6 sm:p-8 rounded-2xl text-center">
              <Star className="w-10 h-10 sm:w-12 sm:h-12 text-primary mx-auto mb-3 sm:mb-4" />
              <h3 className="text-lg sm:text-xl font-bold mb-2 sm:mb-3">VIP Treatment</h3>
              <p className="text-sm text-muted leading-relaxed">Enjoy exclusive rewards, better odds, and dedicated support when you bet with us.</p>
            </div>
            <div className="bg-surface border border-brand p-6 sm:p-8 rounded-2xl text-center">
              <Activity className="w-10 h-10 sm:w-12 sm:h-12 text-primary mx-auto mb-3 sm:mb-4" />
              <h3 className="text-lg sm:text-xl font-bold mb-2 sm:mb-3">Instant Settlements</h3>
              <p className="text-sm text-muted leading-relaxed">No more waiting. Your winning bets are settled immediately after the event concludes.</p>
            </div>
          </div>
        </Container>
      </section>

      {/* Bottom CTA */}
      <section className="py-12 bg-surface border-t border-brand">
        <Container>
          <div className="text-center px-4">
            <h2 className="text-2xl sm:text-4xl font-black mb-3">Ready to start winning?</h2>
            <p className="text-muted text-sm sm:text-base mb-6">Join thousands of bettors already using MiraclBet.</p>
            <Link href="/register" className="block sm:inline-block">
              <Button size="lg" className="w-full sm:w-auto font-bold text-lg px-10">Create Free Account</Button>
            </Link>
          </div>
        </Container>
      </section>
    </div>
  );
}
