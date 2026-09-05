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
      {/* Hero Section */}
      <section className="relative py-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-brand-surface/50 to-dark -z-10" />
        <Container>
          <div className="max-w-2xl">
            <h1 className="text-5xl md:text-7xl font-black mb-6 tracking-tight">
              Bet Smarter.<br />
              <span className="text-primary">Win Bigger.</span>
            </h1>
            <p className="text-lg text-muted mb-8 max-w-xl">
              Experience the next generation of sports betting. Industry-leading odds, instant deposits, and a platform built for winners.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link href="/register">
                <Button size="lg" className="w-full sm:w-auto font-bold">Join Now</Button>
              </Link>
              <Link href="/sports">
                <Button size="lg" variant="secondary" className="w-full sm:w-auto">Browse Sports</Button>
              </Link>
            </div>
          </div>
        </Container>
      </section>

      {/* Stats Bar */}
      <section className="border-y border-brand bg-surface/50 py-8">
        <Container>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center divide-y md:divide-y-0 md:divide-x divide-brand">
            <div className="flex flex-col items-center justify-center p-4">
              <Activity className="w-8 h-8 text-primary mb-2" />
              <h3 className="text-2xl font-bold">50+ Sports</h3>
              <p className="text-sm text-muted">Global coverage daily</p>
            </div>
            <div className="flex flex-col items-center justify-center p-4">
              <Zap className="w-8 h-8 text-primary mb-2" />
              <h3 className="text-2xl font-bold">Live Betting</h3>
              <p className="text-sm text-muted">In-play action 24/7</p>
            </div>
            <div className="flex flex-col items-center justify-center p-4">
              <CircleDollarSign className="w-8 h-8 text-primary mb-2" />
              <h3 className="text-2xl font-bold">Fast Payouts</h3>
              <p className="text-sm text-muted">Secure & instant</p>
            </div>
          </div>
        </Container>
      </section>

      {/* Featured Sports */}
      <section className="py-16">
        <Container>
          <div className="flex justify-between items-end mb-8">
            <div>
              <h2 className="text-3xl font-bold mb-2">Popular Sports</h2>
              <p className="text-muted">Explore markets from around the world</p>
            </div>
            <Link href="/sports" className="text-primary hover:text-primary-hover text-sm font-semibold">
              View All &rarr;
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <SportCard name="Football" icon={<Trophy />} eventCount={142} href="/sports/football" />
            <SportCard name="Basketball" icon={<Trophy />} eventCount={45} href="/sports/basketball" />
            <SportCard name="Tennis" icon={<Trophy />} eventCount={38} href="/sports/tennis" />
            <SportCard name="Cricket" icon={<Trophy />} eventCount={12} href="/sports/cricket" />
            <SportCard name="Baseball" icon={<Trophy />} eventCount={24} href="/sports/baseball" />
            <SportCard name="Rugby" icon={<Trophy />} eventCount={8} href="/sports/rugby" />
          </div>
        </Container>
      </section>

      {/* Live Events (Placeholder) */}
      <section className="py-16 bg-surface/30">
        <Container>
          <h2 className="text-3xl font-bold mb-8 flex items-center gap-3">
            <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
            Live Now
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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

      {/* Features */}
      <section className="py-20">
        <Container>
          <h2 className="text-3xl font-bold text-center mb-12">Why Choose MiraclBet?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-surface border border-brand p-8 rounded-xl text-center">
              <Shield className="w-12 h-12 text-primary mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-3">Bank-Grade Security</h3>
              <p className="text-muted">Your funds and data are protected by industry-leading encryption and security protocols.</p>
            </div>
            <div className="bg-surface border border-brand p-8 rounded-xl text-center">
              <Star className="w-12 h-12 text-primary mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-3">VIP Treatment</h3>
              <p className="text-muted">Enjoy exclusive rewards, better odds, and dedicated support when you bet with us.</p>
            </div>
            <div className="bg-surface border border-brand p-8 rounded-xl text-center">
              <Activity className="w-12 h-12 text-primary mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-3">Instant Settlements</h3>
              <p className="text-muted">No more waiting. Your winning bets are settled immediately after the event concludes.</p>
            </div>
          </div>
        </Container>
      </section>
    </div>
  );
}
