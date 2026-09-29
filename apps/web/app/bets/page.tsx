'use client';

import React, { useState, useEffect, useCallback } from 'react';
import QRCode from 'react-qr-code';

interface BetLeg {
  id: string;
  fixture_id: string;
  match_name: string;
  market_name: string;
  selection_name: string;
  odds: number;
  status: string;
  homeLogo?: string;
  awayLogo?: string;
  kickoffAt?: string;
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
    return d.toLocaleString(undefined, { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch { return iso; }
}

function parseMatch(matchName: string) {
  const parts = matchName.split(' vs ');
  return { home: parts[0]?.trim() || matchName, away: parts[1]?.trim() || '' };
}

function TeamAvatar({ name, logoUrl, size = 30 }: { name: string; logoUrl?: string; size?: number }) {
  if (logoUrl) {
    return (
      <div style={{
        width: size, height: size, borderRadius: '50%',
        background: '#fff', padding: 2,
        border: '2px solid #e5e7eb',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        boxShadow: '0 2px 5px rgba(0,0,0,0.3)', overflow: 'hidden'
      }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logoUrl} alt={name} style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '50%' }} />
      </div>
    );
  }

  const words = name.trim().split(/\s+/);
  const initials = words.length >= 2 ? words[0][0] + words[words.length - 1][0] : name.slice(0, 2);
  const colors = ['#EF4444', '#3B82F6', '#F5A623', '#10B981', '#8B5CF6', '#EC4899', '#06B6D4'];
  const idx = (name.charCodeAt(0) + (name.charCodeAt(1) || 0)) % colors.length;
  
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: `linear-gradient(135deg, ${colors[idx]}, #111827)`,
      border: '2px solid #e5e7eb',
      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      boxShadow: '0 2px 5px rgba(0,0,0,0.3)'
    }}>
      <span style={{ color: '#fff', fontWeight: 900, fontSize: size * 0.35, textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>
        {initials.toUpperCase()}
      </span>
    </div>
  );
}

const SLIP_STATUS: Record<string, { bg: string; text: string; label: string; icon: string }> = {
  PENDING:   { bg: '#F5A623', text: '#fff', label: 'Open', icon: '⏳' },
  WON:       { bg: '#19E66B', text: '#000', label: 'Won',  icon: '✅' },
  LOST:      { bg: '#EF4444', text: '#fff', label: 'Lost', icon: '❌' },
  CANCELLED: { bg: '#9CA3AF', text: '#fff', label: 'Void', icon: '🚫' },
};

function BetTicket({ slip }: { slip: BetSlip }) {
  const [open, setOpen] = useState(false);
  const st = SLIP_STATUS[slip.status] || SLIP_STATUS.PENDING;
  const isAccumulator = slip.legs.length > 1;

  return (
    <div style={{
      marginBottom: 20,
      background: '#ffffff',
      borderRadius: 12,
      border: '1px solid #e5e7eb',
      boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
      overflow: 'hidden'
    }}>
      {/* ── TICKET HEADER ── */}
      <div 
        onClick={() => setOpen(!open)}
        style={{ 
          background: '#f9fafb', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', 
          alignItems: 'center', cursor: 'pointer', borderBottom: open ? '1px dashed #e5e7eb' : 'none'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ background: st.bg, color: st.text, padding: '4px 8px', borderRadius: 6, fontSize: 11, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 4 }}>
            {st.label}
          </div>
          <div>
            <div style={{ color: '#111827', fontWeight: 800, fontSize: 14 }}>
              {isAccumulator ? `${slip.legs.length}-Fold Accumulator` : 'Single Bet'}
            </div>
            <div style={{ color: '#4B5563', fontSize: 11 }}>{formatDate(slip.created_at)}</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ color: '#4B5563', fontSize: 10, textTransform: 'uppercase' }}>Payout</div>
            <div style={{ color: slip.status === 'WON' ? '#059669' : '#d97706', fontWeight: 900, fontSize: 14 }}>
              {slip.potential_payout.toFixed(2)}
            </div>
          </div>
          <svg viewBox="0 0 24 24" style={{ width: 18, height: 18, color: '#9CA3AF', transform: open ? 'rotate(180deg)' : '', transition: 'transform 0.2s' }} fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </div>

      {/* ── EXPANDED TICKET BODY (Receipt Style) ── */}
      {open && (
        <div style={{ background: '#ffffff' }}>
          
          {/* List of Legs */}
          {slip.legs.map((leg, i) => {
            const { home, away } = parseMatch(leg.match_name);
            const legWon = leg.status === 'WON';
            const legLost = leg.status === 'LOST';
            
            return (
              <div key={leg.id} style={{ position: 'relative' }}>
                {/* Receipt Cutout Effect (Side notches) */}
                {i > 0 && (
                  <div style={{ position: 'absolute', top: -8, left: 0, right: 0, display: 'flex', justifyContent: 'space-between', zIndex: 2 }}>
                    <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#0A0E1A', marginLeft: -8, borderRight: '1px solid #e5e7eb' }} />
                    <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#0A0E1A', marginRight: -8, borderLeft: '1px solid #e5e7eb' }} />
                  </div>
                )}
                
                <div style={{ 
                  padding: '16px 20px', 
                  borderBottom: i < slip.legs.length - 1 ? '1px dashed #e5e7eb' : 'none',
                }}>
                  {/* Top: Sport / League */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <svg viewBox="0 0 24 24" style={{ width: 14, height: 14, color: '#9CA3AF' }} fill="currentColor">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm0-14c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6z"/>
                      </svg>
                      <span style={{ color: '#4B5563', fontSize: 12 }}>Football Match</span>
                    </div>
                    {leg.kickoffAt && (
                      <span style={{ color: '#F5A623', fontSize: 11, fontWeight: 700 }}>
                        {(() => { try { const d=new Date(leg.kickoffAt); return `${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')} ${d.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}`; } catch { return ''; } })()}
                      </span>
                    )}
                  </div>

                  {/* Middle: Match Matchup */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <div style={{ flex: 1, textAlign: 'right', color: '#111827', fontSize: 13, fontWeight: 700 }}>{home}</div>
                    <div style={{ margin: '0 16px', display: 'flex', gap: 8, alignItems: 'center' }}>
                      <TeamAvatar name={home} logoUrl={leg.homeLogo} />
                      <span style={{ color: '#6B7280', fontSize: 11, fontWeight: 800 }}>VS</span>
                      <TeamAvatar name={away} logoUrl={leg.awayLogo} />
                    </div>
                    <div style={{ flex: 1, textAlign: 'left', color: '#111827', fontSize: 13, fontWeight: 700 }}>{away}</div>
                  </div>

                  {/* Bottom: Market, Odds, Status */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                    <div>
                      <div style={{ color: '#111827', fontWeight: 800, fontSize: 14, marginBottom: 4 }}>
                        {leg.market_name}. {leg.selection_name}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ color: '#4B5563', fontSize: 12 }}>Status:</span>
                        {legWon && <span style={{ color: '#19E66B', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}><svg viewBox="0 0 24 24" style={{ width: 14, height: 14 }} fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg> Win</span>}
                        {legLost && <span style={{ color: '#EF4444', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}><svg viewBox="0 0 24 24" style={{ width: 14, height: 14 }} fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11H7v-2h10v2z"/></svg> Loss</span>}
                        {!legWon && !legLost && <span style={{ color: '#F5A623', fontSize: 12, fontWeight: 700 }}>⏳ Pending</span>}
                      </div>
                    </div>
                    <div style={{ color: '#111827', fontWeight: 900, fontSize: 18 }}>
                      {leg.odds.toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Ticket Footer (Barcode/Calculation) */}
          <div style={{ background: '#ffffff', padding: '16px 20px', borderTop: '1px dashed #374151' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ color: '#4B5563', fontSize: 12 }}>Total Odds</span>
              <span style={{ color: '#111827', fontSize: 14, fontWeight: 800 }}>{slip.total_odds.toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ color: '#4B5563', fontSize: 12 }}>Stake</span>
              <span style={{ color: '#111827', fontSize: 14, fontWeight: 800 }}>{slip.stake.toFixed(2)} Br</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 12, borderTop: '1px solid #e5e7eb' }}>
              <span style={{ color: '#111827', fontSize: 13, fontWeight: 800 }}>Potential Payout</span>
              <span style={{ color: '#d97706', fontSize: 16, fontWeight: 900 }}>{slip.potential_payout.toFixed(2)} Br</span>
            </div>
            
                          {/* QR Code */}
              <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ padding: 8, background: '#fff', borderRadius: 8 }}>
                  <QRCode value={`https://www.miraclbet.com/check?code=TICKET-${slip.id.toUpperCase()}`} size={130} level="H" style={{ display: "block" }} />
                </div>
                <div style={{ color: '#6B7280', fontSize: 10, letterSpacing: 2, marginTop: 8, fontFamily: 'monospace' }}>
                  TICKET-{slip.id.slice(0, 12).toUpperCase()}
                </div>
              </div>
          </div>
          
        </div>
      )}
    </div>
  );
}

export default function MyBetsPage() {
  const [mounted, setMounted]     = useState(false);
  const [bets, setBets]           = useState<BetSlip[]>([]);
  const [loading, setLoading]     = useState(true);
  const [user, setUser]           = useState<{ id: string; full_name: string } | null>(null);
  const [tab, setTab]             = useState<'all' | 'pending' | 'settled'>('all');

  const fetchBets = useCallback(async (userId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/v1/bets?user_id=${userId}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) setBets(data);
      }
    } catch {} finally { setLoading(false); }
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

  return (
    <div style={{ background: '#0A0E1A', minHeight: '100vh', paddingBottom: 90 }}>
      {/* Header */}
      <div style={{ background: '#ffffff', padding: '16px 16px 0', borderBottom: '1px solid #1E293B', position: 'sticky', top: 0, zIndex: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={() => window.history.back()} style={{ background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer', padding: 0 }}>
              <svg viewBox="0 0 24 24" style={{ width: 24, height: 24 }} fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 12H5M12 5l-7 7 7-7" /></svg>
            </button>
            <h1 style={{ color: '#111827', fontWeight: 800, fontSize: 18, margin: 0 }}>Bet History</h1>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 16 }}>
          {[
            { key: 'all', label: 'All' },
            { key: 'pending', label: 'Open' },
            { key: 'settled', label: 'Settled' }
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key as any)} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '8px 0', fontWeight: 700, fontSize: 14,
              color: tab === t.key ? '#F5A623' : '#9CA3AF',
              borderBottom: tab === t.key ? '2px solid #F5A623' : '2px solid transparent',
              transition: 'all 0.2s'
            }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: '16px', maxWidth: 480, margin: '0 auto' }}>
        {!user ? (
          <div style={{ textAlign: 'center', padding: '60px 24px' }}>
            <h2 style={{ color: '#111827', fontWeight: 800, fontSize: 20, marginBottom: 10 }}>Login Required</h2>
            <button onClick={() => window.location.href = '/login?redirect=/bets'} style={{ padding: '13px 28px', background: '#10B981', color: '#ffffff', border: 'none', borderRadius: 8, fontWeight: 800, fontSize: 15, cursor: 'pointer' }}>
              Log In
            </button>
          </div>
        ) : loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#9CA3AF' }}>Loading tickets...</div>
        ) : bets.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 24px', background: '#ffffff', borderRadius: 16, border: '1px solid #e5e7eb' }}>
            <h2 style={{ color: '#111827', fontWeight: 800, fontSize: 20, marginBottom: 10 }}>No Bets Found</h2>
            <p style={{ color: '#6B7280', fontSize: 14, marginBottom: 24 }}>You haven't placed any bets yet.</p>
            <button onClick={() => window.location.href = '/'} style={{ padding: '13px 28px', background: '#10B981', color: '#ffffff', border: 'none', borderRadius: 8, fontWeight: 800, fontSize: 15, cursor: 'pointer' }}>
              Browse Sports
            </button>
          </div>
        ) : (
          <>
            {filtered.map(slip => <BetTicket key={slip.id} slip={slip} />)}
          </>
        )}
      </div>
    </div>
  );
}
