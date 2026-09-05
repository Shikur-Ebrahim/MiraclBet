import React from 'react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Clock } from 'lucide-react';

interface OddsProps {
  home: number;
  draw?: number;
  away: number;
}

interface EventCardProps {
  homeTeam: string;
  awayTeam: string;
  league: string;
  time: string;
  odds: OddsProps;
  isLive?: boolean;
  score?: { home: number; away: number };
}

export function EventCard({ homeTeam, awayTeam, league, time, odds, isLive, score }: EventCardProps) {
  return (
    <Card className="border border-brand p-4">
      <div className="flex justify-between items-center mb-4">
        <span className="text-xs text-muted font-medium uppercase tracking-wider">{league}</span>
        {isLive ? (
          <Badge variant="live" className="animate-pulse">Live</Badge>
        ) : (
          <div className="flex items-center text-xs text-muted gap-1">
            <Clock className="w-3 h-3" />
            {time}
          </div>
        )}
      </div>

      <div className="flex justify-between items-center mb-6">
        <div className="flex flex-col gap-2 flex-1">
          <div className="flex justify-between items-center">
            <span className="font-semibold text-white">{homeTeam}</span>
            {score && <span className="text-gold font-bold">{score.home}</span>}
          </div>
          <div className="flex justify-between items-center">
            <span className="font-semibold text-white">{awayTeam}</span>
            {score && <span className="text-gold font-bold">{score.away}</span>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <button className="bg-surface hover:bg-surface/80 border border-brand hover:border-gold transition-colors rounded p-2 flex flex-col items-center group">
          <span className="text-xs text-muted group-hover:text-white">1</span>
          <span className="font-bold text-gold">{odds.home.toFixed(2)}</span>
        </button>
        {odds.draw ? (
          <button className="bg-surface hover:bg-surface/80 border border-brand hover:border-gold transition-colors rounded p-2 flex flex-col items-center group">
            <span className="text-xs text-muted group-hover:text-white">X</span>
            <span className="font-bold text-gold">{odds.draw.toFixed(2)}</span>
          </button>
        ) : (
          <div className="bg-surface/50 border border-brand/50 rounded flex items-center justify-center opacity-50 cursor-not-allowed">
            <span className="text-muted">-</span>
          </div>
        )}
        <button className="bg-surface hover:bg-surface/80 border border-brand hover:border-gold transition-colors rounded p-2 flex flex-col items-center group">
          <span className="text-xs text-muted group-hover:text-white">2</span>
          <span className="font-bold text-gold">{odds.away.toFixed(2)}</span>
        </button>
      </div>
    </Card>
  );
}
