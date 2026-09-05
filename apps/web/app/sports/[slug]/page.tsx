import React from 'react';
import { Container } from '@/components/ui/Container';
import { EventCard } from '@/components/sports/EventCard';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

export default async function SportCategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  
  const formattedName = slug.charAt(0).toUpperCase() + slug.slice(1).replace('-', ' ');

  return (
    <div className="py-8">
      <Container>
        <div className="mb-8">
          <Link href="/sports" className="inline-flex items-center text-sm text-muted hover:text-gold mb-4 transition-colors">
            <ChevronLeft className="w-4 h-4 mr-1" /> Back to all sports
          </Link>
          <h1 className="text-3xl font-bold text-white">{formattedName} Betting</h1>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Main Content */}
          <div className="flex-1">
            <div className="flex gap-4 border-b border-brand mb-6">
              <button className="pb-3 text-sm font-medium border-b-2 border-gold text-gold">Today</button>
              <button className="pb-3 text-sm font-medium border-b-2 border-transparent text-muted hover:text-white transition-colors">Tomorrow</button>
              <button className="pb-3 text-sm font-medium border-b-2 border-transparent text-muted hover:text-white transition-colors">Future</button>
            </div>

            <div className="space-y-4">
              <EventCard 
                league="International" homeTeam="Team A" awayTeam="Team B" 
                time="20:00" 
                odds={{home: 1.85, draw: 3.40, away: 4.20}} 
              />
              <EventCard 
                league="Pro League" homeTeam="Local FC" awayTeam="United" 
                time="22:30" 
                odds={{home: 2.10, draw: 3.10, away: 2.90}} 
              />
              <EventCard 
                league="Championship" homeTeam="City" awayTeam="Rovers" 
                time="Tomorrow 15:00" 
                odds={{home: 1.45, draw: 4.00, away: 7.50}} 
              />
            </div>
          </div>

          {/* Sidebar / Bet Slip Placeholder */}
          <div className="w-full lg:w-80">
            <div className="bg-surface border border-brand rounded-lg p-6 sticky top-24">
              <h3 className="font-bold text-white mb-4 flex items-center justify-between">
                Bet Slip
                <span className="bg-dark text-xs text-muted px-2 py-1 rounded">0</span>
              </h3>
              <div className="text-center py-8">
                <p className="text-muted text-sm">Click on the odds to add selections to your bet slip.</p>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </div>
  );
}
