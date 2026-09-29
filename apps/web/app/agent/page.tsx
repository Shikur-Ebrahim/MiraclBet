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
  legs: Array<{ match_name: string; market_name: string; selection_name: string; odds: number; status: string }>;
};

type ActiveView = 'place-bet' | 'my-tickets';

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
                padding: '11px 14px', borderRadius: 10, border: 'none', marginBottom: 4,
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

      {/* Bottom: logout */}
      <div style={{ padding: '16px 12px', borderTop: '1px solid #1F2937' }}>
        <button
          onClick={onLogout}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 12,
            padding: '11px 14px', borderRadius: 10, border: 'none',
            background: 'transparent', color: '#EF4444', fontWeight: 700,
            fontSize: 14, cursor: 'pointer', textAlign: 'left',
          }}
        >
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

/* ─── Place Bet View ──────────────────────────────────────── */
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
function MyTicketsView({ agent }: { agent: AgentSession }) {
  const [tickets, setTickets] = useState<AgentTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

  const statusColor: Record<string, string> = { PENDING: '#D97706', WON: '#059669', LOST: '#DC2626', VOID: '#6B7280' };
  const statusBg: Record<string, string> = { PENDING: '#FFFBEB', WON: '#F0FDF4', LOST: '#FEF2F2', VOID: '#F3F4F6' };

  return (
    <div style={{ flex: 1 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 900, color: '#111827', margin: 0 }}>My Tickets</h2>
          <p style={{ fontSize: 13, color: '#6B7280', margin: '4px 0 0' }}>All bets placed through your agent account</p>
        </div>
        <button onClick={loadTickets} style={{ background: '#111827', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>
          ↻ Refresh
        </button>
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#6B7280' }}>Loading tickets...</div>
      )}
      {error && (
        <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: 16, color: '#DC2626', fontSize: 14 }}>⚠️ {error}</div>
      )}
      {!loading && !error && tickets.length === 0 && (
        <div style={{ textAlign: 'center', padding: '80px 0' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🎟️</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#374151' }}>No tickets yet</div>
          <div style={{ fontSize: 13, color: '#9CA3AF', marginTop: 4 }}>Tickets placed through this agent will appear here</div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {tickets.map(t => {
          const sc = statusColor[t.status] || '#D97706';
          const sb = statusBg[t.status] || '#FFFBEB';
          const shortId = `TICKET-${t.id.substring(0, 8).toUpperCase()}`;
          const date = new Date(t.created_at).toLocaleString(undefined, { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

          return (
            <div key={t.id} style={{ background: '#fff', borderRadius: 14, border: '1px solid #E5E7EB', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
              {/* Header */}
              <div style={{ background: '#F9FAFB', padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #E5E7EB' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ background: sb, color: sc, border: `1px solid ${sc}33`, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 800 }}>
                    {t.status === 'PENDING' ? '⏳' : t.status === 'WON' ? '✅' : t.status === 'LOST' ? '❌' : '↩'} {t.status}
                  </span>
                  <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#059669', fontWeight: 700 }}>{shortId}</span>
                </div>
                <span style={{ fontSize: 11, color: '#9CA3AF' }}>{date}</span>
              </div>

              {/* Legs */}
              <div style={{ padding: '14px 20px' }}>
                {(t.legs || []).slice(0, 3).map((leg, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: i < (t.legs || []).length - 1 ? 10 : 0, paddingBottom: i < (t.legs || []).length - 1 ? 10 : 0, borderBottom: i < (t.legs || []).length - 1 ? '1px dashed #E5E7EB' : 'none' }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13, color: '#111827' }}>{leg.match_name}</div>
                      <div style={{ fontSize: 12, color: '#6B7280' }}>{leg.market_name} · {leg.selection_name}</div>
                    </div>
                    <span style={{ fontWeight: 900, fontSize: 15, color: '#111827' }}>{leg.odds.toFixed(2)}</span>
                  </div>
                ))}
                {(t.legs || []).length > 3 && (
                  <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 8 }}>+{t.legs.length - 3} more selections</div>
                )}
              </div>

              {/* Footer */}
              <div style={{ background: '#FAFAFA', padding: '12px 20px', borderTop: '1px dashed #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: 20 }}>
                  <div>
                    <div style={{ fontSize: 10, color: '#9CA3AF', fontWeight: 700, marginBottom: 2 }}>STAKE</div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: '#111827' }}>{t.stake.toFixed(2)} Br</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: '#9CA3AF', fontWeight: 700, marginBottom: 2 }}>TOTAL ODDS</div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: '#111827' }}>{t.total_odds.toFixed(2)}</div>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 10, color: '#9CA3AF', fontWeight: 700, marginBottom: 2 }}>POTENTIAL PAYOUT</div>
                  <div style={{ fontSize: 16, fontWeight: 900, color: t.status === 'WON' ? '#059669' : '#D97706' }}>{t.potential_payout.toFixed(2)} Br</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Main Agent Page ────────────────────────────────────── */
export default function AgentPage() {
  const router = useRouter();
  const [agent, setAgent] = useState<AgentSession | null>(null);
  const [activeView, setActiveView] = useState<ActiveView>('place-bet');

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

  if (!agent) return null;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#F3F4F6', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Sidebar */}
      <div className="no-print">
        <Sidebar active={activeView} onNav={setActiveView} agent={agent} onLogout={handleLogout} />
      </div>

      {/* Main content area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
        {/* Top header bar */}
        <div className="no-print" style={{ background: '#fff', borderBottom: '1px solid #E5E7EB', padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h1 style={{ margin: 0, fontSize: 17, fontWeight: 900, color: '#111827' }}>
            {activeView === 'place-bet' ? '🖨️ Place Bet & Print Ticket' : '🎟️ My Tickets'}
          </h1>
          <div style={{ fontSize: 12, color: '#6B7280', background: '#F3F4F6', padding: '6px 12px', borderRadius: 8, fontWeight: 600 }}>
            Agent: {agent.phone}
          </div>
        </div>

        {/* Page content */}
        <div style={{ flex: 1, padding: '24px' }}>
          {activeView === 'place-bet' && <PlaceBetView agent={agent} />}
          {activeView === 'my-tickets' && <MyTicketsView agent={agent} />}
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          .no-print { display: none !important; }
          body * { visibility: hidden; }
          .print-receipt, .print-receipt * { visibility: visible; }
          .print-receipt { position: fixed; left: 0; top: 0; width: 80mm; padding: 10px; box-shadow: none !important; }
        }
      ` }} />
    </div>
  );
}
