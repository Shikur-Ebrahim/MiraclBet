import React from 'react';
import { Container } from '@/components/ui/Container';
import { SportCard } from '@/components/sports/SportCard';
import { Trophy, Search } from 'lucide-react';

export default function SportsPage() {
  const sports = [
    { name: 'Football', count: 142, slug: 'football' },
    { name: 'Basketball', count: 45, slug: 'basketball' },
    { name: 'Tennis', count: 38, slug: 'tennis' },
    { name: 'Cricket', count: 12, slug: 'cricket' },
    { name: 'Baseball', count: 24, slug: 'baseball' },
    { name: 'Rugby', count: 8, slug: 'rugby' },
    { name: 'Ice Hockey', count: 15, slug: 'ice-hockey' },
    { name: 'Volleyball', count: 6, slug: 'volleyball' },
    { name: 'Table Tennis', count: 32, slug: 'table-tennis' },
    { name: 'Esports', count: 56, slug: 'esports' },
    { name: 'Boxing', count: 4, slug: 'boxing' },
    { name: 'MMA', count: 9, slug: 'mma' },
  ];

  return (
    <div className="py-12">
      <Container>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <h1 className="text-4xl font-bold text-white">All Sports</h1>
          
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            <input 
              type="text" 
              placeholder="Search sports..." 
              className="w-full bg-surface border border-brand rounded pl-10 pr-4 py-2 text-white placeholder:text-muted focus:outline-none focus:border-primary"
            />
          </div>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {sports.map(sport => (
            <SportCard 
              key={sport.slug}
              name={sport.name} 
              icon={<Trophy />} 
              eventCount={sport.count} 
              href={`/sports/${sport.slug}`} 
            />
          ))}
        </div>
      </Container>
    </div>
  );
}
