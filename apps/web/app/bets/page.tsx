'use client';

import React, { useState, useEffect, useCallback } from 'react';

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

function formatDate(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch { return iso; }
}

function parseMatch(matchName: string) {
  const parts = matchName.split(' vs ');
  return { home: parts[0]?.trim() || matchName, away: parts[1]?.trim() || '' };
}

function TeamAvatar({ name, size = 34 }: { name: string; size?: number }) {
  const words = name.trim().split(/\s+/);
  const initials = words.length >= 2 ? words[0][0] + words[words.length - 1][0] : name.slice(0, 2);
  const colors = ['#19E66B', '#F5A623', '#3B82F6', '#EC4899', '#8B5CF6', '#EF4444', '#14B8A6', '#F97316'];
  const idx = (name.charCodeAt(0) + (name.charCodeAt(1) || 0)) % colors.length;
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: `${colors[idx]}18`, border: `2px solid ${colors[idx]}44`,
      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    }}>
      <span style={{ color: colors[idx], fontWeight: 900, fontSize: size * 0.32 }}>
        {initials.toUpperCase()}
      </span>
    </div>
  );
}

const SLIP_STATUS: Record<string, { bg: string; text: string; border: string; label: string; icon: string }> = {
  PENDING:   { bg: 'rgba(245,166,35,0.10)',  text: '#F5A623', border: '#F5A62330', label: 'Open',      icon: '⏳' },
  WON:       { bg: 'rgba(25,230,107,0.10)',  text: '#19E66B', border: '#19E66B30', label: 'Won',       icon: '🏆' },
  LOST:      { bg: 'rgba(239,68,68,0.10)',   text: '#EF4444', border: '#EF444430', label: 'Lost',      icon: '❌' },
  CANCELLED: { bg: 'rgba(156,163,175,0.10)', text: '#9CA3AF', border: '#9CA3AF30', label: 'Cancelled', icon: '🚫' },
};

const LEG_STATUS: Record<string, { color: string; icon: string }> = {
  PENDING: { color: '#F5A623', icon: '⏳' },
  WON:     { color: '#19E66B', icon: '✓' },
  LOST:    { color: '#EF4444', icon: '✗' },
  VOID:    { color: '#9CA3AF', icon: '—' },
};

function BetTicket({ slip }: { slip: BetSlip }) {
  const [open, setOpen] = useState(false);
  const st = SLIP_STATUS[slip.status] || SLIP_STATUS.PENDING;
  const isAccumulator = slip.legs.length > 1;
  const wonLegs  = slip.legs.filter(l => l.status === 'WON').length;
  const lostLegs = slip.legs.filter(l => l.status === 'LOST').length;
  const firstLeg = slip.legs[0];

  return (
    <div style={{
      borderRadius: 16, marginBottom: 12, overflow: 'hidden',
      border: `1px solid ${st.border}`,
      background: 'linear-gradient(180deg, #111827 0%, #0D1520 100%)',
      boxShadow: slip.status === 'WON' ? '0 0 24px rgba(25,230,107,0.08)' : 'none',
    }}>
      {/* Status bar */}
      <div style={{ background: st.bg, borderBottom: `1px solid ${st.border}`, padding: '7px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 14 }}>{st.icon}</span>
          <span style={{ color: st.text, fontWeight: 800, fontSize: 13 }}>{st.label}</span>
          {isAccumulator && (
            <span style={{ background: '#1E293B', color: '#9CA3AF', fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 99 }}>
              {slip.legs.length}-Fold
            </span>
          )}
        </div>
        <span style={{ color: '#6B7280', fontSize: 11 }}>{formatDate(slip.created_at)}</span>
      </div>

      {/* Main body — click to expand */}
      <div onClick={() => setOpen(o => !o)} style={{ padding: '14px 14px 10px', cursor: 'pointer' }}>
        {/* First leg preview */}
        {firstLeg && (() => {
          const { home, away } = parseMatch(firstLeg.match_name);
          return (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <TeamAvatar name={home} size={36} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ color: '#9CA3AF', fontSize: 10, fontWeight: 600, margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  {firstLeg.market_name}
                </p>
                <p style={{ color: '#fff', fontSize: 14, fontWeight: 800, margin: '0 0 2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {firstLeg.selection_name}
                </p>
                <p style={{ color: '#6B7280', fontSize: 11, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {home}{away ? ` vs ${away}` : ''}
                </p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                <span style={{ color: '#19E66B', fontWeight: 900, fontSize: 20 }}>{firstLeg.odds.toFixed(2)}</span>
                {slip.legs.length > 1 && (
                  <span style={{ background: '#1E293B', color: '#9CA3AF', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99 }}>
                    +{slip.legs.length - 1} more
                  </span>
                )}
              </div>
            </div>
          );
        })()}

        {/* Stats grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
          {[
            { label: 'Stake', value: `ETB ${slip.stake.toFixed(2)}`, color: '#fff' },
            { label: 'Odds', value: slip.total_odds.toFixed(2), color: '#19E66B' },
            { label: slip.status === 'WON' ? 'Won' : 'To Win', value: `ETB ${slip.potential_payout.toFixed(2)}`, color: slip.status === 'WON' ? '#19E66B' : '#F5A623' },
          ].map(s => (
            <div key={s.label} style={{ background: '#0A0E1A', borderRadius: 10, padding: '8px 6px', textAlign: 'center' }}>
              <p style={{ color: '#6B7280', fontSize: 9, fontWeight: 600, margin: '0 0 4px', textTransform: 'uppercase' }}>{s.label}</p>
              <p style={{ color: s.color, fontWeight: 900, fontSize: 13, margin: 0 }}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Accumulator progress */}
        {isAccumulator && (wonLegs + lostLegs) > 0 && (
          <div style={{ marginTop: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ color: '#6B7280', fontSize: 10 }}>{wonLegs}/{slip.legs.length} legs won</span>
              {lostLegs > 0 && <span style={{ color: '#EF4444', fontSize: 10 }}>{lostLegs} lost</span>}
            </div>
            <div style={{ height: 4, background: '#1E293B', borderRadius: 99, overflow: 'hidden' }}>
              <div style={{ height: '100%', borderRadius: 99, width: `${(wonLegs / slip.legs.length) * 100}%`, background: lostLegs > 0 ? '#EF4444' : '#19E66B', transition: 'width 0.5s ease' }} />
            </div>
          </div>
        )}

        {/* Chevron */}
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 10 }}>
          <svg viewBox="0 0 24 24" style={{ width: 16, height: 16, color: '#374151', transform: open ? 'rotate(180deg)' : '', transition: 'transform 0.2s' }} fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </div>

      {/* Expanded legs */}
      {open && (
        <div style={{ borderTop: '1px solid #1E293B22' }}>
          <div style={{ padding: '7px 14px', background: '#0A0E1A55', display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #1E293B' }}>
            <span style={{ color: '#6B7280', fontSize: 11 }}>Ticket ID</span>
            <span style={{ color: '#9CA3AF', fontSize: 11, fontFamily: 'monospace', fontWeight: 700 }}>#{slip.id.slice(0, 8).toUpperCase()}</span>
          </div>

          {slip.legs.map((leg, i) => {
            const { home, away } = parseMatch(leg.match_name);
            const legSt = LEG_STATUS[leg.status] || LEG_STATUS.PENDING;
            return (
              <div key={leg.id} style={{
                padding: '12px 14px', borderBottom: i < slip.legs.length - 1 ? '1px solid #1E293B22' : 'none',
                display: 'flex', gap: 10, alignItems: 'flex-start',
                background: i % 2 === 0 ? 'transparent' : '#0A0E1A22',
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                  <TeamAvatar name={home} size={28} />
                  {away && <><div style={{ width: 1, height: 6, background: '#1E293B' }} /><TeamAvatar name={away} size={28} /></>}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ color: '#6B7280', fontSize: 10, fontWeight: 600, margin: '0 0 3px', textTransform: 'uppercase', letterSpacing: 0.4 }}>{leg.market_name}</p>
                  <p style={{ color: '#fff', fontSize: 13, fontWeight: 800, margin: '0 0 2px' }}>{leg.selection_name}</p>
                  <p style={{ color: '#6B7280', fontSize: 11, margin: 0 }}>{home}{away ? ` vs ${away}` : ''}</p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                  <span style={{ color: '#19E66B', fontWeight: 900, fontSize: 15 }}>{leg.odds.toFixed(2)}</span>
                  <span style={{ fontSize: 10, fontWeight: 800, color: legSt.color, background: `${legSt.color}18`, borderRadius: 6, padding: '1px 6px' }}>
                    {legSt.icon} {leg.status}
                  </span>
                </div>
              </div>
            );
          })}

          {/* Payout footer */}
          <div style={{ padding: '12px 14px', background: '#0A0E1A', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #1E293B' }}>
            <div>
              <p style={{ color: '#6B7280', fontSize: 10, fontWeight: 600, margin: '0 0 2px', textTransform: 'uppercase' }}>Calculation</p>
              <p style={{ color: '#9CA3AF', fontSize: 12, margin: 0 }}>ETB {slip.stake.toFixed(2)} × {slip.total_odds.toFixed(2)}</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ color: '#6B7280', fontSize: 10, fontWeight: 600, margin: '0 0 2px', textTransform: 'uppercase' }}>{slip.status === 'WON' ? 'Payout' : 'Potential'}</p>
              <p style={{ color: slip.status === 'WON' ? '#19E66B' : '#F5A623', fontWeight: 900, fontSize: 18, margin: 0 }}>ETB {slip.potential_payout.toFixed(2)}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryBanner({ bets }: { bets: BetSlip[] }) {
  const totalStake   = bets.reduce((a, b) => a + b.stake, 0);
  const wonTotal     = bets.filter(b => b.status === 'WON').reduce((a, b) => a + b.potential_payout, 0);
  const pendingCount = bets.filter(b => b.status === 'PENDING').length;
  const wonCount     = bets.filter(b => b.status === 'WON').length;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 16 }}>
      {[
        { label: 'Total Staked', value: `ETB ${totalStake.toFixed(0)}`, color: '#fff', bg: '#111827', border: '#1E293B' },
        { label: `Won (${wonCount})`, value: `ETB ${wonTotal.toFixed(0)}`, color: '#19E66B', bg: 'rgba(25,230,107,0.06)', border: '#19E66B30' },
        { label: 'Open', value: `${pendingCount} ⏳`, color: '#F5A623', bg: 'rgba(245,166,35,0.06)', border: '#F5A62330' },
      ].map(s => (
        <div key={s.label} style={{ background: s.bg, border: `1px solid ${s.border}`, borderRadius: 12, padding: '10px 8px', textAlign: 'center' }}>
          <p style={{ color: '#6B7280', fontSize: 9, fontWeight: 600, margin: '0 0 4px', textTransform: 'uppercase' }}>{s.label}</p>
          <p style={{ color: s.color, fontWeight: 900, fontSize: 13, margin: 0 }}>{s.value}</p>
        </div>
      ))}
    </div>
  );
}

export default function MyBetsPage() {
  const [mounted, setMounted]     = useState(false);
  const [bets, setBets]           = useState<BetSlip[]>([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]         = useState('');
  const [user, setUser]           = useState<{ id: string; full_name: string } | null>(null);
  const [tab, setTab]             = useState<'all' | 'pending' | 'settled'>('all');

  const fetchBets = useCallback(async (userId: string, silent = false) => {
    if (!silent) setLoading(true); else setRefreshing(true);
    setError('');
    try {
      const res = await fetch(`${API}/api/v1/bets?user_id=${userId}`, { cache: 'no-store' });
      if (!res.ok) {
        const text = await res.text();
        setError(`Server error (${res.status}). Please try again later.`);
        return;
      }
      const data = await res.json();
      if (Array.isArray(data)) {
        setBets(data);
      } else {
        setError('Unexpected response from server.');
      }
    } catch {
      setError('Could not connect to the server. Check your internet connection.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    setMounted(true);
    const rawUser = localStorage.getItem('miraclbet_user');
    if (rawUser) {
      try {
        const u = JSON.parse(rawUser);
        setUser(u);
        fetchBets(u.id);
      } catch { setLoading(false); }
    } else { setLoading(false); }
  }, [fetchBets]);

  const filtered = bets.filter(b => {
    if (tab === 'pending') return b.status === 'PENDING';
    if (tab === 'settled') return b.status !== 'PENDING';
    return true;
  });

  if (!mounted) return null;

  const TABS = [
    { key: 'all',     label: 'All Bets', count: bets.length },
    { key: 'pending', label: 'Open',     count: bets.filter(b => b.status === 'PENDING').length },
    { key: 'settled', label: 'Settled',  count: bets.filter(b => b.status !== 'PENDING').length },
  ] as const;

  return (
    <div style={{ background: '#0A0E1A', minHeight: '100vh', paddingBottom: 90 }}>
      {/* Header */}
      <div style={{ background: '#111827', padding: '16px 16px 0', borderBottom: '2px solid #19E66B33', position: 'sticky', top: 0, zIndex: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={() => window.history.back()} style={{ background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer', padding: 4 }}>
              <svg viewBox="0 0 24 24" style={{ width: 22, height: 22 }} fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 12H5M12 5l-7 7 7-7" /></svg>
            </button>
            <h1 style={{ color: '#fff', fontWeight: 800, fontSize: 18, margin: 0 }}>🎫 Bet History</h1>
          </div>
          {user && (
            <button
              onClick={() => fetchBets(user.id, true)}
              disabled={refreshing}
              style={{ background: 'rgba(25,230,107,0.1)', border: '1px solid #19E66B33', borderRadius: 8, color: '#19E66B', cursor: 'pointer', padding: '6px 10px', fontSize: 11, fontWeight: 700, opacity: refreshing ? 0.5 : 1 }}
            >
              {refreshing ? '...' : '↻ Refresh'}
            </button>
          )}
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              padding: '7px 12px', borderRadius: '8px 8px 0 0', border: 'none', cursor: 'pointer',
              fontWeight: 700, fontSize: 12, display: 'flex', alignItems: 'center', gap: 5,
              background: tab === t.key ? '#19E66B' : '#1E293B',
              color: tab === t.key ? '#072414' : '#9CA3AF',
            }}>
              {t.label}
              <span style={{ background: tab === t.key ? '#072414' : '#0A0E1A', color: tab === t.key ? '#19E66B' : '#6B7280', borderRadius: 99, padding: '1px 6px', fontSize: 10, fontWeight: 800 }}>
                {t.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: '16px', maxWidth: 480, margin: '0 auto' }}>
        {/* Not logged in */}
        {!user ? (
          <div style={{ textAlign: 'center', padding: '60px 24px', background: '#111827', borderRadius: 20, border: '1px solid #1E293B' }}>
            <div style={{ fontSize: 56, marginBottom: 14 }}>🔐</div>
            <h2 style={{ color: '#fff', fontWeight: 800, fontSize: 20, marginBottom: 10 }}>Login Required</h2>
            <p style={{ color: '#9CA3AF', fontSize: 14, marginBottom: 24, lineHeight: 1.6 }}>Please log in to view your bet history.</p>
            <button onClick={() => window.location.href = '/login?redirect=/bets'} style={{ padding: '13px 28px', background: 'linear-gradient(135deg, #19E66B, #0D8A3C)', color: '#fff', border: 'none', borderRadius: 12, fontWeight: 800, fontSize: 15, cursor: 'pointer' }}>
              Login to View Bets
            </button>
          </div>

        ) : loading ? (
          /* Skeleton */
          <div>
            {[1, 2, 3].map(i => (
              <div key={i} style={{ background: '#111827', borderRadius: 16, marginBottom: 12, border: '1px solid #1E293B', overflow: 'hidden' }}>
                <div style={{ height: 36, background: 'rgba(245,166,35,0.06)' }} />
                <div style={{ padding: 14 }}>
                  <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#1E293B' }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ height: 10, background: '#1E293B', borderRadius: 6, marginBottom: 6, width: '60%' }} />
                      <div style={{ height: 14, background: '#1E293B', borderRadius: 6, marginBottom: 4, width: '80%' }} />
                      <div style={{ height: 10, background: '#1E293B', borderRadius: 6, width: '50%' }} />
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                    {[1, 2, 3].map(j => <div key={j} style={{ height: 52, background: '#0A0E1A', borderRadius: 10 }} />)}
                  </div>
                </div>
              </div>
            ))}
          </div>

        ) : error ? (
          <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 16, padding: '24px', textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
            <p style={{ color: '#EF4444', fontWeight: 700, fontSize: 15, marginBottom: 8 }}>Unable to load bets</p>
            <p style={{ color: '#9CA3AF', fontSize: 13, marginBottom: 20 }}>{error}</p>
            <button onClick={() => user && fetchBets(user.id)} style={{ padding: '10px 20px', background: '#EF4444', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
              Try Again
            </button>
          </div>

        ) : bets.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 24px', background: '#111827', borderRadius: 20, border: '1px solid #1E293B' }}>
            <div style={{ fontSize: 56, marginBottom: 14 }}>🎫</div>
            <h2 style={{ color: '#fff', fontWeight: 800, fontSize: 20, marginBottom: 10 }}>No Bets Yet</h2>
            <p style={{ color: '#9CA3AF', fontSize: 14, marginBottom: 24, lineHeight: 1.6 }}>
              Select odds from any match, build your betslip, and place your first bet!
            </p>
            <button onClick={() => window.location.href = '/'} style={{ padding: '13px 28px', background: 'linear-gradient(135deg, #19E66B, #0D8A3C)', color: '#fff', border: 'none', borderRadius: 12, fontWeight: 800, fontSize: 15, cursor: 'pointer', boxShadow: '0 4px 20px rgba(25,230,107,0.25)' }}>
              Browse Matches
            </button>
          </div>

        ) : (
          <>
            <SummaryBanner bets={bets} />

            {filtered.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 24px', color: '#6B7280', fontSize: 14 }}>
                No {tab === 'pending' ? 'open' : 'settled'} bets found.
              </div>
            ) : (
              <>
                <p style={{ color: '#6B7280', fontSize: 12, marginBottom: 10 }}>{filtered.length} ticket{filtered.length !== 1 ? 's' : ''}</p>
                {filtered.map(slip => <BetTicket key={slip.id} slip={slip} />)}
              </>
            )}

            <button onClick={() => window.location.href = '/betslip'} style={{ width: '100%', padding: 14, background: '#111827', border: '1px dashed #19E66B44', borderRadius: 14, color: '#19E66B', fontWeight: 700, fontSize: 14, cursor: 'pointer', marginTop: 4 }}>
              + Place Another Bet
            </button>
          </>
        )}
      </div>
    </div>
  );
}
