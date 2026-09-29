'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

type AgentSession = { phone: string; role: string; id?: string };

type Selection = {
  fixture_id: string;
  match_name: string;
  market_name: string;
  selection_id: string;
  selection_name: string;
  odds: number;
  home_logo?: string;
  away_logo?: string;
  kickoff_at?: string;
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
    if (!bookingCode.trim()) return;

    setLoading(true);
    try {
      const res = await fetch(`${API}/api/v1/betslips/${bookingCode.trim()}`);
      if (!res.ok) {
        setError('Booking code not found or invalid.');
        return;
      }
      const data = await res.json();
      setBooking(data);
    } catch (e) {
      setError('Network error looking up booking.');
    } finally {
      setLoading(false);
    }
  };

  const placeBet = async () => {
    if (!booking || !stake) return;
    const stakeNum = parseFloat(stake);
    if (isNaN(stakeNum) || stakeNum < 10) {
      setError('Stake must be at least 10 Br');
      return;
    }

    setPlacing(true);
    setError('');
    try {
      const res = await fetch(`${API}/api/v1/bets/place`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${agent?.id}` // Using ID as simple auth for this prototype
        },
        body: JSON.stringify({
          user_id: agent?.id,
          stake: stakeNum,
          total_odds: booking.total_odds,
          selections: booking.selections,
          booking_code: booking.code
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.message || 'Failed to place bet');
        return;
      }

      setPlacedTicketId(data.id || data.slip_id);
    } catch (e) {
      setError('Network error placing bet');
    } finally {
      setPlacing(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (!agent) return null;

  return (
    <div style={{ minHeight: '100vh', background: '#F3F4F6', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      
      {/* Top Bar - hidden during print */}
      <div className="no-print" style={{
        background: '#111827', padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
      }}>
        <div>
          <div style={{ color: '#fff', fontWeight: 900, fontSize: 18, letterSpacing: -0.5 }}>
            Miracl<span style={{ color: '#F5A623' }}>Bet</span>
            <span style={{ marginLeft: 10, background: '#F5A623', color: '#111827', padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 800 }}>AGENT POS</span>
          </div>
          <div style={{ color: '#9CA3AF', fontSize: 12, marginTop: 2 }}>Cashier: {agent.phone}</div>
        </div>
        <button onClick={handleLogout} style={{ background: '#374151', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
          Logout
        </button>
      </div>

      <div style={{ padding: '24px 16px', maxWidth: '1000px', margin: '0 auto', display: 'flex', gap: '24px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
        
        {/* Left Side: Booking Lookup (Hidden on Print) */}
        <div className="no-print" style={{ flex: '1 1 300px', background: '#fff', borderRadius: 16, padding: 24, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
          <h2 style={{ fontSize: 16, fontWeight: 800, margin: '0 0 16px', color: '#111827' }}>Load Customer Booking</h2>
          
          <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
            <input 
              value={bookingCode}
              onChange={e => setBookingCode(e.target.value.toUpperCase())}
              placeholder="e.g. B-9K2JD"
              style={{ flex: 1, padding: '12px 16px', border: '2px solid #E5E7EB', borderRadius: 10, fontSize: 15, fontWeight: 700, textTransform: 'uppercase', outline: 'none' }}
              onKeyDown={e => e.key === 'Enter' && lookupBooking()}
            />
            <button 
              onClick={lookupBooking} 
              disabled={loading}
              style={{ background: '#111827', color: '#fff', border: 'none', padding: '0 20px', borderRadius: 10, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer' }}
            >
              {loading ? '...' : 'Load'}
            </button>
          </div>

          {error && <div style={{ background: '#FEF2F2', color: '#DC2626', padding: '12px', borderRadius: 8, fontSize: 13, fontWeight: 600, marginBottom: 16 }}>{error}</div>}

          {booking && !placedTicketId && (
            <div style={{ borderTop: '2px dashed #E5E7EB', paddingTop: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ color: '#6B7280', fontSize: 13, fontWeight: 600 }}>Total Matches:</span>
                <span style={{ color: '#111827', fontSize: 14, fontWeight: 800 }}>{booking.selections.length}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
                <span style={{ color: '#6B7280', fontSize: 13, fontWeight: 600 }}>Total Odds:</span>
                <span style={{ color: '#111827', fontSize: 14, fontWeight: 900 }}>{booking.total_odds.toFixed(2)}</span>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#4B5563', marginBottom: 6 }}>CASH AMOUNT (Br)</label>
                <input 
                  type="number"
                  value={stake}
                  onChange={e => setStake(e.target.value)}
                  placeholder="0.00"
                  style={{ width: '100%', padding: '14px 16px', border: '2px solid #10B981', borderRadius: 10, fontSize: 18, fontWeight: 900, outline: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20, background: '#F0FDF4', padding: 12, borderRadius: 8 }}>
                <span style={{ color: '#065F46', fontSize: 13, fontWeight: 800 }}>To Pay:</span>
                <span style={{ color: '#059669', fontSize: 15, fontWeight: 900 }}>
                  {stake ? (parseFloat(stake) * booking.total_odds).toFixed(2) : '0.00'} Br
                </span>
              </div>

              <button 
                onClick={placeBet} 
                disabled={placing || !stake}
                style={{ width: '100%', background: '#10B981', color: '#fff', border: 'none', padding: '16px', borderRadius: 12, fontWeight: 900, fontSize: 16, cursor: (placing || !stake) ? 'not-allowed' : 'pointer', boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)' }}
              >
                {placing ? 'Placing Bet...' : 'CONFIRM & PLACE BET'}
              </button>
            </div>
          )}

          {placedTicketId && (
            <div style={{ background: '#F0FDF4', padding: 16, borderRadius: 12, border: '1px solid #A7F3D0', textAlign: 'center', marginTop: 16 }}>
              <div style={{ color: '#059669', fontSize: 32, marginBottom: 8 }}>✓</div>
              <h3 style={{ color: '#065F46', margin: '0 0 8px', fontSize: 16, fontWeight: 900 }}>Bet Placed Successfully</h3>
              <p style={{ color: '#047857', fontSize: 13, margin: '0 0 16px' }}>The ticket is ready to print.</p>
              <button onClick={() => { setBookingCode(''); setBooking(null); setPlacedTicketId(null); setStake(''); }} style={{ background: '#fff', color: '#059669', border: '2px solid #059669', padding: '10px 16px', borderRadius: 8, fontWeight: 800, cursor: 'pointer', width: '100%' }}>
                New Customer
              </button>
            </div>
          )}
        </div>

        {/* Right Side: Receipt Printer View */}
        <div style={{ flex: '1 1 400px' }}>
          {/* Print controls */}
          <div className="no-print" style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
            <button 
              onClick={handlePrint}
              disabled={!placedTicketId}
              style={{ background: '#111827', color: '#fff', border: 'none', padding: '10px 24px', borderRadius: 8, fontWeight: 800, cursor: placedTicketId ? 'pointer' : 'not-allowed', opacity: placedTicketId ? 1 : 0.5, display: 'flex', gap: 8, alignItems: 'center' }}
            >
              <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2.5" fill="none"><path d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><path d="M6 14h12v8H6z"/></svg>
              Print Ticket
            </button>
          </div>

          {/* Actual Receipt HTML */}
          <div className="print-receipt" style={{ background: '#fff', padding: '32px 24px', borderRadius: 4, fontFamily: 'monospace', color: '#000', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ textAlign: 'center', borderBottom: '2px dashed #000', paddingBottom: 16, marginBottom: 16 }}>
              <h1 style={{ fontSize: 24, fontWeight: 900, margin: 0, letterSpacing: -1 }}>MIRACL BET</h1>
              <div style={{ fontSize: 12, marginTop: 4 }}>Date: {new Date().toLocaleString()}</div>
              <div style={{ fontSize: 12, marginTop: 2 }}>Agent: {agent.phone}</div>
            </div>

            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1 }}>TICKET ID</div>
              <div style={{ fontSize: 18, fontWeight: 900 }}>{placedTicketId ? `TICKET-${placedTicketId.substring(0, 8).toUpperCase()}` : 'NOT PLACED YET'}</div>
            </div>

            {booking && (
              <>
                <div style={{ borderBottom: '1px solid #000', paddingBottom: 8, marginBottom: 8, display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 700 }}>
                  <span>SELECTIONS</span>
                  <span>ODDS</span>
                </div>
                
                {booking.selections.map((sel, idx) => (
                  <div key={idx} style={{ borderBottom: '1px dashed #ccc', paddingBottom: 8, marginBottom: 8 }}>
                    <div style={{ fontSize: 12, fontWeight: 700 }}>{sel.match_name}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                      <span style={{ fontSize: 11 }}>{sel.market_name} - {sel.selection_name}</span>
                      <span style={{ fontSize: 12, fontWeight: 700 }}>{sel.odds.toFixed(2)}</span>
                    </div>
                  </div>
                ))}

                <div style={{ marginTop: 16, paddingTop: 16, borderTop: '2px dashed #000' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13 }}>
                    <span>Total Odds:</span>
                    <span style={{ fontWeight: 900 }}>{booking.total_odds.toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13 }}>
                    <span>Stake:</span>
                    <span style={{ fontWeight: 900 }}>{stake ? parseFloat(stake).toFixed(2) : '0.00'} Br</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, paddingTop: 12, borderTop: '1px solid #000', fontSize: 15 }}>
                    <span style={{ fontWeight: 700 }}>TO PAYOUT:</span>
                    <span style={{ fontWeight: 900 }}>{stake ? (parseFloat(stake) * booking.total_odds).toFixed(2) : '0.00'} Br</span>
                  </div>
                </div>
              </>
            )}

            {!booking && (
              <div style={{ textAlign: 'center', padding: '40px 0', opacity: 0.5, fontSize: 12 }}>
                Load a booking to generate receipt preview
              </div>
            )}
            
            <div style={{ textAlign: 'center', marginTop: 32, fontSize: 11 }}>
              Scan to check status online
              <div style={{ marginTop: 4 }}>www.miraclbet.com/check</div>
            </div>
          </div>
        </div>

      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body * { visibility: hidden; }
          .print-receipt, .print-receipt * { visibility: visible; }
          .print-receipt { position: absolute; left: 0; top: 0; width: 100%; box-shadow: none !important; }
          .no-print { display: none !important; }
        }
      `}} />
    </div>
  );
}
