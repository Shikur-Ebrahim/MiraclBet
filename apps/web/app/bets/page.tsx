'use client';

import React, { useState } from 'react';
import { Container } from '@/components/ui/Container';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';
import { clsx } from 'clsx';

export default function BetsPage() {
  const [tab, setTab] = useState<'open' | 'settled' | 'all'>('open');

  return (
    <div className="py-12 min-h-[70vh]">
      <Container size="md">
        <h1 className="text-3xl font-bold text-white mb-8">My Bets</h1>
        
        <div className="flex gap-4 border-b border-brand mb-8">
          <button 
            className={clsx('pb-3 text-sm font-medium border-b-2 transition-colors', tab === 'open' ? 'border-gold text-gold' : 'border-transparent text-muted hover:text-white')}
            onClick={() => setTab('open')}
          >
            Open Bets
          </button>
          <button 
            className={clsx('pb-3 text-sm font-medium border-b-2 transition-colors', tab === 'settled' ? 'border-gold text-gold' : 'border-transparent text-muted hover:text-white')}
            onClick={() => setTab('settled')}
          >
            Settled Bets
          </button>
          <button 
            className={clsx('pb-3 text-sm font-medium border-b-2 transition-colors', tab === 'all' ? 'border-gold text-gold' : 'border-transparent text-muted hover:text-white')}
            onClick={() => setTab('all')}
          >
            All Bets
          </button>
        </div>

        <Card className="p-12 border border-brand border-dashed text-center">
          <div className="w-16 h-16 bg-surface rounded-full flex items-center justify-center mx-auto mb-4 text-muted">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-white mb-2">No bets placed yet</h3>
          <p className="text-muted mb-6">You don&apos;t have any {tab} bets at the moment.</p>
          <Link href="/sports">
            <Button>Browse Sports</Button>
          </Link>
        </Card>
      </Container>
    </div>
  );
}
