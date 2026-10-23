'use client';

import React, { useState, useEffect } from 'react';

interface BetSelection {
  fixtureId: string;
  matchName: string;
  marketName: string;
  selectionId: string;
  selectionName: string;
  odds: number;
  homeLogo?: string;
  awayLogo?: string;
  kickoffAt?: string;
}

interface StoredUser {
  id: string;
  full_name: string;
  email: string;
  balance: number;
  role: string;
}

const API = process.env.NEXT_PUBLIC_API_URL || 'https://api.miraclbet.com:8443';

function TeamAvatar({ name, logoUrl, size = 30 }: { name: string; logoUrl?: string; size?: number }) {
  if (logoUrl) {
    return (
      <div style={{
        width: size, height: size, borderRadius: '50%',
        background: '#fff', padding: 2,
        border: '2px solid #E2E8F0',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        boxShadow: '0 2px 6px rgba(0,0,0,0.1)', overflow: 'hidden'
      }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logoUrl} alt={name} style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '50%' }} />
      </div>
    );
  }

  const words = name.trim().split(/\s+/);
  const initials = words.length >= 2 ? words[0][0] + words[words.length - 1][0] : name.slice(0, 2);
  const colors = ['#EF4444', '#3B82F6', '#F59E0B', '#10B981', '#8B5CF6', '#EC4899', '#06B6D4'];
  const idx = (name.charCodeAt(0) + (name.charCodeAt(1) || 0)) % colors.length;

  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: `linear-gradient(135deg, ${colors[idx]}, ${colors[(idx + 2) % colors.length]})`,
      border: '2px solid #E2E8F0',
      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      boxShadow: '0 2px 6px rgba(0,0,0,0.1)'
    }}>
      <span style={{ color: '#fff', fontWeight: 900, fontSize: size * 0.35 }}>
        {initials.toUpperCase()}
      </span>
    </div>
  );
}

export default function BetslipPage() {
  const [mounted, setMounted] = useState(false);
  const [selections, setSelections] = useState<BetSelection[]>([]);
  const [user, setUser] = useState<StoredUser | null>(null);
  const [stake, setStake] = useState('');
  const [placing, setPlacing] = useState(false);
  const [betResult, setBetResult] = useState<{ success: boolean; message: string; slipId?: string } | null>(null);
  const [loadCode, setLoadCode] = useState('');
  const [loadError, setLoadError] = useState('');
  const [loadLoading, setLoadLoading] = useState(false);
  const [shareLoading, setShareLoading] = useState(false);
  const [generatedCode, setGeneratedCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [autoWin, setAutoWin] = useState(false);
  const [loadedCode, setLoadedCode] = useState('');

  const totalOdds = selections.reduce((acc, s) => acc * s.odds, 1);
  const stakeNum = parseFloat(stake) || 0;
  const potentialPayout = stakeNum * totalOdds;

  const spinStyle = `@keyframes spin{to{transform:rotate(360deg)}}`;

  useEffect(() => {
    setMounted(true);
    const loadSlip = () => {
      const stored = localStorage.getItem('miraclbet_betslip');
      try { setSelections(stored ? JSON.parse(stored) : []); } catch { setSelections([]); }
    };
    loadSlip();
    window.addEventListener('miraclbet_betslip_change', loadSlip);
    const rawUser = localStorage.getItem('miraclbet_user');
    if (rawUser) { try { setUser(JSON.parse(rawUser)); } catch { /* ignore */ } }
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
    try { localStorage.removeItem('miraclbet_booking_code'); } catch { /* ignore */ }
    setSelections([]);
    setBetResult(null);
    setGeneratedCode('');
    setStake('');
    setAutoWin(false);
    setLoadedCode('');
    window.dispatchEvent(new Event('miraclbet_betslip_change'));
  };

  const MATCH_DURATION_MS = 105 * 60 * 1000;
  const hasStartedLeg = selections.some(s => {
    if (!s.kickoffAt) return false;
    const ko = new Date(s.kickoffAt).getTime();
    return !isNaN(ko) && Date.now() >= (ko + MATCH_DURATION_MS);
  });

  const placeBet = async () => {
    if (!user) { window.location.href = '/login?redirect=/betslip'; return; }
    if (!stake || stakeNum <= 0) { setBetResult({ success: false, message: 'Please enter a valid stake amount.' }); return; }
    if (stakeNum > user.balance) { setBetResult({ success: false, message: `Insufficient balance. Your balance is ETB ${user.balance.toFixed(2)}.` }); return; }
    if (hasStartedLeg) {
      setBetResult({ success: false, message: 'Cannot place bet: at least one game has already started.' });
      return;
    }
    setPlacing(true);
    setBetResult(null);
    try {
      const res = await fetch(`${API}/api/v1/bets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id, stake: stakeNum, total_odds: totalOdds, selections, booking_code: loadedCode }),
      });
      const data = await res.json();
      if (data.success) {
        const updatedUser = { ...user, balance: user.balance - stakeNum };
        localStorage.setItem('miraclbet_user', JSON.stringify(updatedUser));
        setUser(updatedUser);
        localStorage.removeItem('miraclbet_betslip');
        try { localStorage.removeItem('miraclbet_booking_code'); } catch { /* ignore */ }
        setSelections([]);
        setStake('');
        setAutoWin(false);
        setLoadedCode('');
        window.dispatchEvent(new Event('miraclbet_betslip_change'));
        setBetResult({ success: true, message: `Bet placed! Potential payout: ETB ${potentialPayout.toFixed(2)}`, slipId: data.slip_id });
      } else {
        setBetResult({ success: false, message: data.message || data.error || 'Failed to place bet.' });
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
      localStorage.setItem('miraclbet_booking_code', code);
      setSelections(data.selections);
      setAutoWin(data.auto_win === true);
      setLoadedCode(code);
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
    <div style={{ background: '#F8FAFC', minHeight: '100vh', paddingBottom: 90 }}>
      <style>{spinStyle}</style>

      {/* ── HEADER ── */}
      <div style={{ background: '#FFFFFF', padding: '0 16px', borderBottom: '1px solid #E2E8F0', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', position: 'sticky', top: '56px', zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 14, paddingBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={() => window.history.back()} style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', padding: 4, display: 'flex' }}>
              <svg viewBox="0 0 24 24" style={{ width: 22, height: 22 }} fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
            <div>
              <h1 style={{ color: '#0F172A', fontWeight: 900, fontSize: 18, margin: 0 }}>Bet Slip</h1>
              <p style={{ color: '#94A3B8', fontSize: 12, margin: 0, fontWeight: 500 }}>{selections.length} selection{selections.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
          {selections.length > 0 && (
            <button onClick={clearAll} style={{ fontSize: 12, color: '#DC2626', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontWeight: 700 }}>
              Clear All
            </button>
          )}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, paddingBottom: 0 }}>
          <div style={{ padding: '8px 16px', borderRadius: '10px 10px 0 0', background: '#0F172A', color: '#FFFFFF', fontWeight: 800, fontSize: 13 }}>
            My Slip ({selections.length})
          </div>
          <div
            onClick={() => window.location.href = '/bets'}
            style={{ padding: '8px 16px', borderRadius: '10px 10px 0 0', background: '#F1F5F9', color: '#64748B', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
          >
            My Bets
          </div>
        </div>
      </div>

      <div style={{ padding: 16, maxWidth: 480, margin: '0 auto' }}>

        {/* Balance bar */}
        {user && (
          <div style={{ background: '#FFFFFF', borderRadius: 14, padding: '12px 16px', marginBottom: 14, border: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 20 }}>💰</span>
              <span style={{ color: '#64748B', fontSize: 13, fontWeight: 600 }}>Your Balance</span>
            </div>
            <span style={{ color: '#059669', fontWeight: 900, fontSize: 18 }}>ETB {user.balance.toFixed(2)}</span>
          </div>
        )}

        {/* Load bet code */}
        <div style={{ background: '#FFFFFF', borderRadius: 14, padding: 16, marginBottom: 16, border: '1px solid #E2E8F0', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
          <p style={{ color: '#64748B', fontSize: 12, fontWeight: 700, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Load a Bet Code</p>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              value={loadCode}
              onChange={e => setLoadCode(e.target.value.toUpperCase())}
              placeholder="e.g. M12AB34"
              maxLength={8}
              style={{ flex: 1, background: '#F8FAFC', border: '1.5px solid #E2E8F0', borderRadius: 10, padding: '11px 14px', color: '#0F172A', fontSize: 14, fontWeight: 700, letterSpacing: 2, outline: 'none', boxSizing: 'border-box' }}
              onKeyDown={e => e.key === 'Enter' && loadBet()}
            />
            <button
              onClick={loadBet}
              disabled={loadLoading || !loadCode.trim()}
              style={{ padding: '11px 18px', background: loadLoading || !loadCode.trim() ? '#E2E8F0' : '#0F172A', color: loadLoading || !loadCode.trim() ? '#94A3B8' : '#FFFFFF', border: 'none', borderRadius: 10, fontWeight: 800, fontSize: 13, cursor: loadLoading || !loadCode.trim() ? 'not-allowed' : 'pointer' }}
            >
              {loadLoading ? '...' : 'Load'}
            </button>
          </div>
          {loadError && <p style={{ color: '#DC2626', fontSize: 12, marginTop: 6, fontWeight: 600 }}>{loadError}</p>}
        </div>

        {/* Success after bet */}
        {betResult?.success && (
          <div style={{ background: 'linear-gradient(135deg, #F0FDF4, #DCFCE7)', borderRadius: 16, padding: 22, marginBottom: 16, border: '2px solid #86EFAC', textAlign: 'center', boxShadow: '0 4px 16px rgba(16,185,129,0.12)' }}>
            <div style={{ fontSize: 44, marginBottom: 10 }}>🎉</div>
            <p style={{ color: '#059669', fontWeight: 900, fontSize: 17, margin: '0 0 6px' }}>Bet Placed Successfully!</p>
            <p style={{ color: '#64748B', fontSize: 13, margin: '0 0 16px' }}>{betResult.message}</p>
            <button
              onClick={() => window.location.href = '/bets'}
              style={{ padding: '11px 22px', background: '#059669', color: '#FFFFFF', border: 'none', borderRadius: 10, fontWeight: 800, fontSize: 13, cursor: 'pointer', boxShadow: '0 2px 10px rgba(5,150,105,0.3)' }}
            >
              View My Bets
            </button>
          </div>
        )}

        {/* Error */}
        {betResult && !betResult.success && (
          <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 12, padding: '12px 16px', marginBottom: 14, color: '#DC2626', fontWeight: 600, fontSize: 13 }}>
            ⚠️ {betResult.message}
          </div>
        )}

        {/* Empty state */}
        {selections.length === 0 && !betResult?.success ? (
          <div style={{ textAlign: 'center', padding: '52px 24px', background: '#FFFFFF', borderRadius: 20, border: '2px dashed #E2E8F0', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            <div style={{ fontSize: 52, marginBottom: 14 }}>🎯</div>
            <h2 style={{ color: '#0F172A', fontWeight: 800, fontSize: 18, marginBottom: 8 }}>Your slip is empty</h2>
            <p style={{ color: '#94A3B8', fontSize: 14, marginBottom: 22 }}>Click any odds on the match list to add a selection</p>
            <button onClick={() => window.location.href = '/'} style={{ padding: '13px 28px', background: '#0F172A', color: '#FFFFFF', border: 'none', borderRadius: 12, fontWeight: 800, fontSize: 14, cursor: 'pointer', boxShadow: '0 2px 10px rgba(15,23,42,0.2)' }}>
              Browse Matches
            </button>
          </div>
        ) : selections.length > 0 ? (
          <>
            {/* Selection cards — receipt style */}
            <div style={{ background: '#FFFFFF', borderRadius: 16, border: '1px solid #E2E8F0', overflow: 'hidden', marginBottom: 16, boxShadow: '0 2px 10px rgba(0,0,0,0.06)' }}>
              {/* Receipt header */}
              <div style={{ background: 'linear-gradient(135deg, #0F172A, #1E293B)', padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#FFFFFF', fontWeight: 800, fontSize: 14 }}>📋 Your Selections</span>
                <span style={{ background: '#10B981', color: '#FFFFFF', fontSize: 11, fontWeight: 800, padding: '3px 10px', borderRadius: 20 }}>{selections.length} Pick{selections.length !== 1 ? 's' : ''}</span>
              </div>

              {selections.map((sel, i) => {
                const parts = sel.matchName.split(' vs ');
                const home = parts[0]?.trim() || sel.matchName;
                const away = parts[1]?.trim() || '';

                return (
                  <div key={sel.selectionId} style={{ position: 'relative' }}>
                    {/* Perforated divider */}
                    {i > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', padding: '0 0' }}>
                        <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#F8FAFC', border: '1px solid #E2E8F0', marginLeft: -6, flexShrink: 0 }} />
                        <div style={{ flex: 1, borderTop: '2px dashed #E2E8F0' }} />
                        <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#F8FAFC', border: '1px solid #E2E8F0', marginRight: -6, flexShrink: 0 }} />
                      </div>
                    )}

                    <div style={{ padding: '16px 20px' }}>
                      {/* Top: date & remove */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <div>
                          <span style={{ color: '#94A3B8', fontSize: 11, fontWeight: 600 }}>Football Match</span>
                          {sel.kickoffAt && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 1 }}>
                              <span style={{ color: '#F59E0B', fontSize: 10, fontWeight: 700 }}>
                                {(() => { try { const d = new Date(sel.kickoffAt); return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`; } catch { return ''; } })()}
                              </span>
                              {(() => {
                                try {
                                  const ko = new Date(sel.kickoffAt).getTime();
                                  if (!isNaN(ko) && Date.now() >= (ko + MATCH_DURATION_MS)) {
                                    return <span style={{ background: '#FEE2E2', color: '#DC2626', border: '1px solid #FECACA', borderRadius: 4, padding: '1px 5px', fontSize: 9, fontWeight: 800 }}>⚠️ Game Started</span>;
                                  }
                                } catch { /* ignore */ }
                                return null;
                              })()}
                            </div>
                          )}
                        </div>
                        <button onClick={() => removeSelection(sel.selectionId)} style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 7, color: '#DC2626', cursor: 'pointer', padding: '4px 10px', fontSize: 11, fontWeight: 800 }}>✕ Remove</button>
                      </div>

                      {/* Teams */}
                      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: 12, gap: 10 }}>
                        <div style={{ flex: 1, textAlign: 'right', color: '#0F172A', fontSize: 13, fontWeight: 700 }}>{home}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <TeamAvatar name={home} logoUrl={sel.homeLogo} />
                          <span style={{ color: '#F59E0B', fontSize: 11, fontWeight: 900, padding: '2px 6px', background: '#FFFBEB', borderRadius: 6, border: '1px solid #FDE68A' }}>VS</span>
                          <TeamAvatar name={away} logoUrl={sel.awayLogo} />
                        </div>
                        <div style={{ flex: 1, textAlign: 'left', color: '#0F172A', fontSize: 13, fontWeight: 700 }}>{away}</div>
                      </div>

                      {/* Selection & odds */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#F8FAFC', borderRadius: 10, padding: '10px 14px', border: '1px solid #E2E8F0' }}>
                        <div>
                          <div style={{ color: '#94A3B8', fontSize: 11, fontWeight: 600, marginBottom: 2 }}>{sel.marketName}</div>
                          <div style={{ color: '#0F172A', fontWeight: 800, fontSize: 14 }}>{sel.selectionName}</div>
                        </div>
                        <div style={{ background: '#0F172A', color: '#10B981', fontWeight: 900, fontSize: 20, padding: '6px 14px', borderRadius: 10, fontVariantNumeric: 'tabular-nums' }}>
                          {sel.odds.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Totals summary */}
            <div style={{ background: '#FFFFFF', borderRadius: 14, padding: 16, marginBottom: 16, border: '1px solid #E2E8F0', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ color: '#64748B', fontSize: 13, fontWeight: 600 }}>Selections</span>
                <span style={{ color: '#0F172A', fontWeight: 800 }}>{selections.length}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: stakeNum > 0 ? 10 : 0 }}>
                <span style={{ color: '#64748B', fontSize: 13, fontWeight: 600 }}>Total Odds</span>
                <span style={{ color: '#059669', fontWeight: 900, fontSize: 22 }}>{totalOdds.toFixed(2)}</span>
              </div>
              {stakeNum > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 10, borderTop: '1px solid #E2E8F0' }}>
                  <span style={{ color: '#64748B', fontSize: 13, fontWeight: 600 }}>Potential Payout</span>
                  <span style={{ color: '#D97706', fontWeight: 900, fontSize: 18 }}>ETB {potentialPayout.toFixed(2)}</span>
                </div>
              )}
            </div>

            {/* Stake input */}
            <div style={{ background: '#FFFFFF', borderRadius: 14, padding: 16, marginBottom: 14, border: '1px solid #E2E8F0', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
              <p style={{ color: '#64748B', fontSize: 12, fontWeight: 700, margin: '0 0 12px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Enter Stake (ETB)</p>
              {/* Quick stake */}
              <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
                {[10, 20, 50, 100, 200, 500].map(q => (
                  <button
                    key={q}
                    onClick={() => setStake(String(q))}
                    style={{
                      flex: 1, padding: '7px 0',
                      background: stake === String(q) ? '#0F172A' : '#F1F5F9',
                      color: stake === String(q) ? '#FFFFFF' : '#64748B',
                      border: `1px solid ${stake === String(q) ? '#0F172A' : '#E2E8F0'}`,
                      borderRadius: 8, fontWeight: 700, fontSize: 12, cursor: 'pointer'
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
                style={{ width: '100%', background: '#F8FAFC', border: '1.5px solid #E2E8F0', borderRadius: 10, padding: '13px 16px', color: '#0F172A', fontSize: 18, fontWeight: 800, outline: 'none', boxSizing: 'border-box' }}
              />
            </div>

            {/* Expired / already won warning */}
            {hasStartedLeg && (
              <div style={{ padding: '12px 14px', background: '#FEF2F2', border: '1.5px solid #FECACA', borderRadius: 12, marginBottom: 14, color: '#DC2626', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>⚠️</span>
                <span>At least one game has already started. This booking code has expired and cannot be placed.</span>
              </div>
            )}

            {/* Place bet button */}
            {user ? (
              <button
                onClick={placeBet}
                disabled={placing || !stake || stakeNum <= 0 || hasStartedLeg}
                style={{
                  width: '100%', padding: 17, border: 'none', borderRadius: 14, fontWeight: 900, fontSize: 16,
                  cursor: placing || !stake || hasStartedLeg ? 'not-allowed' : 'pointer',
                  background: placing || !stake || hasStartedLeg ? '#E2E8F0' : 'linear-gradient(135deg, #10B981, #059669)',
                  color: placing || !stake || hasStartedLeg ? '#94A3B8' : '#FFFFFF',
                  marginBottom: 12,
                  boxShadow: !placing && stake && !hasStartedLeg ? '0 4px 20px rgba(16,185,129,0.35)' : 'none',
                }}
              >
                {placing ? (
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    <div style={{ width: 18, height: 18, border: '2.5px solid rgba(255,255,255,0.3)', borderTop: '2.5px solid #fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                    Placing Bet...
                  </span>
                ) : hasStartedLeg ? 'Ticket Expired (Game Already Started)' : stakeNum > 0 ? `Place Bet — ETB ${stakeNum.toFixed(2)}` : 'Place Bet'}
              </button>
            ) : (
              <button
                onClick={() => window.location.href = '/login?redirect=/betslip'}
                style={{ width: '100%', padding: 17, background: 'linear-gradient(135deg, #10B981, #059669)', border: 'none', borderRadius: 14, color: '#fff', fontWeight: 900, fontSize: 16, cursor: 'pointer', marginBottom: 12, boxShadow: '0 4px 20px rgba(16,185,129,0.35)' }}
              >
                🔐 Login to Place Bet
              </button>
            )}

            {/* Share code */}
            {!generatedCode ? (
              <button
                onClick={generateCode}
                disabled={shareLoading}
                style={{ width: '100%', padding: 14, background: '#FFFFFF', border: '1.5px solid #E2E8F0', borderRadius: 14, color: '#64748B', fontWeight: 700, fontSize: 14, cursor: 'pointer', opacity: shareLoading ? 0.6 : 1, boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
              >
                {shareLoading ? 'Generating...' : '🔗 Generate Share Code'}
              </button>
            ) : (
              <div style={{ background: 'linear-gradient(135deg, #F0FDF4, #DCFCE7)', borderRadius: 14, padding: 18, border: '1px solid #86EFAC', textAlign: 'center', boxShadow: '0 2px 10px rgba(16,185,129,0.1)' }}>
                <p style={{ color: '#64748B', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2, margin: '0 0 10px' }}>Share Code</p>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
                  <span style={{ color: '#059669', fontSize: 30, fontWeight: 900, letterSpacing: 6, fontFamily: 'monospace' }}>{generatedCode}</span>
                  <button onClick={copyCode} style={{ background: '#FFFFFF', border: '1.5px solid #86EFAC', borderRadius: 10, color: '#059669', cursor: 'pointer', padding: '8px 14px', fontSize: 12, fontWeight: 800, boxShadow: '0 1px 4px rgba(16,185,129,0.1)' }}>
                    {copied ? '✓ Copied!' : 'Copy'}
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
