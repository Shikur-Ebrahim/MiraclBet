'use client';

import React, { useState, useEffect } from 'react';

interface BetSelection {
  fixtureId: string;
  matchName: string;
  marketName: string;
  selectionId: string;
  selectionName: string;
  odds: number;
}

interface BookedBet {
  code: string;
  selections: BetSelection[];
  totalOdds: number;
}

export default function BetslipPage() {
  const [mounted, setMounted] = useState(false);
  const [selections, setSelections] = useState<BetSelection[]>([]);
  const [booking, setBooking] = useState<BookedBet | null>(null);
  const [loadCode, setLoadCode] = useState('');
  const [loadError, setLoadError] = useState('');
  const [loadLoading, setLoadLoading] = useState(false);
  const [shareLoading, setShareLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

  const totalOdds = selections.reduce((acc, s) => acc * s.odds, 1);

  useEffect(() => {
    setMounted(true);
    const load = () => {
      const stored = localStorage.getItem('miraclbet_betslip');
      try { setSelections(stored ? JSON.parse(stored) : []); } catch { setSelections([]); }
    };
    load();
    window.addEventListener('miraclbet_betslip_change', load);
    return () => window.removeEventListener('miraclbet_betslip_change', load);
  }, []);

  const removeSelection = (selectionId: string) => {
    const updated = selections.filter(s => s.selectionId !== selectionId);
    localStorage.setItem('miraclbet_betslip', JSON.stringify(updated));
    setSelections(updated);
    window.dispatchEvent(new Event('miraclbet_betslip_change'));
  };

  const clearAll = () => {
    localStorage.removeItem('miraclbet_betslip');
    setSelections([]);
    setBooking(null);
    window.dispatchEvent(new Event('miraclbet_betslip_change'));
  };

  const shareBet = async () => {
    if (selections.length === 0) return;
    setShareLoading(true);
    try {
      const res = await fetch(`${API}/api/v1/betslips`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selections, total_odds: totalOdds }),
      });
      const data = await res.json();
      if (!res.ok || !data.code) throw new Error('Failed to generate code');
      setBooking({ code: data.code, selections, totalOdds });
    } catch {
      alert('Failed to generate bet code. Please try again.');
    } finally {
      setShareLoading(false);
    }
  };

  const loadBet = async () => {
    const code = loadCode.trim().toUpperCase();
    if (!code) return;
    setLoadLoading(true);
    setLoadError('');
    try {
      const res = await fetch(`${API}/api/v1/betslips/${code}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Bet code not found');
      // Load these selections into the betslip
      localStorage.setItem('miraclbet_betslip', JSON.stringify(data.selections));
      setSelections(data.selections);
      setBooking({ code: data.code, selections: data.selections, totalOdds: data.total_odds });
      window.dispatchEvent(new Event('miraclbet_betslip_change'));
      setLoadCode('');
    } catch (err: unknown) {
      setLoadError(err instanceof Error ? err.message : 'Invalid bet code');
    } finally {
      setLoadLoading(false);
    }
  };

  const copyCode = () => {
    if (booking?.code) {
      navigator.clipboard.writeText(booking.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!mounted) return null;

  return (
    <div style={{ background: '#0A0E1A', minHeight: '100vh', paddingBottom: 80 }}>
      {/* Header */}
      <div style={{ background: '#111827', padding: '16px 16px 0', borderBottom: '2px solid #19E66B33' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={() => window.history.back()} style={{ background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer', padding: 4 }}>
              <svg viewBox="0 0 24 24" style={{ width: 22, height: 22 }} fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M19 12H5M12 5l-7 7 7 7"/>
              </svg>
            </button>
            <h1 style={{ color: '#fff', fontWeight: 800, fontSize: 18, margin: 0 }}>Bet Slip</h1>
          </div>
          {selections.length > 0 && (
            <button onClick={clearAll} style={{ fontSize: 12, color: '#EF4444', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontWeight: 600 }}>
              Clear All
            </button>
          )}
        </div>

        {/* Tabs-like count */}
        <div style={{ display: 'flex', gap: 4, paddingBottom: 0 }}>
          <div style={{ padding: '6px 14px', borderRadius: '8px 8px 0 0', background: '#19E66B', color: '#072414', fontWeight: 800, fontSize: 13 }}>
            My Slip ({selections.length})
          </div>
        </div>
      </div>

      <div style={{ padding: 16, maxWidth: 480, margin: '0 auto' }}>

        {/* Load Bet Code section */}
        <div style={{ background: '#111827', borderRadius: 12, padding: 14, marginBottom: 16, border: '1px solid #1E293B' }}>
          <p style={{ color: '#9CA3AF', fontSize: 12, fontWeight: 600, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>Load a Bet Code</p>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              value={loadCode}
              onChange={e => setLoadCode(e.target.value.toUpperCase())}
              placeholder="e.g. M12AB34"
              maxLength={8}
              style={{ flex: 1, background: '#0A0E1A', border: '1px solid #1E293B', borderRadius: 8, padding: '10px 12px', color: '#fff', fontSize: 14, fontWeight: 700, letterSpacing: 2, outline: 'none' }}
              onKeyDown={e => e.key === 'Enter' && loadBet()}
            />
            <button
              onClick={loadBet}
              disabled={loadLoading || !loadCode.trim()}
              style={{ padding: '10px 16px', background: '#19E66B', color: '#072414', border: 'none', borderRadius: 8, fontWeight: 800, fontSize: 13, cursor: 'pointer', opacity: loadLoading || !loadCode.trim() ? 0.5 : 1 }}
            >
              {loadLoading ? '...' : 'Load'}
            </button>
          </div>
          {loadError && <p style={{ color: '#EF4444', fontSize: 12, marginTop: 6 }}>{loadError}</p>}
        </div>

        {/* Selections */}
        {selections.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 24px', background: '#111827', borderRadius: 16, border: '1px solid #1E293B' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🎯</div>
            <h2 style={{ color: '#fff', fontWeight: 700, fontSize: 18, marginBottom: 8 }}>Your slip is empty</h2>
            <p style={{ color: '#9CA3AF', fontSize: 14, marginBottom: 20 }}>Click any odds on the match list to add a selection</p>
            <button onClick={() => window.location.href = '/'} style={{ padding: '12px 24px', background: '#19E66B', color: '#072414', border: 'none', borderRadius: 10, fontWeight: 800, fontSize: 14, cursor: 'pointer' }}>
              Browse Matches
            </button>
          </div>
        ) : (
          <>
            {/* Selection cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
              {selections.map((sel, i) => (
                <div key={sel.selectionId} style={{ background: '#111827', borderRadius: 12, padding: 14, border: '1px solid #1E293B', position: 'relative' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1, paddingRight: 8 }}>
                      <p style={{ color: '#9CA3AF', fontSize: 11, fontWeight: 600, margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        {sel.marketName}
                      </p>
                      <p style={{ color: '#fff', fontWeight: 700, fontSize: 14, margin: '0 0 4px', lineHeight: 1.3 }}>
                        {sel.selectionName}
                      </p>
                      <p style={{ color: '#9CA3AF', fontSize: 12, margin: 0 }}>{sel.matchName}</p>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                      <button onClick={() => removeSelection(sel.selectionId)} style={{ background: 'rgba(239,68,68,0.1)', border: 'none', borderRadius: 6, color: '#EF4444', cursor: 'pointer', padding: '3px 7px', fontSize: 12, fontWeight: 700 }}>✕</button>
                      <span style={{ background: '#19E66B', color: '#072414', fontWeight: 900, fontSize: 16, borderRadius: 8, padding: '4px 10px' }}>
                        {sel.odds.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div style={{ background: '#111827', borderRadius: 12, padding: 16, marginBottom: 16, border: '1px solid #19E66B33' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#9CA3AF', fontSize: 14, fontWeight: 600 }}>Total Selections</span>
                <span style={{ color: '#fff', fontWeight: 800, fontSize: 14 }}>{selections.length}</span>
              </div>
              <div style={{ width: '100%', height: 1, background: '#1E293B', margin: '12px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#9CA3AF', fontSize: 14, fontWeight: 600 }}>Total Odds</span>
                <span style={{ color: '#19E66B', fontWeight: 900, fontSize: 22 }}>{totalOdds.toFixed(2)}</span>
              </div>
            </div>

            {/* Generated code */}
            {booking && (
              <div style={{ background: 'linear-gradient(135deg, #0D2219 0%, #092016 100%)', borderRadius: 16, padding: 20, marginBottom: 16, border: '2px solid #19E66B', textAlign: 'center' }}>
                <p style={{ color: '#9CA3AF', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2, margin: '0 0 8px' }}>Your Bet Code</p>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                  <span style={{ color: '#19E66B', fontSize: 36, fontWeight: 900, letterSpacing: 6, fontFamily: 'monospace' }}>{booking.code}</span>
                  <button onClick={copyCode} style={{ background: 'rgba(25,230,107,0.1)', border: '1px solid rgba(25,230,107,0.3)', borderRadius: 8, color: '#19E66B', cursor: 'pointer', padding: '6px 12px', fontSize: 12, fontWeight: 700 }}>
                    {copied ? '✓ Copied' : 'Copy'}
                  </button>
                </div>
                <p style={{ color: '#9CA3AF', fontSize: 12, margin: '12px 0 0' }}>Share this code with friends to load the same selections</p>
              </div>
            )}

            {/* Action buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {!booking && (
                <button
                  onClick={shareBet}
                  disabled={shareLoading}
                  style={{ width: '100%', padding: 16, background: '#1E293B', border: '1px solid #374151', borderRadius: 12, color: '#fff', fontWeight: 800, fontSize: 15, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: shareLoading ? 0.7 : 1 }}
                >
                  <svg viewBox="0 0 24 24" style={{ width: 18, height: 18 }} fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                    <path d="M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98"/>
                  </svg>
                  {shareLoading ? 'Generating code...' : 'Generate Bet Code'}
                </button>
              )}
              <button
                onClick={() => window.location.href = '/deposit'}
                style={{ width: '100%', padding: 16, background: '#19E66B', border: 'none', borderRadius: 12, color: '#072414', fontWeight: 900, fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
              >
                <svg viewBox="0 0 24 24" style={{ width: 20, height: 20 }} fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M12 5v14M5 12l7 7 7-7"/>
                </svg>
                Place Bet / Deposit
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
