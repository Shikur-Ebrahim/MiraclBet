'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import QRCode from 'react-qr-code';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

type AgentSession = { phone: string; role: string; id?: string };

type Selection = {
  fixtureId: string;
  matchName: string;
  marketName: string;
  selectionId: string;
  selectionName: string;
  odds: number;
  homeLogo?: string;
  awayLogo?: string;
  kickoffAt?: string;
};

type BookingData = {
  code: string;
  selections: Selection[];
  total_odds: number;
  auto_win: boolean;
};

type AgentTicket = {
  id: string;
  stake: number;
  total_odds: number;
  potential_payout: number;
  status: string;
  created_at: string;
  legs: Array<{ match_name: string; market_name: string; selection_name: string; odds: number; status: string; kickoffAt?: string; homeLogo?: string; awayLogo?: string }>;
};

type ActiveView = 'place-bet' | 'my-tickets';

/* ─── Sidebar ─────────────────────────────────────────────── */
/* ─── Sidebar ─────────────────────────────────────────────── */
function Sidebar({
  active, onNav, agent, onLogout,
}: {
  active: ActiveView;
  onNav: (v: ActiveView) => void;
  agent: AgentSession;
  onLogout: () => void;
}) {
  const navItems: { id: ActiveView; label: string; icon: React.ReactNode }[] = [
    {
      id: 'place-bet',
      label: 'Place Bet',
      icon: (
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2">
          <rect x="2" y="5" width="20" height="14" rx="2" />
          <line x1="2" y1="10" x2="22" y2="10" />
        </svg>
      ),
    },
    {
      id: 'my-tickets',
      label: 'My Tickets',
      icon: (
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2">
          <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
          <rect x="9" y="3" width="6" height="4" rx="1" />
          <line x1="9" y1="12" x2="15" y2="12" />
          <line x1="9" y1="16" x2="13" y2="16" />
        </svg>
      ),
    },
  ];

  return (
    <aside style={{
      width: 240, minHeight: '100vh', background: '#111827',
      display: 'flex', flexDirection: 'column', flexShrink: 0,
      borderRight: '1px solid #1F2937',
    }}>
      {/* Logo */}
      <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid #1F2937' }}>
        <div style={{ fontWeight: 900, fontSize: 20, color: '#fff', letterSpacing: -0.5 }}>
          Miracl<span style={{ color: '#F5A623' }}>Bet</span>
          <span style={{ marginLeft: 8, background: '#F5A623', color: '#111827', padding: '2px 7px', borderRadius: 5, fontSize: 9, fontWeight: 900, letterSpacing: 0.5 }}>AGENT POS</span>
        </div>
        <div style={{ color: '#9CA3AF', fontSize: 11, marginTop: 4 }}>Cashier: {agent.phone}</div>
      </div>

      {/* Nav items */}
      <nav style={{ flex: 1, padding: '12px 12px' }}>
        {navItems.map(item => {
          const isActive = active === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNav(item.id)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                padding: '13px 14px', borderRadius: 10, border: 'none', marginBottom: 4,
                background: isActive ? '#F5A623' : 'transparent',
                color: isActive ? '#111827' : '#9CA3AF',
                fontWeight: isActive ? 800 : 600, fontSize: 14,
                cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
              }}
            >
              {item.icon}
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* Logout */}
      <div style={{ padding: '16px 12px', borderTop: '1px solid #1F2937' }}>
        <button onClick={onLogout} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', borderRadius: 10, border: 'none', background: 'transparent', color: '#EF4444', fontWeight: 700, fontSize: 14, cursor: 'pointer', textAlign: 'left' }}>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          Logout
        </button>
      </div>
    </aside>
  );
}

function PlaceBetView({ agent }: { agent: AgentSession }) {
  const [bookingCode, setBookingCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [booking, setBooking] = useState<BookingData | null>(null);
  const [stake, setStake] = useState('');
  const [placedTicketId, setPlacedTicketId] = useState<string | null>(null);
  const [placing, setPlacing] = useState(false);
  const printDate = useRef(new Date().toLocaleString());

  const lookupBooking = async () => {
    setError(''); setBooking(null); setPlacedTicketId(null); setStake('');
    const code = bookingCode.trim().toUpperCase();
    if (!code) return;
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/v1/betslips/${code}`);
      if (!res.ok) { setError('Booking code not found.'); return; }
      const data = await res.json();
      setBooking(data);
      printDate.current = new Date().toLocaleString();
    } catch { setError('Network error. Try again.'); }
    finally { setLoading(false); }
  };

  const placeBet = async () => {
    if (!booking || !stake || !agent.id) return;
    const stakeNum = parseFloat(stake);
    if (isNaN(stakeNum) || stakeNum < 1) { setError('Enter a valid amount'); return; }
    setPlacing(true); setError('');
    try {
      const res = await fetch(`${API}/api/v1/bets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: agent.id, stake: stakeNum,
          total_odds: booking.total_odds,
          selections: booking.selections,
          booking_code: booking.code,
        }),
      });
      if (!res.ok) {
        const txt = await res.text();
        try { setError(JSON.parse(txt).message || JSON.parse(txt).error || 'Failed'); } catch { setError(txt || 'Failed'); }
        return;
      }
      const data = await res.json();
      setPlacedTicketId(data.id || data.slip_id || booking.code);
    } catch { setError('Network error placing bet.'); }
    finally { setPlacing(false); }
  };

  const payout = stake && booking ? (parseFloat(stake) * booking.total_odds).toFixed(2) : '0.00';

  return (
    <div style={{ display: 'flex', gap: 24, flex: 1, alignItems: 'flex-start' }}>

      {/* Left: Booking Lookup Panel */}
      <div style={{ width: 340, flexShrink: 0, background: '#fff', borderRadius: 16, padding: 24, boxShadow: '0 2px 10px rgba(0,0,0,0.07)' }}>
        <h2 style={{ fontSize: 16, fontWeight: 800, margin: '0 0 16px', color: '#111827' }}>Load Customer Booking</h2>

        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          <input
            value={bookingCode}
            onChange={e => setBookingCode(e.target.value.toUpperCase())}
            placeholder="e.g. M51YH25"
            onKeyDown={e => e.key === 'Enter' && lookupBooking()}
            style={{ flex: 1, padding: '11px 14px', border: '2px solid #E5E7EB', borderRadius: 10, fontSize: 15, fontWeight: 700, outline: 'none', textTransform: 'uppercase' }}
          />
          <button onClick={lookupBooking} disabled={loading}
            style={{ background: '#111827', color: '#fff', border: 'none', padding: '0 18px', borderRadius: 10, fontWeight: 800, cursor: loading ? 'not-allowed' : 'pointer', fontSize: 14, minWidth: 70 }}>
            {loading ? '...' : 'Load'}
          </button>
        </div>

        {error && (
          <div style={{ background: '#FEF2F2', color: '#DC2626', padding: '10px 12px', borderRadius: 8, fontSize: 13, fontWeight: 600, marginBottom: 14, border: '1px solid #FECACA' }}>
            ⚠️ {error}
          </div>
        )}

        {booking && !placedTicketId && (
          <div style={{ borderTop: '2px dashed #E5E7EB', paddingTop: 16 }}>
            <div style={{ background: '#F9FAFB', borderRadius: 10, padding: 12, marginBottom: 14 }}>
              {booking.selections.map((sel, i) => (
                <div key={i} style={{ borderBottom: i < booking.selections.length - 1 ? '1px dashed #E5E7EB' : 'none', paddingBottom: 8, marginBottom: 8 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: '#111827' }}>{sel.matchName || '—'}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
                    <span style={{ fontSize: 12, color: '#6B7280' }}>{sel.marketName} · <strong>{sel.selectionName}</strong></span>
                    <span style={{ fontSize: 13, fontWeight: 900 }}>{sel.odds.toFixed(2)}</span>
                  </div>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, paddingTop: 8, borderTop: '1px solid #E5E7EB' }}>
                <span style={{ fontSize: 13, fontWeight: 700 }}>Total Odds</span>
                <span style={{ fontSize: 14, fontWeight: 900 }}>{booking.total_odds.toFixed(2)}</span>
              </div>
            </div>

            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#4B5563', marginBottom: 6 }}>CASH AMOUNT (Br)</label>
            <input type="number" value={stake} onChange={e => setStake(e.target.value)} placeholder="0.00"
              style={{ width: '100%', padding: '14px 16px', border: '2px solid #10B981', borderRadius: 10, fontSize: 22, fontWeight: 900, outline: 'none', boxSizing: 'border-box', marginBottom: 10 }} />

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, background: '#F0FDF4', padding: '10px 14px', borderRadius: 8 }}>
              <span style={{ color: '#065F46', fontSize: 13, fontWeight: 800 }}>To Pay:</span>
              <span style={{ color: '#059669', fontSize: 16, fontWeight: 900 }}>{payout} Br</span>
            </div>

            <button onClick={placeBet} disabled={placing || !stake}
              style={{ width: '100%', background: placing || !stake ? '#9CA3AF' : '#10B981', color: '#fff', border: 'none', padding: '16px', borderRadius: 12, fontWeight: 900, fontSize: 16, cursor: placing || !stake ? 'not-allowed' : 'pointer' }}>
              {placing ? 'Placing...' : 'CONFIRM & PLACE BET'}
            </button>
          </div>
        )}

        {placedTicketId && (
          <div style={{ background: '#F0FDF4', padding: 20, borderRadius: 12, border: '1px solid #A7F3D0', textAlign: 'center', marginTop: 12 }}>
            <div style={{ fontSize: 40, marginBottom: 6 }}>✅</div>
            <h3 style={{ color: '#065F46', margin: '0 0 6px', fontWeight: 900, fontSize: 16 }}>Bet Placed!</h3>
            <p style={{ color: '#047857', fontSize: 13, margin: '0 0 14px' }}>Print the ticket and hand it to the customer.</p>
            <button onClick={() => window.print()} style={{ background: '#059669', color: '#fff', border: 'none', padding: '12px', borderRadius: 8, fontWeight: 800, cursor: 'pointer', width: '100%', fontSize: 14, marginBottom: 8 }}>
              🖨️ Print Ticket
            </button>
            <button onClick={() => { setBookingCode(''); setBooking(null); setPlacedTicketId(null); setStake(''); setError(''); }}
              style={{ background: '#fff', color: '#059669', border: '2px solid #059669', padding: '10px', borderRadius: 8, fontWeight: 800, cursor: 'pointer', width: '100%', fontSize: 13 }}>
              New Customer
            </button>
          </div>
        )}
      </div>

      {/* Right: Receipt Preview */}
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
          <button onClick={() => window.print()} disabled={!placedTicketId}
            style={{ background: '#111827', color: '#fff', border: 'none', padding: '10px 22px', borderRadius: 8, fontWeight: 800, cursor: placedTicketId ? 'pointer' : 'not-allowed', opacity: placedTicketId ? 1 : 0.4, display: 'flex', gap: 8, alignItems: 'center', fontSize: 14 }}>
            <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2.5" fill="none"><path d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2" /><path d="M6 14h12v8H6z" /></svg>
            Print Ticket
          </button>
        </div>

        {/* Physical Receipt */}
        <div className="print-receipt" style={{ background: '#fff', padding: '28px 24px', borderRadius: 4, fontFamily: '"Courier New", Courier, monospace', color: '#000', boxShadow: '0 8px 32px rgba(0,0,0,0.12)', maxWidth: 420 }}>
          <div style={{ textAlign: 'center', borderBottom: '2px dashed #000', paddingBottom: 14, marginBottom: 14 }}>
            <div style={{ fontSize: 26, fontWeight: 900, letterSpacing: 2 }}>MIRACL BET</div>
            <div style={{ fontSize: 11, marginTop: 4 }}>Date: {printDate.current}</div>
            <div style={{ fontSize: 11, marginTop: 2 }}>Agent: {agent.phone}</div>
          </div>
          <div style={{ textAlign: 'center', marginBottom: 18 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2 }}>TICKET ID</div>
            <div style={{ fontSize: 18, fontWeight: 900, marginTop: 4, letterSpacing: 1 }}>
              {placedTicketId ? `TICKET-${placedTicketId.substring(0, 8).toUpperCase()}` : <span style={{ opacity: 0.35, fontSize: 13 }}>Place bet to generate</span>}
            </div>
          </div>

          {booking ? (
            <>
              <div style={{ borderTop: '1px solid #000', borderBottom: '1px solid #000', padding: '8px 0', marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, fontWeight: 700, letterSpacing: 1, marginBottom: 8 }}>
                  <span>SELECTIONS</span><span>ODDS</span>
                </div>
                {booking.selections.map((sel, idx) => (
                  <div key={idx} style={{ paddingBottom: 8, marginBottom: 8, borderBottom: idx < booking.selections.length - 1 ? '1px dashed #ccc' : 'none' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 2 }}>{sel.matchName || '—'}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 11 }}>{sel.marketName} · {sel.selectionName}</span>
                      <span style={{ fontSize: 13, fontWeight: 900 }}>{sel.odds.toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ borderTop: '1px dashed #000', paddingTop: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 5 }}>
                  <span>Total Odds:</span><span style={{ fontWeight: 900 }}>{booking.total_odds.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 12 }}>
                  <span>Stake:</span><span style={{ fontWeight: 900 }}>{stake ? parseFloat(stake).toFixed(2) : '0.00'} Br</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 16, fontWeight: 900, borderTop: '2px solid #000', paddingTop: 10 }}>
                  <span>TO PAYOUT:</span><span>{payout} Br</span>
                </div>
              </div>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '32px 0', opacity: 0.4, fontSize: 12 }}>Load a booking to preview receipt</div>
          )}

          <div style={{ textAlign: 'center', marginTop: 24, paddingTop: 14, borderTop: '2px dashed #000', fontSize: 11 }}>
            {placedTicketId && (
              <div style={{ display: 'flex', justifyContent: 'center', margin: '0 0 14px' }}>
                <QRCode value={`https://www.miraclbet.com/check?code=TICKET-${placedTicketId.toUpperCase()}`} size={120} level="H" style={{ display: 'block' }} />
              </div>
            )}
            <div>Scan to check status online</div>
            <div style={{ fontWeight: 700, marginTop: 4 }}>www.miraclbet.com/check</div>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body * { visibility: hidden; }
          .print-receipt, .print-receipt * { visibility: visible; }
          .print-receipt { position: fixed; left: 0; top: 0; width: 80mm; padding: 10px; box-shadow: none !important; }
          .no-print { display: none !important; }
        }
      ` }} />
    </div>
  );
}

/* ─── My Tickets View ────────────────────────────────────── */
type FilterStatus = 'ALL' | 'PENDING' | 'WON' | 'LOST';

function parseMatchName(name: string) {
  const parts = name.split(' vs ');
  return { home: parts[0]?.trim() || name, away: parts[1]?.trim() || '' };
}
function fmtKickoff(iso: string) {
  try { const d = new Date(iso); return `${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')} ${d.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}`; } catch { return ''; }
}
function fmtDateTime(iso: string) {
  try { const d = new Date(iso); return d.toLocaleString(undefined, { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }); } catch { return iso; }
}

function AgentTeamAvatar({ name, logoUrl, size = 32 }: { name: string; logoUrl?: string; size?: number }) {
  if (logoUrl) return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: '#fff', padding: 2, border: '2px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={logoUrl} alt={name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
    </div>
  );
  const words = name.trim().split(/\s+/);
  const initials = words.length >= 2 ? words[0][0] + words[words.length - 1][0] : name.slice(0, 2);
  const colors = ['#EF4444', '#3B82F6', '#F5A623', '#10B981', '#8B5CF6', '#EC4899', '#06B6D4'];
  const idx = (name.charCodeAt(0) + (name.charCodeAt(1) || 0)) % colors.length;
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: `linear-gradient(135deg, ${colors[idx]}, #111827)`, border: '2px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <span style={{ color: '#fff', fontWeight: 900, fontSize: size * 0.35 }}>{initials.toUpperCase()}</span>
    </div>
  );
}

const SLIP_STATUS_CFG: Record<string, { bg: string; text: string; label: string; icon: string; bar: string }> = {
  PENDING: { bg: '#F5A623', text: '#fff', label: 'Pending', icon: '⏳', bar: '#F5A623' },
  WON:     { bg: '#19E66B', text: '#000', label: 'Won',     icon: '✅', bar: '#059669' },
  LOST:    { bg: '#EF4444', text: '#fff', label: 'Lost',    icon: '❌', bar: '#DC2626' },
  VOID:    { bg: '#9CA3AF', text: '#fff', label: 'Void',    icon: '↩',  bar: '#6B7280' },
};

function AgentTicketCard({ slip }: { slip: AgentTicket }) {
  const [open, setOpen] = useState(false);
  const st = SLIP_STATUS_CFG[slip.status] || SLIP_STATUS_CFG.PENDING;
  const isAccumulator = (slip.legs || []).length > 1;
  const shortId = `TICKET-${slip.id.substring(0, 8).toUpperCase()}`;

  return (
    <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', boxShadow: '0 4px 6px rgba(0,0,0,0.07)', overflow: 'hidden', marginBottom: 16 }}>
      {/* Clickable Header */}
      <div onClick={() => setOpen(!open)} style={{ background: '#f9fafb', padding: '13px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', borderBottom: open ? '1px dashed #e5e7eb' : 'none', userSelect: 'none' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ background: st.bg, color: st.text, padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 900 }}>
            {st.icon} {st.label}
          </span>
          <div>
            <div style={{ fontWeight: 800, fontSize: 14, color: '#111827' }}>
              {isAccumulator ? `${(slip.legs || []).length}-Fold Accumulator` : 'Single Bet'}
            </div>
            <div style={{ fontSize: 11, color: '#6B7280', fontFamily: 'monospace' }}>{shortId} · {fmtDateTime(slip.created_at)}</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 10, color: '#9CA3AF', textTransform: 'uppercase' }}>Payout</div>
            <div style={{ fontWeight: 900, fontSize: 15, color: slip.status === 'WON' ? '#059669' : '#D97706' }}>
              {slip.potential_payout.toFixed(2)} Br
            </div>
          </div>
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#9CA3AF" strokeWidth="2.5" style={{ transform: open ? 'rotate(180deg)' : '', transition: 'transform 0.2s', flexShrink: 0 }}>
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </div>

      {/* Expanded body */}
      {open && (
        <div style={{ background: '#fff' }}>
          {/* Legs */}
          {(slip.legs || []).map((leg, i) => {
            const { home, away } = parseMatchName(leg.match_name);
            const legWon  = leg.status === 'WON';
            const legLost = leg.status === 'LOST';
            return (
              <div key={i} style={{ position: 'relative' }}>
                {i > 0 && (
                  <div style={{ position: 'absolute', top: -8, left: 0, right: 0, display: 'flex', justifyContent: 'space-between', zIndex: 2 }}>
                    <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#F3F4F6', marginLeft: -8, border: '1px solid #e5e7eb' }} />
                    <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#F3F4F6', marginRight: -8, border: '1px solid #e5e7eb' }} />
                  </div>
                )}
                <div style={{ padding: '18px 20px', borderBottom: i < (slip.legs || []).length - 1 ? '1px dashed #e5e7eb' : 'none' }}>
                  {/* Sport + Kickoff row */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" style={{ color: '#9CA3AF' }}>
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
                      </svg>
                      <span style={{ color: '#6B7280', fontSize: 12 }}>Football Match</span>
                    </div>
                    {leg.kickoffAt && (
                      <span style={{ color: '#F5A623', fontSize: 11, fontWeight: 700 }}>{fmtKickoff(leg.kickoffAt)}</span>
                    )}
                  </div>

                  {/* Teams */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                    <div style={{ flex: 1, textAlign: 'right', fontWeight: 700, fontSize: 13, color: '#111827' }}>{home}</div>
                    <div style={{ margin: '0 16px', display: 'flex', gap: 8, alignItems: 'center' }}>
                      <AgentTeamAvatar name={home} logoUrl={leg.homeLogo} size={34} />
                      <span style={{ color: '#9CA3AF', fontSize: 10, fontWeight: 900 }}>VS</span>
                      <AgentTeamAvatar name={away} logoUrl={leg.awayLogo} size={34} />
                    </div>
                    <div style={{ flex: 1, textAlign: 'left', fontWeight: 700, fontSize: 13, color: '#111827' }}>{away}</div>
                  </div>

                  {/* Market + Status + Odds */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 14, color: '#111827', marginBottom: 4 }}>{leg.market_name}. {leg.selection_name}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ color: '#6B7280', fontSize: 12 }}>Status:</span>
                        {legWon  && <span style={{ color: '#19E66B', fontSize: 12, fontWeight: 700 }}>✅ Win</span>}
                        {legLost && <span style={{ color: '#EF4444', fontSize: 12, fontWeight: 700 }}>❌ Loss</span>}
                        {!legWon && !legLost && <span style={{ color: '#F5A623', fontSize: 12, fontWeight: 700 }}>⏳ Pending</span>}
                      </div>
                    </div>
                    <div style={{ fontWeight: 900, fontSize: 20, color: '#111827' }}>{leg.odds.toFixed(2)}</div>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Footer: totals + QR */}
          <div style={{ padding: '16px 20px', borderTop: '1px dashed #374151', background: '#fff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ color: '#6B7280', fontSize: 13 }}>Total Odds</span>
              <span style={{ fontWeight: 800, fontSize: 14, color: '#111827' }}>{slip.total_odds.toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ color: '#6B7280', fontSize: 13 }}>Stake</span>
              <span style={{ fontWeight: 800, fontSize: 14, color: '#111827' }}>{slip.stake.toFixed(2)} Br</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 12, borderTop: '1px solid #e5e7eb' }}>
              <span style={{ fontWeight: 800, fontSize: 14, color: '#111827' }}>Potential Payout</span>
              <span style={{ fontWeight: 900, fontSize: 18, color: slip.status === 'WON' ? '#059669' : '#D97706' }}>{slip.potential_payout.toFixed(2)} Br</span>
            </div>
            {/* QR Code */}
            <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ padding: 8, background: '#fff', border: '1px solid #E5E7EB', borderRadius: 8 }}>
                <QRCode value={`https://www.miraclbet.com/check?code=TICKET-${slip.id.toUpperCase()}`} size={120} level="H" style={{ display: 'block' }} />
              </div>
              <div style={{ color: '#6B7280', fontSize: 10, letterSpacing: 2, marginTop: 8, fontFamily: 'monospace' }}>
                {shortId}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MyTicketsView({ agent }: { agent: AgentSession }) {
  const [tickets, setTickets] = useState<AgentTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<FilterStatus>('ALL');
  const [timeFilter, setTimeFilter] = useState<'TODAY' | 'WEEK' | 'MONTH' | 'YEAR' | 'ALL'>('TODAY');
  const [search, setSearch] = useState('');

  const loadTickets = useCallback(async () => {
    if (!agent.id) return;
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/v1/bets?user_id=${agent.id}`);
      if (!res.ok) { setError('Failed to load tickets.'); return; }
      const data = await res.json();
      setTickets(Array.isArray(data) ? data : []);
    } catch { setError('Network error loading tickets.'); }
    finally { setLoading(false); }
  }, [agent.id]);

  useEffect(() => { loadTickets(); }, [loadTickets]);

  // Apply Time Filter
  const now = new Date();
  const timeFilteredTickets = tickets.filter(t => {
    if (timeFilter === 'ALL') return true;
    const ticketDate = new Date(t.created_at);
    if (timeFilter === 'TODAY') {
      return ticketDate.toDateString() === now.toDateString();
    }
    if (timeFilter === 'WEEK') {
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return ticketDate >= oneWeekAgo;
    }
    if (timeFilter === 'MONTH') {
      return ticketDate.getMonth() === now.getMonth() && ticketDate.getFullYear() === now.getFullYear();
    }
    if (timeFilter === 'YEAR') {
      return ticketDate.getFullYear() === now.getFullYear();
    }
    return true;
  });

  const counts = {
    ALL: timeFilteredTickets.length,
    PENDING: timeFilteredTickets.filter(t => t.status === 'PENDING').length,
    WON:     timeFilteredTickets.filter(t => t.status === 'WON').length,
    LOST:    timeFilteredTickets.filter(t => t.status === 'LOST').length,
  };

  const totalStake = timeFilteredTickets.reduce((sum, t) => sum + (t.stake || 0), 0);
  const totalPayout = timeFilteredTickets.filter(t => t.status === 'WON').reduce((sum, t) => sum + (t.potential_payout || 0), 0);

  const filtered = timeFilteredTickets.filter(t => {
    const matchesFilter = filter === 'ALL' || t.status === filter;
    const q = search.trim().toUpperCase();
    const matchesSearch = !q || t.id.toUpperCase().includes(q) || `TICKET-${t.id.substring(0,8).toUpperCase()}`.includes(q);
    return matchesFilter && matchesSearch;
  });

  const TAB_FILTERS: { key: FilterStatus; label: string; icon: string; color: string }[] = [
    { key: 'ALL',     label: 'All',     icon: '🎟️', color: '#111827' },
    { key: 'PENDING', label: 'Pending', icon: '⏳', color: '#D97706' },
    { key: 'WON',     label: 'Won',     icon: '✅', color: '#059669' },
    { key: 'LOST',    label: 'Lost',    icon: '❌', color: '#DC2626' },
  ];

  return (
    <div style={{ flex: 1 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 900, color: '#111827', margin: 0 }}>My Tickets</h2>
          <p style={{ fontSize: 13, color: '#6B7280', margin: '3px 0 0' }}>Track your sales and placed bets</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <select 
            value={timeFilter} 
            onChange={e => setTimeFilter(e.target.value as any)}
            style={{ padding: '9px 12px', borderRadius: 8, border: '2px solid #E5E7EB', outline: 'none', fontWeight: 700, fontSize: 13, background: '#fff', cursor: 'pointer' }}
          >
            <option value="TODAY">Today</option>
            <option value="WEEK">This Week</option>
            <option value="MONTH">This Month</option>
            <option value="YEAR">This Year</option>
            <option value="ALL">All Time</option>
          </select>
          <button onClick={loadTickets} style={{ background: '#111827', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>↻</span> Refresh
          </button>
        </div>
      </div>

      {/* Financial Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 16 }}>
        <div style={{ background: '#111827', borderRadius: 12, padding: '16px 20px', color: '#fff', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#9CA3AF', letterSpacing: 0.5, marginBottom: 4 }}>TOTAL STAKE ({timeFilter})</div>
          <div style={{ fontSize: 28, fontWeight: 900 }}>{totalStake.toFixed(2)} Br</div>
        </div>
        <div style={{ background: '#059669', borderRadius: 12, padding: '16px 20px', color: '#fff', boxShadow: '0 4px 6px rgba(16,185,129,0.2)' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#A7F3D0', letterSpacing: 0.5, marginBottom: 4 }}>TOTAL PAYOUT WON</div>
          <div style={{ fontSize: 28, fontWeight: 900 }}>{totalPayout.toFixed(2)} Br</div>
        </div>
      </div>

      {/* Ticket Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Total Tickets', count: counts.ALL,     icon: '🎟️', color: '#111827', bg: '#F9FAFB', border: '#E5E7EB' },
          { label: 'Pending',       count: counts.PENDING, icon: '⏳', color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
          { label: 'Won',           count: counts.WON,     icon: '✅', color: '#059669', bg: '#F0FDF4', border: '#A7F3D0' },
          { label: 'Lost',          count: counts.LOST,    icon: '❌', color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
        ].map(s => (
          <div key={s.label} style={{ background: s.bg, border: `1px solid ${s.border}`, borderRadius: 12, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
            <div style={{ fontSize: 22 }}>{s.icon}</div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 900, color: s.color, lineHeight: 1 }}>{s.count}</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: s.color, opacity: 0.8, marginTop: 4 }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Search + Filter */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 200, position: 'relative' }}>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#9CA3AF" strokeWidth="2.5" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }}>
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by ticket code..."
            style={{ width: '100%', padding: '11px 14px 11px 38px', border: '2px solid #E5E7EB', borderRadius: 10, fontSize: 14, outline: 'none', boxSizing: 'border-box', background: '#fff', fontFamily: 'monospace', fontWeight: 600 }} />
          {search && <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', fontSize: 16 }}>✕</button>}
        </div>
        <div style={{ display: 'flex', gap: 6, background: '#fff', padding: '4px', borderRadius: 10, border: '1px solid #E5E7EB', overflowX: 'auto' }}>
          {TAB_FILTERS.map(tab => {
            const isActive = filter === tab.key;
            return (
              <button key={tab.key} onClick={() => setFilter(tab.key)} style={{ padding: '7px 14px', borderRadius: 8, border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, transition: 'all 0.15s', background: isActive ? tab.color : 'transparent', color: isActive ? '#fff' : tab.color, whiteSpace: 'nowrap' }}>
                <span>{tab.icon}</span> {tab.label}
                <span style={{ background: isActive ? 'rgba(255,255,255,0.25)' : '#F3F4F6', color: isActive ? '#fff' : tab.color, padding: '1px 7px', borderRadius: 20, fontSize: 11, fontWeight: 800 }}>{counts[tab.key]}</span>
              </button>
            );
          })}
        </div>
      </div>

      {loading && <div style={{ textAlign: 'center', padding: '60px 0', color: '#6B7280' }}>⏳ Loading tickets...</div>}
      {error && <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: 16, color: '#DC2626' }}>⚠️ {error}</div>}
      {!loading && !error && filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '80px 0' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🎟️</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#374151' }}>{search ? 'No matching tickets' : `No ${filter === 'ALL' ? '' : filter.toLowerCase()} tickets found for ${timeFilter}`}</div>
          <div style={{ fontSize: 13, color: '#9CA3AF', marginTop: 4 }}>Change your time filter or place new bets</div>
        </div>
      )}

      <div>
        {filtered.map(t => <AgentTicketCard key={t.id} slip={t} />)}
      </div>
    </div>
  );
}

/* ─── Main Agent Page ────────────────────────────────────── */
/* ─── Main Agent Page ────────────────────────────────────── */
export default function AgentPage() {
  const router = useRouter();
  const [agent, setAgent] = useState<AgentSession | null>(null);
  const [activeView, setActiveView] = useState<ActiveView>('place-bet');
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('miraclbet_user');
    if (!saved) { router.push('/login'); return; }
    const u = JSON.parse(saved);
    if (u.role !== 'AGENT' && u.role !== 'ADMIN') { router.push('/'); return; }
    setAgent(u);
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('miraclbet_user');
    router.push('/login');
  };

  const handleNav = (view: ActiveView) => {
    setActiveView(view);
    setDrawerOpen(false); // auto-close drawer on mobile
  };

  if (!agent) return null;

  const pageTitle = activeView === 'place-bet' ? '🖨️ Place Bet & Print' : '🎟️ My Tickets';

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#F3F4F6', fontFamily: 'system-ui, -apple-system, sans-serif' }}>

      {/* ── Desktop permanent sidebar ── */}
      <div className="no-print agent-sidebar-desktop">
        <Sidebar active={activeView} onNav={handleNav} agent={agent} onLogout={handleLogout} />
      </div>

      {/* ── Mobile: blur backdrop ── */}
      {drawerOpen && (
        <div
          onClick={() => setDrawerOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 40, backdropFilter: 'blur(2px)', WebkitBackdropFilter: 'blur(2px)' }}
        />
      )}

      {/* ── Mobile: slide-in drawer ── */}
      <div
        className="no-print agent-sidebar-mobile"
        style={{
          position: 'fixed', top: 0, left: 0, height: '100vh', zIndex: 50,
          transform: drawerOpen ? 'translateX(0)' : 'translateX(-260px)',
          transition: 'transform 0.28s cubic-bezier(0.4,0,0.2,1)',
          boxShadow: drawerOpen ? '6px 0 40px rgba(0,0,0,0.4)' : 'none',
        }}
      >
        {/* Close button */}
        {drawerOpen && (
          <button
            onClick={() => setDrawerOpen(false)}
            style={{ position: 'absolute', top: 12, right: -44, background: '#374151', border: 'none', borderRadius: '50%', width: 36, height: 36, color: '#fff', cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60, boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }}
            aria-label="Close menu"
          >
            ✕
          </button>
        )}
        <Sidebar active={activeView} onNav={handleNav} agent={agent} onLogout={handleLogout} />
      </div>

      {/* ── Main content area ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'auto', minWidth: 0 }}>

        {/* Sticky top navbar */}
        <div className="no-print" style={{
          background: '#111827', borderBottom: '1px solid #1F2937',
          padding: '0 16px', display: 'flex', alignItems: 'center',
          gap: 10, height: 56, position: 'sticky', top: 0, zIndex: 30,
        }}>
          {/* Hamburger — mobile only */}
          <button
            className="agent-hamburger"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open menu"
            style={{ background: 'rgba(255,255,255,0.08)', border: 'none', cursor: 'pointer', padding: '8px 9px', borderRadius: 8, flexDirection: 'column', gap: 5, alignItems: 'center', justifyContent: 'center' }}
          >
            <span style={{ display: 'block', width: 20, height: 2, background: '#fff', borderRadius: 2 }} />
            <span style={{ display: 'block', width: 20, height: 2, background: '#fff', borderRadius: 2 }} />
            <span style={{ display: 'block', width: 14, height: 2, background: '#F5A623', borderRadius: 2 }} />
          </button>

          {/* Mobile logo */}
          <div className="agent-mobile-logo" style={{ fontWeight: 900, fontSize: 16, color: '#fff', flexShrink: 0 }}>
            Miracl<span style={{ color: '#F5A623' }}>Bet</span>
            <span style={{ marginLeft: 5, background: '#F5A623', color: '#111827', padding: '1px 5px', borderRadius: 4, fontSize: 8, fontWeight: 900, verticalAlign: 'middle' }}>AGENT</span>
          </div>

          <h1 style={{ margin: 0, flex: 1, fontSize: 14, fontWeight: 800, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {pageTitle}
          </h1>

          <div style={{ fontSize: 11, color: '#9CA3AF', background: '#1F2937', padding: '5px 10px', borderRadius: 8, fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0 }}>
            {agent.phone}
          </div>
        </div>

        {/* Page content */}
        <div style={{ flex: 1, padding: '20px 16px' }}>
          {activeView === 'place-bet' && <PlaceBetView agent={agent} />}
          {activeView === 'my-tickets' && <MyTicketsView agent={agent} />}
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        /* ≥768px desktop: permanent sidebar, hide mobile UI */
        @media (min-width: 768px) {
          .agent-sidebar-desktop { display: block !important; height: 100%; flex-shrink: 0; }
          .agent-sidebar-mobile  { display: none   !important; }
          .agent-hamburger       { display: none   !important; }
          .agent-mobile-logo     { display: none   !important; }
        }
        /* <768px mobile: slide drawer, hamburger visible */
        @media (max-width: 767px) {
          .agent-sidebar-desktop { display: none  !important; }
          .agent-sidebar-mobile  { display: block !important; }
          .agent-hamburger       { display: flex  !important; }
          .agent-mobile-logo     { display: block !important; }
        }
        @media print {
          .no-print { display: none !important; }
          body * { visibility: hidden; }
          .print-receipt, .print-receipt * { visibility: visible; }
          .print-receipt { position: fixed; left: 0; top: 0; width: 80mm; padding: 10px; box-shadow: none !important; }
        }
      `}} />
    </div>
  );
}
