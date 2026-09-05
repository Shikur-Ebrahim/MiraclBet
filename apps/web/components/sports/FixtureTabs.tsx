'use client';

import React, { useState, useEffect } from 'react';
import { Fixture } from '@/lib/api/client';
import { clsx } from 'clsx';

export function FixtureTabs() {
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Generate dates: Today, Tomorrow, +5 days
  const dates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return d;
  });

  const [selectedDate, setSelectedDate] = useState(dates[0].toISOString().split('T')[0]);

  useEffect(() => {
    async function fetchFixtures() {
      setLoading(true);
      try {
        const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://api.miraclbet.com:8443';
        const res = await fetch(`${API_BASE}/api/v1/fixtures?date=${selectedDate}`);
        const data = await res.json();
        setFixtures(data || []);
      } catch (err) {
        setFixtures([]);
      } finally {
        setLoading(false);
      }
    }
    fetchFixtures();
  }, [selectedDate]);

  const formatDateLabel = (d: Date, index: number) => {
    if (index === 0) return 'Today';
    if (index === 1) return 'Tomorrow';
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  return (
    <div>
      {/* Scrollable Tabs */}
      <div className="flex overflow-x-auto gap-2 mb-4 pb-2 scrollbar-hide">
        {dates.map((d, i) => {
          const dateStr = d.toISOString().split('T')[0];
          const isSelected = selectedDate === dateStr;
          return (
            <button
              key={dateStr}
              onClick={() => setSelectedDate(dateStr)}
              className={clsx(
                'whitespace-nowrap px-4 py-2 rounded-lg text-sm font-semibold transition-colors',
                isSelected ? 'bg-primary text-dark' : 'bg-surface border border-brand text-muted hover:text-white'
              )}
            >
              {formatDateLabel(d, i)}
            </button>
          );
        })}
      </div>

      {/* Fixtures List */}
      <div className="flex flex-col gap-2">
        {loading ? (
          <div className="py-8 text-center text-muted flex items-center justify-center gap-2">
            <svg className="animate-spin h-5 w-5 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Loading matches...
          </div>
        ) : fixtures.length > 0 ? (
          fixtures.map((fix) => (
            <div key={fix.id} className="bg-card border border-brand rounded-xl p-3 flex items-center gap-3">
              <div className="text-xs text-muted w-10 shrink-0 text-center">
                {new Date(fix.kickoff_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs text-muted truncate mb-0.5">{fix.league}</div>
                <div className="flex items-center gap-1">
                  <span className="text-sm font-semibold truncate">{fix.home_team}</span>
                  <span className="text-muted text-xs mx-1">vs</span>
                  <span className="text-sm font-semibold truncate">{fix.away_team}</span>
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
                <button className="bg-surface border border-brand hover:border-primary rounded-lg px-2.5 py-1.5 text-xs font-bold text-primary transition-colors">{fix.odds_home?.toFixed(2) || '1.90'}</button>
                <button className="bg-surface border border-brand hover:border-primary rounded-lg px-2.5 py-1.5 text-xs font-bold text-primary transition-colors">{fix.odds_draw?.toFixed(2) || '3.20'}</button>
                <button className="bg-surface border border-brand hover:border-primary rounded-lg px-2.5 py-1.5 text-xs font-bold text-primary transition-colors">{fix.odds_away?.toFixed(2) || '1.90'}</button>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-12 text-muted bg-surface/30 rounded-xl border border-brand">
            <p className="text-lg mb-1">No fixtures scheduled</p>
            <p className="text-sm">Check another date</p>
          </div>
        )}
      </div>
    </div>
  );
}
