import re

with open(r'apps\web\app\agent\page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

new_placebet = r"""function PlaceBetView({ agent }: { agent: AgentSession }) {
  const [bookingCode, setBookingCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [booking, setBooking] = useState<BookingData | null>(null);
  const [stake, setStake] = useState('');
  const [placedTicketId, setPlacedTicketId] = useState<string | null>(null);
  const [placing, setPlacing] = useState(false);
  const [copied, setCopied] = useState(false);
  const printDate = useRef(new Date().toLocaleString());
  const betStartTime = useRef<string>('');

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
    betStartTime.current = new Date().toLocaleString();
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

  const handleCopyCode = () => {
    if (!booking?.code) return;
    navigator.clipboard.writeText(booking.code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
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

        {/* Loading skeleton */}
        {loading && (
          <div style={{ borderTop: '2px dashed #E5E7EB', paddingTop: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, background: '#F9FAFB', padding: '10px 14px', borderRadius: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(90deg, #e5e7eb 25%, #f3f4f6 50%, #e5e7eb 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite', flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ height: 12, background: 'linear-gradient(90deg, #e5e7eb 25%, #f3f4f6 50%, #e5e7eb 75%)', borderRadius: 6, marginBottom: 6, backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite' }} />
                <div style={{ height: 10, background: 'linear-gradient(90deg, #e5e7eb 25%, #f3f4f6 50%, #e5e7eb 75%)', borderRadius: 6, width: '70%', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite' }} />
              </div>
            </div>
            {[1,2,3].map(i => (
              <div key={i} style={{ height: 48, background: 'linear-gradient(90deg, #e5e7eb 25%, #f3f4f6 50%, #e5e7eb 75%)', borderRadius: 8, marginBottom: 8, backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite' }} />
            ))}
            <div style={{ textAlign: 'center', fontSize: 12, color: '#9CA3AF', fontWeight: 600, marginTop: 8 }}>⏳ Loading booking code...</div>
          </div>
        )}

        {error && (
          <div style={{ background: '#FEF2F2', color: '#DC2626', padding: '10px 12px', borderRadius: 8, fontSize: 13, fontWeight: 600, marginBottom: 14, border: '1px solid #FECACA' }}>
            ⚠️ {error}
          </div>
        )}

        {/* Loaded booking code pill + copy */}
        {booking && !loading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#F0F9FF', border: '1.5px solid #BAE6FD', borderRadius: 10, padding: '8px 12px', marginBottom: 14 }}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#0EA5E9" strokeWidth="2.5">
              <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
            </svg>
            <span style={{ flex: 1, fontFamily: 'monospace', fontWeight: 900, fontSize: 15, color: '#0369A1', letterSpacing: 1 }}>{booking.code}</span>
            <button
              onClick={handleCopyCode}
              style={{ background: copied ? '#10B981' : '#0EA5E9', color: '#fff', border: 'none', padding: '5px 10px', borderRadius: 6, fontWeight: 700, fontSize: 11, cursor: 'pointer', transition: 'background 0.2s', display: 'flex', alignItems: 'center', gap: 4 }}
            >
              {copied ? '✓ Copied!' : '📋 Copy'}
            </button>
          </div>
        )}

        {booking && !placedTicketId && !loading && (
          <div style={{ borderTop: '2px dashed #E5E7EB', paddingTop: 16 }}>
            <div style={{ background: '#F9FAFB', borderRadius: 10, padding: 12, marginBottom: 14 }}>
              {booking.selections.map((sel, i) => (
                <div key={i} style={{ borderBottom: i < booking.selections.length - 1 ? '1px dashed #E5E7EB' : 'none', paddingBottom: 8, marginBottom: 8 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: '#111827' }}>{sel.matchName || '—'}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
                    <span style={{ fontSize: 12, color: '#6B7280' }}>{sel.marketName} · <strong>{sel.selectionName}</strong></span>
                    <span style={{ fontSize: 13, fontWeight: 900 }}>{sel.odds.toFixed(2)}</span>
                  </div>
                  {sel.kickoffAt && (
                    <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>
                      ⏱ {new Date(sel.kickoffAt).toLocaleString(undefined, { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' })}
                    </div>
                  )}
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
              {placing ? '⏳ Placing...' : 'CONFIRM & PLACE BET'}
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
            <div style={{ fontSize: 10, marginTop: 2, letterSpacing: 1 }}>Betting Slip</div>
            <div style={{ fontSize: 11, marginTop: 4 }}>Date: {printDate.current}</div>
            {betStartTime.current && (
              <div style={{ fontSize: 11, marginTop: 2 }}>Started: {betStartTime.current}</div>
            )}
            <div style={{ fontSize: 11, marginTop: 2 }}>Agent: {agent.phone}</div>
            {booking && (
              <div style={{ fontSize: 11, marginTop: 2 }}>Coupon: {booking.code}</div>
            )}
          </div>

          <div style={{ textAlign: 'center', marginBottom: 14 }}>
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
                    {sel.kickoffAt && (
                      <div style={{ fontSize: 10, color: '#555', marginTop: 2 }}>
                        {new Date(sel.kickoffAt).toLocaleString(undefined, { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div style={{ borderTop: '1px dashed #000', paddingTop: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                  <span>BETS:</span><span style={{ fontWeight: 900 }}>{booking.selections.length}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                  <span>STAKE:</span><span style={{ fontWeight: 900 }}>{stake ? parseFloat(stake).toFixed(2) : '0.00'} Br</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                  <span>ODD:</span><span style={{ fontWeight: 900 }}>{booking.total_odds.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4, borderTop: '1px solid #000', paddingTop: 6 }}>
                  <span>WINNING:</span><span style={{ fontWeight: 900 }}>{payout} Br</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 16, fontWeight: 900, borderTop: '2px solid #000', paddingTop: 8 }}>
                  <span>NET PAY:</span><span>{payout} Br</span>
                </div>
              </div>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '32px 0', opacity: 0.4, fontSize: 12 }}>Load a booking to preview receipt</div>
          )}

          <div style={{ textAlign: 'center', marginTop: 20, paddingTop: 14, borderTop: '2px dashed #000', fontSize: 10 }}>
            {placedTicketId && (
              <div style={{ display: 'flex', justifyContent: 'center', margin: '0 0 12px' }}>
                <QRCode value={`https://www.miraclbet.com/check?code=TICKET-${placedTicketId.toUpperCase()}`} size={110} level="H" style={{ display: 'block' }} />
              </div>
            )}
            <div style={{ fontWeight: 700, fontSize: 11 }}>{placedTicketId ? `TICKET-${placedTicketId.substring(0,8).toUpperCase()}` : ''}</div>
            <div style={{ marginTop: 6 }}>Scan to check status online</div>
            <div style={{ fontWeight: 700, marginTop: 2 }}>www.miraclbet.com/check</div>
            <div style={{ marginTop: 10, fontSize: 10 }}>*** Bets after kick-off are invalid ***</div>
            <div style={{ fontSize: 10 }}>Under 21s forbidden. T&C apply.</div>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        @media print {
          body * { visibility: hidden; }
          .print-receipt, .print-receipt * { visibility: visible; }
          .print-receipt { position: fixed; left: 0; top: 0; width: 80mm; padding: 10px; box-shadow: none !important; }
          .no-print { display: none !important; }
        }
      `}} />
    </div>
  );
}"""

# Replace old PlaceBetView
pattern = re.compile(r'function PlaceBetView\(\{ agent \}: \{ agent: AgentSession \}\).*?^}$', re.MULTILINE | re.DOTALL)
new_content, n = pattern.subn(new_placebet, content, count=1)

if n > 0:
    with open(r'apps\web\app\agent\page.tsx', 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("SUCCESS")
else:
    print("ERROR: PlaceBetView not found")
