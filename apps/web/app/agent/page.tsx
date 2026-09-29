'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import QRCode from 'react-qr-code';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

type AgentSession = { phone: string; role: string; id?: string };

// Match the exact field names the API returns
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

export default function AgentPage() {
  const router = useRouter();
  const [agent, setAgent] = useState<AgentSession | null>(null);

  const [bookingCode, setBookingCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [booking, setBooking] = useState<BookingData | null>(null);
  const [stake, setStake] = useState<string>('');

  const [placedTicketId, setPlacedTicketId] = useState<string | null>(null);
  const [placing, setPlacing] = useState(false);

  const printDate = useRef(new Date().toLocaleString());

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

  const lookupBooking = async () => {
    setError('');
    setBooking(null);
    setPlacedTicketId(null);
    setStake('');
    const code = bookingCode.trim().toUpperCase();
    if (!code) return;

    setLoading(true);
    try {
      const res = await fetch(`${API}/api/v1/betslips/${code}`);
      if (!res.ok) {
        const txt = await res.text();
        try { setError(JSON.parse(txt).error || 'Booking code not found.'); } catch { setError('Booking code not found.'); }
        return;
      }
      const data = await res.json();
      setBooking(data);
      printDate.current = new Date().toLocaleString();
    } catch {
      setError('Network error. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const placeBet = async () => {
    if (!booking || !stake || !agent?.id) return;
    const stakeNum = parseFloat(stake);
    if (isNaN(stakeNum) || stakeNum < 1) {
      setError('Enter a valid cash amount');
      return;
    }

    setPlacing(true);
    setError('');
    try {
      const res = await fetch(`${API}/api/v1/bets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: agent.id,
          stake: stakeNum,
          total_odds: booking.total_odds,
          selections: booking.selections,
          booking_code: booking.code,
        }),
      });

      if (!res.ok) {
        const txt = await res.text();
        try {
          const errData = JSON.parse(txt);
          setError(errData.message || errData.error || 'Failed to place bet');
        } catch {
          setError(txt || 'Failed to place bet');
        }
        return;
      }
      const data = await res.json();
      setPlacedTicketId(data.id || data.slip_id || booking.code);
    } catch {
      setError('Network error placing bet. Check your connection.');
    } finally {
      setPlacing(false);
    }
  };

  const handlePrint = () => { window.print(); };

  if (!agent) return null;

  const payout = stake && booking ? (parseFloat(stake) * booking.total_odds).toFixed(2) : '0.00';

  return (
    <div style={{ minHeight: '100vh', background: '#F3F4F6', fontFamily: 'system-ui, -apple-system, sans-serif' }}>

      {/* Top Bar */}
      <div className="no-print" style={{ background: '#111827', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ color: '#fff', fontWeight: 900, fontSize: 18, letterSpacing: -0.5 }}>
            Miracl<span style={{ color: '#F5A623' }}>Bet</span>
            <span style={{ marginLeft: 10, background: '#F5A623', color: '#111827', padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 800 }}>AGENT POS</span>
          </div>
          <div style={{ color: '#9CA3AF', fontSize: 11, marginTop: 2 }}>Cashier: {agent.phone}</div>
        </div>
        <button onClick={handleLogout} style={{ background: '#374151', color: '#D1D5DB', border: 'none', padding: '8px 14px', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
          Logout
        </button>
      </div>

      <div style={{ padding: '20px 16px', maxWidth: '1000px', margin: '0 auto', display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'flex-start' }}>

        {/* Left: Booking Lookup */}
        <div className="no-print" style={{ flex: '1 1 300px', background: '#fff', borderRadius: 16, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.07)' }}>
          <h2 style={{ fontSize: 15, fontWeight: 800, margin: '0 0 14px', color: '#111827' }}>Load Customer Booking</h2>

          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <input
              value={bookingCode}
              onChange={e => setBookingCode(e.target.value.toUpperCase())}
              placeholder="e.g. M51YH25"
              style={{ flex: 1, padding: '12px 14px', border: '2px solid #E5E7EB', borderRadius: 10, fontSize: 15, fontWeight: 700, outline: 'none', textTransform: 'uppercase' }}
              onKeyDown={e => e.key === 'Enter' && lookupBooking()}
            />
            <button
              onClick={lookupBooking}
              disabled={loading}
              style={{ background: '#111827', color: '#fff', border: 'none', padding: '0 18px', borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: loading ? 'not-allowed' : 'pointer', minWidth: 70 }}
            >
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
                      <span style={{ fontSize: 13, fontWeight: 900, color: '#111827' }}>{sel.odds.toFixed(2)}</span>
                    </div>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, paddingTop: 8, borderTop: '1px solid #E5E7EB' }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#374151' }}>Total Odds</span>
                  <span style={{ fontSize: 14, fontWeight: 900, color: '#111827' }}>{booking.total_odds.toFixed(2)}</span>
                </div>
              </div>

              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#4B5563', marginBottom: 6 }}>CASH AMOUNT (Br)</label>
              <input
                type="number"
                value={stake}
                onChange={e => setStake(e.target.value)}
                placeholder="0.00"
                style={{ width: '100%', padding: '14px 16px', border: '2px solid #10B981', borderRadius: 10, fontSize: 20, fontWeight: 900, outline: 'none', boxSizing: 'border-box', marginBottom: 10 }}
              />

              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, background: '#F0FDF4', padding: '10px 14px', borderRadius: 8 }}>
                <span style={{ color: '#065F46', fontSize: 13, fontWeight: 800 }}>To Pay:</span>
                <span style={{ color: '#059669', fontSize: 16, fontWeight: 900 }}>{payout} Br</span>
              </div>

              <button
                onClick={placeBet}
                disabled={placing || !stake}
                style={{ width: '100%', background: (placing || !stake) ? '#9CA3AF' : '#10B981', color: '#fff', border: 'none', padding: '16px', borderRadius: 12, fontWeight: 900, fontSize: 16, cursor: (placing || !stake) ? 'not-allowed' : 'pointer' }}
              >
                {placing ? 'Placing Bet...' : 'CONFIRM & PLACE BET'}
              </button>
            </div>
          )}

          {placedTicketId && (
            <div style={{ background: '#F0FDF4', padding: 16, borderRadius: 12, border: '1px solid #A7F3D0', textAlign: 'center', marginTop: 12 }}>
              <div style={{ fontSize: 36, marginBottom: 6 }}>✅</div>
              <h3 style={{ color: '#065F46', margin: '0 0 6px', fontWeight: 900, fontSize: 16 }}>Bet Placed!</h3>
              <p style={{ color: '#047857', fontSize: 13, margin: '0 0 14px' }}>Print the ticket and hand it to the customer.</p>
              <button onClick={handlePrint} style={{ background: '#059669', color: '#fff', border: 'none', padding: '12px', borderRadius: 8, fontWeight: 800, cursor: 'pointer', width: '100%', fontSize: 14, marginBottom: 8 }}>
                🖨️ Print Ticket
              </button>
              <button onClick={() => { setBookingCode(''); setBooking(null); setPlacedTicketId(null); setStake(''); setError(''); }} style={{ background: '#fff', color: '#059669', border: '2px solid #059669', padding: '10px', borderRadius: 8, fontWeight: 800, cursor: 'pointer', width: '100%', fontSize: 13 }}>
                New Customer
              </button>
            </div>
          )}
        </div>

        {/* Right: Receipt */}
        <div style={{ flex: '1 1 320px' }}>
          <div className="no-print" style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
            <button
              onClick={handlePrint}
              disabled={!placedTicketId}
              style={{ background: '#111827', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: 8, fontWeight: 800, cursor: placedTicketId ? 'pointer' : 'not-allowed', opacity: placedTicketId ? 1 : 0.4, display: 'flex', gap: 8, alignItems: 'center', fontSize: 14 }}
            >
              <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2.5" fill="none"><path d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><path d="M6 14h12v8H6z"/></svg>
              Print Ticket
            </button>
          </div>

          {/* Physical Receipt */}
          <div className="print-receipt" style={{ background: '#fff', padding: '28px 20px', borderRadius: 4, fontFamily: '"Courier New", Courier, monospace', color: '#000', boxShadow: '0 8px 24px rgba(0,0,0,0.1)', maxWidth: 400, margin: '0 auto' }}>
            {/* Header */}
            <div style={{ textAlign: 'center', borderBottom: '2px dashed #000', paddingBottom: 14, marginBottom: 14 }}>
              <div style={{ fontSize: 26, fontWeight: 900, letterSpacing: 2 }}>MIRACL BET</div>
              <div style={{ fontSize: 11, marginTop: 4 }}>Date: {printDate.current}</div>
              <div style={{ fontSize: 11, marginTop: 2 }}>Agent: {agent.phone}</div>
            </div>

            {/* Ticket ID */}
            <div style={{ textAlign: 'center', marginBottom: 18 }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2 }}>TICKET ID</div>
              <div style={{ fontSize: 20, fontWeight: 900, marginTop: 4, letterSpacing: 1 }}>
                {placedTicketId
                  ? `TICKET-${placedTicketId.substring(0, 8).toUpperCase()}`
                  : <span style={{ opacity: 0.35, fontSize: 13 }}>Place bet to generate</span>
                }
              </div>
            </div>

            {booking ? (
              <>
                {/* Selections */}
                <div style={{ borderTop: '1px solid #000', borderBottom: '1px solid #000', padding: '8px 0', marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, fontWeight: 700, letterSpacing: 1, marginBottom: 8 }}>
                    <span>SELECTIONS</span><span>ODDS</span>
                  </div>
                  {booking.selections.map((sel, idx) => (
                    <div key={idx} style={{ paddingBottom: 8, marginBottom: 8, borderBottom: idx < booking.selections.length - 1 ? '1px dashed #ccc' : 'none' }}>
                      <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 2 }}>{sel.matchName || '—'}</div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 11, color: '#333' }}>{sel.marketName} · {sel.selectionName}</span>
                        <span style={{ fontSize: 13, fontWeight: 900 }}>{sel.odds.toFixed(2)}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Totals */}
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
              <div style={{ textAlign: 'center', padding: '32px 0', opacity: 0.4, fontSize: 12 }}>
                Load a booking to preview receipt
              </div>
            )}

            {/* Footer */}
            <div style={{ textAlign: 'center', marginTop: 24, paddingTop: 14, borderTop: '2px dashed #000', fontSize: 11 }}>
              {placedTicketId && (
                <div style={{ display: 'flex', justifyContent: 'center', margin: '16px 0' }}>
                  <QRCode value={`https://www.miraclbet.com/check?code=TICKET-${placedTicketId.toUpperCase()}`} size={130} level="H" style={{ display: "block" }} />
                </div>
              )}
              <div>Scan to check status online</div>
              <div style={{ fontWeight: 700, marginTop: 4 }}>www.miraclbet.com/check</div>
            </div>
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
