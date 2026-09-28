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

interface StoredUser {
  id: string;
  full_name: string;
  email: string;
  balance: number;
  role: string;
}

const API = process.env.NEXT_PUBLIC_API_URL || 'https://api.miraclbet.com:8443';

export default function BetslipPage() {
  const [mounted, setMounted] = useState(false);
  const [selections, setSelections] = useState<BetSelection[]>([]);
  const [user, setUser] = useState<StoredUser | null>(null);
  const [stake, setStake] = useState('');
  const [placing, setPlacing] = useState(false);
  const [betResult, setBetResult] = useState<{ success: boolean; message: string; slipId?: string } | null>(null);
  // Bet code sharing
  const [loadCode, setLoadCode] = useState('');
  const [loadError, setLoadError] = useState('');
  const [loadLoading, setLoadLoading] = useState(false);
  const [shareLoading, setShareLoading] = useState(false);
  const [generatedCode, setGeneratedCode] = useState('');
  const [copied, setCopied] = useState(false);

  const totalOdds = selections.reduce((acc, s) => acc * s.odds, 1);
  const stakeNum = parseFloat(stake) || 0;
  const potentialPayout = stakeNum * totalOdds;

  useEffect(() => {
    setMounted(true);
    // Load betslip
    const loadSlip = () => {
      const stored = localStorage.getItem('miraclbet_betslip');
      try { setSelections(stored ? JSON.parse(stored) : []); } catch { setSelections([]); }
    };
    loadSlip();
    window.addEventListener('miraclbet_betslip_change', loadSlip);
    // Load user
    const rawUser = localStorage.getItem('miraclbet_user');
    if (rawUser) { try { setUser(JSON.parse(rawUser)); } catch {} }
    return () => window.removeEventListener('miraclbet_betslip_change', loadSlip);
  }, []);

  const removeSelection = (selectionId: string) => {
    const updated = selections.filter(s => s.selectionId !== selectionId);
    localStorage.setItem('miraclbet_betslip', JSON.stringify(updated));
    setSelections(updated);
    setBetResult(null);
    window.dispatchEvent(new Event('miraclbet_betslip_change'));
  };

  const clearAll = () => {
    localStorage.removeItem('miraclbet_betslip');
    setSelections([]);
    setBetResult(null);
    setGeneratedCode('');
    setStake('');
    window.dispatchEvent(new Event('miraclbet_betslip_change'));
  };

  const placeBet = async () => {
    if (!user) {
      window.location.href = '/login?redirect=/betslip';
      return;
    }
    if (!stake || stakeNum <= 0) {
      setBetResult({ success: false, message: 'Please enter a valid stake amount.' });
      return;
    }
    if (stakeNum > user.balance) {
      setBetResult({ success: false, message: `Insufficient balance. Your balance is ETB ${user.balance.toFixed(2)}.` });
      return;
    }

    setPlacing(true);
    setBetResult(null);
    try {
      const res = await fetch(`${API}/api/v1/bets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          stake: stakeNum,
          total_odds: totalOdds,
          selections,
        }),
      });
      const data = await res.json();
      if (data.success) {
        // Update balance in localStorage
        const newBalance = user.balance - stakeNum;
        const updatedUser = { ...user, balance: newBalance };
        localStorage.setItem('miraclbet_user', JSON.stringify(updatedUser));
        setUser(updatedUser);
        // Clear betslip
        localStorage.removeItem('miraclbet_betslip');
        setSelections([]);
        setStake('');
        window.dispatchEvent(new Event('miraclbet_betslip_change'));
        setBetResult({ success: true, message: `Bet placed! Potential payout: ETB ${potentialPayout.toFixed(2)}`, slipId: data.slip_id });
      } else {
        setBetResult({ success: false, message: data.message || 'Failed to place bet.' });
      }
    } catch {
      setBetResult({ success: false, message: 'Network error. Please try again.' });
    } finally {
      setPlacing(false);
    }
  };

  const generateCode = async () => {
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
      setGeneratedCode(data.code);
    } catch {
      setBetResult({ success: false, message: 'Failed to generate bet code. Please try again.' });
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
      localStorage.setItem('miraclbet_betslip', JSON.stringify(data.selections));
      setSelections(data.selections);
      window.dispatchEvent(new Event('miraclbet_betslip_change'));
      setLoadCode('');
      setBetResult(null);
      setGeneratedCode('');
    } catch (err: unknown) {
      setLoadError(err instanceof Error ? err.message : 'Invalid bet code');
    } finally {
      setLoadLoading(false);
    }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(generatedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!mounted) return null;

  return (
    <div style={{ background: '#0A0E1A', minHeight: '100vh', paddingBottom: 90 }}>
      {/* Header */}
      <div style={{ background: '#111827', padding: '16px 16px 0', borderBottom: '2px solid #19E66B33' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={() => window.history.back()} style={{ background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer', padding: 4 }}>
              <svg viewBox="0 0 24 24" style={{ width: 22, height: 22 }} fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M19 12H5M12 5l-7 7 7-7" />
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
        <div style={{ display: 'flex', gap: 4 }}>
          <div style={{ padding: '6px 14px', borderRadius: '8px 8px 0 0', background: '#19E66B', color: '#072414', fontWeight: 800, fontSize: 13 }}>
            My Slip ({selections.length})
          </div>
          <div
            onClick={() => window.location.href = '/bets'}
            style={{ padding: '6px 14px', borderRadius: '8px 8px 0 0', background: '#1E293B', color: '#9CA3AF', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
          >
            My Bets
          </div>
        </div>
      </div>

      <div style={{ padding: 16, maxWidth: 480, margin: '0 auto' }}>

        {/* User balance bar */}
        {user && (
          <div style={{ background: '#111827', borderRadius: 10, padding: '10px 14px', marginBottom: 12, border: '1px solid #1E293B', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#9CA3AF', fontSize: 13 }}>💰 Balance</span>
            <span style={{ color: '#19E66B', fontWeight: 900, fontSize: 16 }}>ETB {user.balance.toFixed(2)}</span>
          </div>
        )}

        {/* Load Bet Code */}
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

        {/* Success after bet placed */}
        {betResult?.success && (
          <div style={{ background: 'linear-gradient(135deg, #0D2219, #092016)', borderRadius: 16, padding: 20, marginBottom: 16, border: '2px solid #19E66B', textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>🎉</div>
            <p style={{ color: '#19E66B', fontWeight: 900, fontSize: 16, margin: '0 0 6px' }}>Bet Placed Successfully!</p>
            <p style={{ color: '#9CA3AF', fontSize: 13, margin: 0 }}>{betResult.message}</p>
            <button
              onClick={() => window.location.href = '/bets'}
              style={{ marginTop: 14, padding: '10px 20px', background: '#19E66B', color: '#072414', border: 'none', borderRadius: 10, fontWeight: 800, fontSize: 13, cursor: 'pointer' }}
            >
              View My Bets
            </button>
          </div>
        )}

        {/* Error message */}
        {betResult && !betResult.success && (
          <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '12px 14px', marginBottom: 12, color: '#EF4444', fontWeight: 600, fontSize: 13 }}>
            ⚠️ {betResult.message}
          </div>
        )}

        {/* Empty state */}
        {selections.length === 0 && !betResult?.success ? (
          <div style={{ textAlign: 'center', padding: '48px 24px', background: '#111827', borderRadius: 16, border: '1px solid #1E293B' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🎯</div>
            <h2 style={{ color: '#fff', fontWeight: 700, fontSize: 18, marginBottom: 8 }}>Your slip is empty</h2>
            <p style={{ color: '#9CA3AF', fontSize: 14, marginBottom: 20 }}>Click any odds on the match list to add a selection</p>
            <button onClick={() => window.location.href = '/'} style={{ padding: '12px 24px', background: '#19E66B', color: '#072414', border: 'none', borderRadius: 10, fontWeight: 800, fontSize: 14, cursor: 'pointer' }}>
              Browse Matches
            </button>
          </div>
        ) : selections.length > 0 ? (
          <>
            {/* Receipt Style Selection Cards */}
            <div style={{ 
              background: '#0F1723', borderRadius: 12, border: '1px solid #1E293B', 
              boxShadow: '0 4px 6px rgba(0,0,0,0.1)', overflow: 'hidden', marginBottom: 16 
            }}>
              {selections.map((sel, i) => {
                const parts = sel.matchName.split(' vs ');
                const home = parts[0]?.trim() || sel.matchName;
                const away = parts[1]?.trim() || '';

                return (
                  <div key={sel.selectionId} style={{ position: 'relative' }}>
                    {/* Cutout notches */}
                    {i > 0 && (
                      <div style={{ position: 'absolute', top: -8, left: 0, right: 0, display: 'flex', justifyContent: 'space-between', zIndex: 2 }}>
                        <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#0A0E1A', marginLeft: -8, borderRight: '1px solid #1E293B' }} />
                        <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#0A0E1A', marginRight: -8, borderLeft: '1px solid #1E293B' }} />
                      </div>
                    )}
                    
                    <div style={{ padding: '16px 20px', borderBottom: i < selections.length - 1 ? '1px dashed #374151' : 'none' }}>
                      
                      {/* Top: Sport & Delete */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <svg viewBox="0 0 24 24" style={{ width: 14, height: 14, color: '#9CA3AF' }} fill="currentColor">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm0-14c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6z"/>
                          </svg>
                          <span style={{ color: '#9CA3AF', fontSize: 11, fontWeight: 600 }}>Football Match</span>
                        </div>
                        <button onClick={() => removeSelection(sel.selectionId)} style={{ background: 'rgba(239,68,68,0.1)', border: 'none', borderRadius: 6, color: '#EF4444', cursor: 'pointer', padding: '4px 10px', fontSize: 11, fontWeight: 800 }}>✕ Remove</button>
                      </div>

                      {/* Middle: Teams */}
                      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: 12, gap: 12 }}>
                        <div style={{ flex: 1, textAlign: 'right', color: '#fff', fontSize: 13, fontWeight: 700 }}>{home}</div>
                        <span style={{ color: '#F5A623', fontSize: 11, fontWeight: 900 }}>VS</span>
                        <div style={{ flex: 1, textAlign: 'left', color: '#fff', fontSize: 13, fontWeight: 700 }}>{away}</div>
                      </div>

                      {/* Bottom: Selection & Odds */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                        <div>
                          <div style={{ color: '#9CA3AF', fontSize: 11, fontWeight: 600, marginBottom: 2 }}>{sel.marketName}</div>
                          <div style={{ color: '#fff', fontWeight: 800, fontSize: 14 }}>{sel.selectionName}</div>
                        </div>
                        <div style={{ color: '#19E66B', fontWeight: 900, fontSize: 18 }}>
                          {sel.odds.toFixed(2)}
                        </div>
                      </div>

                    </div>
                  </div>
                );
              })}
            </div>

            {/* Totals */}
            <div style={{ background: '#111827', borderRadius: 12, padding: 16, marginBottom: 16, border: '1px solid #19E66B33' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ color: '#9CA3AF', fontSize: 13, fontWeight: 600 }}>Selections</span>
                <span style={{ color: '#fff', fontWeight: 800 }}>{selections.length}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ color: '#9CA3AF', fontSize: 13, fontWeight: 600 }}>Total Odds</span>
                <span style={{ color: '#19E66B', fontWeight: 900, fontSize: 20 }}>{totalOdds.toFixed(2)}</span>
              </div>
              {stakeNum > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 10, borderTop: '1px solid #1E293B' }}>
                  <span style={{ color: '#9CA3AF', fontSize: 13, fontWeight: 600 }}>Potential Payout</span>
                  <span style={{ color: '#F5A623', fontWeight: 900, fontSize: 18 }}>ETB {potentialPayout.toFixed(2)}</span>
                </div>
              )}
            </div>

            {/* Stake Input */}
            <div style={{ background: '#111827', borderRadius: 12, padding: 16, marginBottom: 12, border: '1px solid #1E293B' }}>
              <p style={{ color: '#9CA3AF', fontSize: 12, fontWeight: 600, margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: 1 }}>Enter Stake (ETB)</p>
              {/* Quick stake buttons */}
              <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                {[10, 20, 50, 100, 200, 500].map(q => (
                  <button
                    key={q}
                    onClick={() => setStake(String(q))}
                    style={{
                      flex: 1, padding: '6px 0', background: stake === String(q) ? '#19E66B' : '#1E293B',
                      color: stake === String(q) ? '#072414' : '#9CA3AF',
                      border: 'none', borderRadius: 6, fontWeight: 700, fontSize: 12, cursor: 'pointer'
                    }}
                  >
                    {q}
                  </button>
                ))}
              </div>
              <input
                type="number"
                value={stake}
                onChange={e => { setStake(e.target.value); setBetResult(null); }}
                placeholder="Enter amount..."
                min={1}
                style={{ width: '100%', background: '#0A0E1A', border: '1px solid #1E293B', borderRadius: 8, padding: '12px 14px', color: '#fff', fontSize: 16, fontWeight: 700, outline: 'none', boxSizing: 'border-box' }}
              />
            </div>

            {/* Place Bet Button */}
            {user ? (
              <button
                onClick={placeBet}
                disabled={placing || !stake || stakeNum <= 0}
                style={{
                  width: '100%', padding: 16, border: 'none', borderRadius: 12, fontWeight: 900, fontSize: 16, cursor: placing || !stake ? 'not-allowed' : 'pointer',
                  background: placing || !stake ? '#374151' : 'linear-gradient(135deg, #19E66B, #0D8A3C)',
                  color: placing || !stake ? '#9CA3AF' : '#fff', letterSpacing: 0.5, marginBottom: 10,
                  boxShadow: !placing && stake ? '0 4px 20px rgba(25,230,107,0.3)' : 'none',
                  transition: 'all 0.2s'
                }}
              >
                {placing ? '⏳ Placing Bet...' : stakeNum > 0 ? `Place Bet — ETB ${stakeNum.toFixed(2)}` : 'Place Bet'}
              </button>
            ) : (
              <button
                onClick={() => window.location.href = '/login?redirect=/betslip'}
                style={{ width: '100%', padding: 16, background: 'linear-gradient(135deg, #19E66B, #0D8A3C)', border: 'none', borderRadius: 12, color: '#fff', fontWeight: 900, fontSize: 16, cursor: 'pointer', marginBottom: 10, boxShadow: '0 4px 20px rgba(25,230,107,0.3)' }}
              >
                🔐 Login to Place Bet
              </button>
            )}

            {/* Generate Code Button */}
            {!generatedCode ? (
              <button
                onClick={generateCode}
                disabled={shareLoading}
                style={{ width: '100%', padding: 13, background: '#1E293B', border: '1px solid #374151', borderRadius: 12, color: '#9CA3AF', fontWeight: 700, fontSize: 14, cursor: 'pointer', opacity: shareLoading ? 0.6 : 1 }}
              >
                {shareLoading ? 'Generating...' : '🔗 Generate Share Code'}
              </button>
            ) : (
              <div style={{ background: 'linear-gradient(135deg, #0D2219, #092016)', borderRadius: 12, padding: 16, border: '1px solid #19E66B55', textAlign: 'center' }}>
                <p style={{ color: '#9CA3AF', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2, margin: '0 0 8px' }}>Share Code</p>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                  <span style={{ color: '#19E66B', fontSize: 28, fontWeight: 900, letterSpacing: 6, fontFamily: 'monospace' }}>{generatedCode}</span>
                  <button onClick={copyCode} style={{ background: 'rgba(25,230,107,0.1)', border: '1px solid rgba(25,230,107,0.3)', borderRadius: 8, color: '#19E66B', cursor: 'pointer', padding: '6px 12px', fontSize: 12, fontWeight: 700 }}>
                    {copied ? '✓ Copied' : 'Copy'}
                  </button>
                </div>
              </div>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
}
