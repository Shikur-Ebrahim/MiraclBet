'use client';

import React, { useState, useRef } from 'react';
import Link from 'next/link';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://api.miraclbet.com:8443';

/* ─── Types ─────────────────────────────────────────────── */
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
  code?: string;
  stake: number;
  total_odds: number;
  potential_payout: number;
  status: string;
  created_at: string;
  legs: BetLeg[];
  is_booking?: boolean;
  selections_raw?: string;
}

/* ─── Helpers ────────────────────────────────────────────── */
function parseMatch(name: string) {
  const parts = name.split(' vs ');
  return { home: parts[0]?.trim() || name, away: parts[1]?.trim() || '' };
}
function fmtDate(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch { return iso; }
}

function TeamAvatar({ name, logoUrl, size = 32 }: { name: string; logoUrl?: string; size?: number }) {
  if (logoUrl) return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: '#F9FAFB', border: '2px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={logoUrl} alt={name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
    </div>
  );
  const words = name.trim().split(/\s+/);
  const initials = words.length >= 2 ? words[0][0] + words[words.length - 1][0] : name.slice(0, 2);
  const colors = ['#EF4444', '#3B82F6', '#F5A623', '#10B981', '#8B5CF6', '#EC4899', '#06B6D4'];
  const idx = (name.charCodeAt(0) + (name.charCodeAt(1) || 0)) % colors.length;
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: colors[idx], color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.3, fontWeight: 800, flexShrink: 0, border: '2px solid #E5E7EB' }}>
      {initials.toUpperCase()}
    </div>
  );
}

const STATUS_CFG: Record<string, { bg: string; text: string; border: string; label: string; icon: string }> = {
  PENDING:  { bg: '#FFFBEB', text: '#D97706', border: '#FDE68A', label: 'Pending',  icon: '⏳' },
  WON:      { bg: '#F0FDF4', text: '#059669', border: '#A7F3D0', label: 'Won',       icon: '✅' },
  LOST:     { bg: '#FEF2F2', text: '#DC2626', border: '#FECACA', label: 'Lost',      icon: '❌' },
  VOID:     { bg: '#F3F4F6', text: '#6B7280', border: '#D1D5DB', label: 'Void',      icon: '↩' },
  REFUNDED: { bg: '#F3F4F6', text: '#6B7280', border: '#D1D5DB', label: 'Refunded', icon: '↩' },
  BOOKING:  { bg: '#EFF6FF', text: '#2563EB', border: '#BFDBFE', label: 'Booking',  icon: '🎟️' },
};

/* ─── Ticket Display ─────────────────────────────────────── */
function TicketDisplay({ slip }: { slip: BetSlip }) {
  const sc = STATUS_CFG[slip.status] || STATUS_CFG.PENDING;
  const legs = slip.legs ?? [];
  const isBooking = slip.is_booking;

  // parse raw admin booking selections if is_booking
  let bookingLegs: Array<{ matchName: string; homeLogo: string; awayLogo: string; marketName: string; selectionName: string; odds: number; kickoffAt: string }> = [];
  if (isBooking && slip.selections_raw) {
    try { bookingLegs = JSON.parse(slip.selections_raw); } catch { /* ignore */ }
  }

  const allLegs = isBooking ? bookingLegs : legs;
  const foldLabel = allLegs.length > 1 ? `${allLegs.length}-Fold Accumulator` : 'Single Bet';

  return (
    <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E5E7EB', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', overflow: 'hidden', maxWidth: 520, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ background: '#F9FAFB', padding: '16px 20px', borderBottom: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ padding: '5px 12px', borderRadius: 20, background: sc.bg, color: sc.text, border: `1px solid ${sc.border}`, fontSize: 12, fontWeight: 800 }}>
            {sc.icon} {sc.label}
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 15, color: '#111827' }}>{foldLabel}</div>
            <div style={{ fontSize: 11, color: '#6B7280' }}>{fmtDate(slip.created_at)}</div>
          </div>
        </div>
        {!isBooking && (
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 10, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 1 }}>Payout</div>
            <div style={{ fontSize: 16, fontWeight: 900, color: slip.status === 'WON' ? '#059669' : '#D97706' }}>
              {slip.potential_payout.toFixed(2)} Br
            </div>
          </div>
        )}
      </div>

      {/* Legs */}
      <div style={{ background: '#fff' }}>
        {(isBooking ? bookingLegs : legs).map((leg, i) => {
          const legData = isBooking ? {
            match_name: (leg as { matchName: string }).matchName || '',
            market_name: (leg as { marketName: string }).marketName || '',
            selection_name: (leg as { selectionName: string }).selectionName || '',
            odds: (leg as { odds: number }).odds,
            status: 'PENDING',
            homeLogo: (leg as { homeLogo: string }).homeLogo,
            awayLogo: (leg as { awayLogo: string }).awayLogo,
            kickoffAt: (leg as { kickoffAt: string }).kickoffAt,
          } : leg as BetLeg;

          const { home, away } = parseMatch(legData.match_name);
          const legWon = legData.status === 'WON';
          const legLost = legData.status === 'LOST';

          return (
            <div key={i} style={{ position: 'relative' }}>
              {/* Receipt notches between legs */}
              {i > 0 && (
                <div style={{ position: 'absolute', top: -8, left: 0, right: 0, display: 'flex', justifyContent: 'space-between', zIndex: 2 }}>
                  <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#F3F4F6', marginLeft: -8, border: '1px solid #E5E7EB' }} />
                  <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#F3F4F6', marginRight: -8, border: '1px solid #E5E7EB' }} />
                </div>
              )}
              <div style={{ padding: '18px 20px', borderBottom: i < allLegs.length - 1 ? '1px dashed #E5E7EB' : 'none' }}>

                {/* League row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <svg viewBox="0 0 24 24" style={{ width: 13, height: 13, color: '#9CA3AF' }} fill="currentColor">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />
                    </svg>
                    <span style={{ color: '#6B7280', fontSize: 12 }}>Football Match</span>
                  </div>
                  {legData.kickoffAt && (
                    <span style={{ color: '#F5A623', fontSize: 11, fontWeight: 700 }}>
                      {(() => { try { const d = new Date(legData.kickoffAt!); return `${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')} ${d.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}`; } catch { return ''; } })()}
                    </span>
                  )}
                </div>

                {/* Matchup */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <div style={{ flex: 1, textAlign: 'right', fontSize: 13, fontWeight: 700, color: '#111827' }}>{home}</div>
                  <div style={{ margin: '0 14px', display: 'flex', gap: 8, alignItems: 'center' }}>
                    <TeamAvatar name={home} logoUrl={legData.homeLogo} size={30} />
                    <span style={{ color: '#9CA3AF', fontSize: 10, fontWeight: 800 }}>VS</span>
                    <TeamAvatar name={away} logoUrl={legData.awayLogo} size={30} />
                  </div>
                  <div style={{ flex: 1, textAlign: 'left', fontSize: 13, fontWeight: 700, color: '#111827' }}>{away}</div>
                </div>

                {/* Market / Status / Odds */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 14, color: '#111827', marginBottom: 4 }}>
                      {legData.market_name}. {legData.selection_name}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <span style={{ fontSize: 12, color: '#6B7280' }}>Status:</span>
                      {legWon && <span style={{ color: '#059669', fontSize: 12, fontWeight: 700 }}>✅ Win</span>}
                      {legLost && <span style={{ color: '#EF4444', fontSize: 12, fontWeight: 700 }}>❌ Loss</span>}
                      {!legWon && !legLost && legData.status === 'VOID' && <span style={{ color: '#6B7280', fontSize: 12, fontWeight: 700 }}>↩ Void</span>}
                      {!legWon && !legLost && legData.status === 'PENDING' && <span style={{ color: '#D97706', fontSize: 12, fontWeight: 700 }}>⏳ Pending</span>}
                    </div>
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 900, color: '#111827' }}>{legData.odds.toFixed(2)}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div style={{ padding: '16px 20px', borderTop: '1px dashed #E5E7EB', background: '#FAFAFA' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ color: '#6B7280', fontSize: 13 }}>Total Odds</span>
          <span style={{ fontWeight: 800, fontSize: 14, color: '#111827' }}>{slip.total_odds.toFixed(2)}</span>
        </div>
        {!isBooking && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ color: '#6B7280', fontSize: 13 }}>Stake</span>
              <span style={{ fontWeight: 800, fontSize: 14, color: '#111827' }}>{slip.stake.toFixed(2)} Br</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 12, borderTop: '1px solid #E5E7EB' }}>
              <span style={{ fontWeight: 800, fontSize: 14, color: '#111827' }}>Potential Payout</span>
              <span style={{ fontWeight: 900, fontSize: 18, color: slip.status === 'WON' ? '#059669' : '#D97706' }}>
                {slip.potential_payout.toFixed(2)} Br
              </span>
            </div>
          </>
        )}
        {isBooking && (
          <div style={{ marginTop: 8, padding: '10px 14px', background: '#EFF6FF', borderRadius: 10, border: '1px solid #BFDBFE', textAlign: 'center' }}>
            <p style={{ color: '#2563EB', fontSize: 13, fontWeight: 700, margin: 0 }}>
              🎟️ This is an admin booking code. Use it in the Betslip to place your bet!
            </p>
          </div>
        )}

        {/* Barcode decoration */}
        <div style={{ marginTop: 16, textAlign: 'center', opacity: 0.25 }}>
          <div style={{ display: 'inline-flex', height: 32, gap: 2 }}>
            {[...Array(28)].map((_, i) => (
              <div key={i} style={{ width: [2,1,3,1,2,1,2,3,1,2,1,3,1,2,2,1,3,1,2,1,2,3,1,2,1,2,3,1][i] || 1, background: '#374151', borderRadius: 1 }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Page ──────────────────────────────────────────── */
export default function CheckBetPage() {
  const [code, setCode] = useState('');
  const [slip, setSlip] = useState<BetSlip | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) { setError('Please enter a ticket code'); return; }
    setError('');
    setSlip(null);
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/v1/bets/check?code=${encodeURIComponent(trimmed)}`);
      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.error || 'Ticket not found. Please check the code.');
        return;
      }
      setSlip(data);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setCode('');
    setSlip(null);
    setError('');
    inputRef.current?.focus();
  };

  return (
    <div style={{ minHeight: '100vh', background: '#F3F4F6' }}>

      {/* Top bar */}
      <div style={{ background: '#fff', borderBottom: '1px solid #E5E7EB', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 4, textDecoration: 'none' }}>
          <svg viewBox="0 0 24 24" style={{ width: 18, height: 18, color: '#6B7280' }} fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </Link>
        <div>
          <h1 style={{ fontSize: 17, fontWeight: 900, color: '#111827', margin: 0 }}>Check Ticket</h1>
          <p style={{ fontSize: 11, color: '#9CA3AF', margin: 0 }}>Enter any MiraclBet ticket code</p>
        </div>
      </div>

      <div style={{ maxWidth: 520, margin: '0 auto', padding: '24px 16px' }}>

        {/* Hero Icon */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'linear-gradient(135deg, #059669, #047857)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', boxShadow: '0 8px 24px rgba(5,150,105,0.3)' }}>
            <svg viewBox="0 0 24 24" style={{ width: 32, height: 32, color: '#fff' }} fill="currentColor">
              <path d="M20 4H4c-1.11 0-2 .89-2 2v12c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z"/>
            </svg>
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 900, color: '#111827', margin: '0 0 4px' }}>Bet Ticket Checker</h2>
          <p style={{ fontSize: 13, color: '#6B7280', margin: 0 }}>Check the status of any bet ticket instantly — no login needed</p>
        </div>

        {/* Input Card */}
        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E5E7EB', padding: '20px 16px', marginBottom: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <form onSubmit={handleCheck}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#4B5563', marginBottom: 8, letterSpacing: 0.5 }}>
              TICKET CODE
            </label>
            <div style={{ display: 'flex', gap: 10 }}>
              <input
                ref={inputRef}
                type="text"
                value={code}
                onChange={e => { setCode(e.target.value.toUpperCase()); setError(''); setSlip(null); }}
                placeholder="e.g. M38DJ91"
                autoComplete="off"
                spellCheck={false}
                style={{
                  flex: 1, padding: '13px 14px',
                  background: '#F9FAFB', border: `2px solid ${error ? '#FECACA' : code ? '#A7F3D0' : '#E5E7EB'}`,
                  borderRadius: 10, fontSize: 18, fontWeight: 900, color: '#059669',
                  fontFamily: 'monospace', letterSpacing: 3, outline: 'none',
                  textTransform: 'uppercase', transition: 'border-color 0.15s'
                }}
              />
              {code && (
                <button type="button" onClick={handleClear}
                  style={{ padding: '13px 14px', background: '#F3F4F6', border: '2px solid #E5E7EB', borderRadius: 10, cursor: 'pointer', fontSize: 14, color: '#6B7280', fontWeight: 700 }}>
                  ✕
                </button>
              )}
            </div>

            {error && (
              <div style={{ marginTop: 10, padding: '10px 12px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, color: '#DC2626', fontSize: 13, fontWeight: 600 }}>
                ⚠ {error}
              </div>
            )}

            <button type="submit" disabled={loading || !code.trim()}
              style={{
                width: '100%', marginTop: 14, padding: '14px',
                background: loading || !code.trim() ? '#E5E7EB' : 'linear-gradient(135deg, #059669, #047857)',
                border: 'none', borderRadius: 12, color: loading || !code.trim() ? '#9CA3AF' : '#fff',
                fontSize: 15, fontWeight: 900, cursor: loading || !code.trim() ? 'not-allowed' : 'pointer',
                boxShadow: loading || !code.trim() ? 'none' : '0 6px 20px rgba(5,150,105,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'all 0.2s'
              }}>
              {loading ? (
                <>
                  <svg style={{ width: 18, height: 18, animation: 'spin 1s linear infinite' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                  </svg>
                  Checking...
                </>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" style={{ width: 18, height: 18 }} fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  Check Ticket
                </>
              )}
            </button>
          </form>
        </div>

        {/* Result */}
        {slip && (
          <div style={{ animation: 'fadeIn 0.3s ease' }}>
            <div style={{ textAlign: 'center', marginBottom: 14 }}>
              <span style={{ fontSize: 13, color: '#6B7280', fontWeight: 600 }}>
                ✅ Ticket found for code <strong style={{ color: '#059669', fontFamily: 'monospace', letterSpacing: 2 }}>{code}</strong>
              </span>
            </div>
            <TicketDisplay slip={slip} />
          </div>
        )}

        {/* Tips */}
        {!slip && !loading && (
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #E5E7EB', padding: '16px', marginTop: 4 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#4B5563', margin: '0 0 10px', letterSpacing: 0.5 }}>HOW TO USE</p>
            {[
              { icon: '🎟️', text: 'Enter your MiraclBet ticket code (starts with M)' },
              { icon: '🔍', text: 'Tap "Check Ticket" to view the full bet details' },
              { icon: '📊', text: 'See live match status, win/loss results and payout' },
              { icon: '🚫', text: 'No login required — anyone can check any code' },
            ].map((t, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
                <span style={{ fontSize: 16, flexShrink: 0 }}>{t.icon}</span>
                <span style={{ fontSize: 13, color: '#6B7280' }}>{t.text}</span>
              </div>
            ))}
          </div>
        )}

        <div style={{ height: 32 }} />
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}
