'use client';

import React, { useState, useEffect } from 'react';

interface BetLeg {
  id: string;
  fixture_id: string;
  match_name: string;
  market_name: string;
  selection_name: string;
  odds: number;
  status: string;
}

interface BetSlip {
  id: string;
  stake: number;
  total_odds: number;
  potential_payout: number;
  status: string;
  created_at: string;
  legs: BetLeg[];
}

const API = process.env.NEXT_PUBLIC_API_URL || 'https://api.miraclbet.com:8443';

const STATUS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  PENDING:   { bg: 'rgba(245,166,35,0.15)',  text: '#F5A623', label: 'Pending' },
  WON:       { bg: 'rgba(25,230,107,0.15)',  text: '#19E66B', label: 'Won ✓' },
  LOST:      { bg: 'rgba(239,68,68,0.15)',   text: '#EF4444', label: 'Lost' },
  CANCELLED: { bg: 'rgba(156,163,175,0.15)', text: '#9CA3AF', label: 'Cancelled' },
};

const LEG_STATUS_COLORS: Record<string, string> = {
  PENDING: '#F5A623',
  WON:     '#19E66B',
  LOST:    '#EF4444',
  VOID:    '#9CA3AF',
};

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function BetCard({ slip }: { slip: BetSlip }) {
  const [expanded, setExpanded] = useState(false);
  const st = STATUS_COLORS[slip.status] || STATUS_COLORS.PENDING;

  return (
    <div style={{ background: '#111827', borderRadius: 14, marginBottom: 12, border: '1px solid #1E293B', overflow: 'hidden' }}>
      {/* Top bar */}
      <div
        onClick={() => setExpanded(!expanded)}
        style={{ padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ background: st.bg, color: st.text, borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 800 }}>{st.label}</span>
            <span style={{ color: '#9CA3AF', fontSize: 11 }}>{formatDate(slip.created_at)}</span>
          </div>
          <div style={{ display: 'flex', gap: 16 }}>
            <div>
              <span style={{ color: '#9CA3AF', fontSize: 11 }}>Stake </span>
              <span style={{ color: '#fff', fontWeight: 800, fontSize: 14 }}>ETB {slip.stake.toFixed(2)}</span>
            </div>
            <div>
              <span style={{ color: '#9CA3AF', fontSize: 11 }}>Odds </span>
              <span style={{ color: '#19E66B', fontWeight: 800, fontSize: 14 }}>{slip.total_odds.toFixed(2)}</span>
            </div>
            <div>
              <span style={{ color: '#9CA3AF', fontSize: 11 }}>Payout </span>
              <span style={{ color: '#F5A623', fontWeight: 800, fontSize: 14 }}>ETB {slip.potential_payout.toFixed(2)}</span>
            </div>
          </div>
        </div>
        <svg
          viewBox="0 0 24 24"
          style={{ width: 18, height: 18, color: '#9CA3AF', transform: expanded ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s', flexShrink: 0 }}
          fill="none" stroke="currentColor" strokeWidth="2.5"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>

      {/* Legs */}
      {expanded && (
        <div style={{ borderTop: '1px solid #1E293B' }}>
          {slip.legs.map((leg, i) => (
            <div key={leg.id} style={{ padding: '10px 14px', borderBottom: i < slip.legs.length - 1 ? '1px solid #1E293B22' : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ color: '#9CA3AF', fontSize: 11, margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: 0.5 }}>{leg.market_name}</p>
                <p style={{ color: '#fff', fontSize: 13, fontWeight: 700, margin: '0 0 2px' }}>{leg.selection_name}</p>
                <p style={{ color: '#6B7280', fontSize: 11, margin: 0 }}>{leg.match_name}</p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                <span style={{ color: '#19E66B', fontWeight: 900, fontSize: 14 }}>{leg.odds.toFixed(2)}</span>
                <span style={{ fontSize: 10, fontWeight: 700, color: LEG_STATUS_COLORS[leg.status] || '#9CA3AF' }}>{leg.status}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function MyBetsPage() {
  const [mounted, setMounted] = useState(false);
  const [bets, setBets] = useState<BetSlip[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{ id: string; full_name: string } | null>(null);
  const [tab, setTab] = useState<'all' | 'pending' | 'settled'>('all');

  useEffect(() => {
    setMounted(true);
    const rawUser = localStorage.getItem('miraclbet_user');
    if (rawUser) {
      try {
        const u = JSON.parse(rawUser);
        setUser(u);
        fetch(`${API}/api/v1/bets?user_id=${u.id}`)
          .then(r => r.json())
          .then(data => {
            if (Array.isArray(data)) setBets(data);
          })
          .catch(() => {})
          .finally(() => setLoading(false));
      } catch {
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, []);

  const filtered = bets.filter(b => {
    if (tab === 'pending') return b.status === 'PENDING';
    if (tab === 'settled') return b.status !== 'PENDING';
    return true;
  });

  if (!mounted) return null;

  return (
    <div style={{ background: '#0A0E1A', minHeight: '100vh', paddingBottom: 90 }}>
      {/* Header */}
      <div style={{ background: '#111827', padding: '16px 16px 0', borderBottom: '2px solid #19E66B33' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <button onClick={() => window.history.back()} style={{ background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer', padding: 4 }}>
            <svg viewBox="0 0 24 24" style={{ width: 22, height: 22 }} fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M19 12H5M12 5l-7 7 7-7" />
            </svg>
          </button>
          <h1 style={{ color: '#fff', fontWeight: 800, fontSize: 18, margin: 0 }}>My Bets</h1>
        </div>
        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4 }}>
          {(['all', 'pending', 'settled'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                padding: '6px 14px', borderRadius: '8px 8px 0 0', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13,
                background: tab === t ? '#19E66B' : '#1E293B',
                color: tab === t ? '#072414' : '#9CA3AF',
              }}
            >
              {t === 'all' ? 'All' : t === 'pending' ? 'Open' : 'Settled'}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: 16, maxWidth: 480, margin: '0 auto' }}>
        {!user ? (
          <div style={{ textAlign: 'center', padding: '48px 24px', background: '#111827', borderRadius: 16, border: '1px solid #1E293B' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🔐</div>
            <h2 style={{ color: '#fff', fontWeight: 700, fontSize: 18, marginBottom: 8 }}>Login Required</h2>
            <p style={{ color: '#9CA3AF', fontSize: 14, marginBottom: 20 }}>Please log in to view your bet history.</p>
            <button onClick={() => window.location.href = '/login?redirect=/bets'} style={{ padding: '12px 24px', background: '#19E66B', color: '#072414', border: 'none', borderRadius: 10, fontWeight: 800, fontSize: 14, cursor: 'pointer' }}>
              Login
            </button>
          </div>
        ) : loading ? (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <div style={{ color: '#19E66B', fontSize: 32, marginBottom: 8 }}>⏳</div>
            <p style={{ color: '#9CA3AF' }}>Loading your bets...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 24px', background: '#111827', borderRadius: 16, border: '1px solid #1E293B' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🎯</div>
            <h2 style={{ color: '#fff', fontWeight: 700, fontSize: 18, marginBottom: 8 }}>No bets yet</h2>
            <p style={{ color: '#9CA3AF', fontSize: 14, marginBottom: 20 }}>Select odds from any match and place your first bet!</p>
            <button onClick={() => window.location.href = '/'} style={{ padding: '12px 24px', background: '#19E66B', color: '#072414', border: 'none', borderRadius: 10, fontWeight: 800, fontSize: 14, cursor: 'pointer' }}>
              Browse Matches
            </button>
          </div>
        ) : (
          <>
            <p style={{ color: '#9CA3AF', fontSize: 12, marginBottom: 12 }}>{filtered.length} bet{filtered.length !== 1 ? 's' : ''}</p>
            {filtered.map(slip => <BetCard key={slip.id} slip={slip} />)}
          </>
        )}
      </div>
    </div>
  );
}
