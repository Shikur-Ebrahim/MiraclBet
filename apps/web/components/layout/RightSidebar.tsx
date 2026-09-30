'use client';

import React, { useState, useEffect, useCallback } from 'react';
import BetslipPage from '@/app/betslip/page';

type RightTab = 'betslip' | 'check' | 'deposit';

type BetslipItem = {
  fixtureId?: string;
  matchName: string;
  marketName: string;
  selectionName: string;
  odds: number;
  homeLogo?: string;
  awayLogo?: string;
  kickoffAt?: string;
};

type CheckResult = {
  status: string;
  stake?: number;
  total_odds?: number;
  potential_payout?: number;
  created_at?: string;
  selections?: { matchName?: string; selectionName?: string; odds?: number }[];
};

const API = process.env.NEXT_PUBLIC_API_URL || 'https://api.miraclbet.com:8443';

/* ─── Tab Button ─────────────────────────────────────────── */
function TabBtn({ label, icon, active, onClick, badge }: {
  label: string; icon: React.ReactNode; active: boolean; onClick: () => void; badge?: number;
}) {
  return (
    <button onClick={onClick}
      className="flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-bold transition-all relative"
      style={{ color: active ? '#19E66B' : '#6B7280', borderBottom: active ? '2px solid #19E66B' : '2px solid transparent' }}>
      {icon}
      {label}
      {badge && badge > 0 ? (
        <span className="absolute top-1.5 right-3 min-w-[16px] h-4 rounded-full flex items-center justify-center text-[8px] font-black bg-red-500 text-white px-1">{badge}</span>
      ) : null}
    </button>
  );
}

/* ─── Status badge ───────────────────────────────────────── */
function StatusBadge({ status }: { status: string }) {
  const cfg: Record<string, { bg: string; color: string }> = {
    WON:     { bg: '#F0FDF4', color: '#059669' },
    LOST:    { bg: '#FEF2F2', color: '#DC2626' },
    PENDING: { bg: '#FFFBEB', color: '#D97706' },
  };
  const c = cfg[status?.toUpperCase()] || { bg: '#F9FAFB', color: '#6B7280' };
  return (
    <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: c.bg, color: c.color }}>
      {status}
    </span>
  );
}

export function RightSidebar() {
  const [tab, setTab] = useState<RightTab>('betslip');
  const [betslip, setBetslip] = useState<BetslipItem[]>([]);
  const [stake, setStake] = useState('');
  const [placing, setPlacing] = useState(false);
  const [placedMsg, setPlacedMsg] = useState('');
  const [placeError, setPlaceError] = useState('');

  // Check tab
  const [ticketCode, setTicketCode] = useState('');
  const [checking, setChecking] = useState(false);
  const [checkResult, setCheckResult] = useState<CheckResult | null>(null);
  const [checkError, setCheckError] = useState('');

  // Deposit tab
  const [depositAmount, setDepositAmount] = useState('');
  const [depositMethod, setDepositMethod] = useState('telebirr');
  const [depositing, setDepositing] = useState(false);
  const [depositMsg, setDepositMsg] = useState('');
  const [depositError, setDepositError] = useState('');

  const loadBetslip = useCallback(() => {
    try {
      const stored = localStorage.getItem('miraclbet_betslip');
      setBetslip(stored ? JSON.parse(stored) : []);
    } catch { setBetslip([]); }
  }, []);

  useEffect(() => {
    loadBetslip();
    window.addEventListener('miraclbet_betslip_change', loadBetslip);
    window.addEventListener('storage', loadBetslip);
    return () => {
      window.removeEventListener('miraclbet_betslip_change', loadBetslip);
      window.removeEventListener('storage', loadBetslip);
    };
  }, [loadBetslip]);

  const totalOdds = betslip.reduce((acc, b) => acc * b.odds, 1);
  const payout = stake && parseFloat(stake) > 0 ? (parseFloat(stake) * totalOdds).toFixed(2) : '0.00';

  const removeBet = (idx: number) => {
    const next = betslip.filter((_, i) => i !== idx);
    setBetslip(next);
    localStorage.setItem('miraclbet_betslip', JSON.stringify(next));
    window.dispatchEvent(new Event('miraclbet_betslip_change'));
  };

  const clearAll = useCallback(() => {
    setBetslip([]);
    localStorage.setItem('miraclbet_betslip', JSON.stringify([]));
    window.dispatchEvent(new Event('miraclbet_betslip_change'));
  }, []);

  const placeBet = async () => {
    setPlacedMsg(''); setPlaceError('');
    const user = JSON.parse(localStorage.getItem('miraclbet_user') || 'null');
    if (!user) { setPlaceError('Please log in to place bets'); return; }
    const stakeNum = parseFloat(stake);
    if (!stakeNum || stakeNum < 1) { setPlaceError('Enter a valid stake (min 1 Br)'); return; }

    // Frontend kickoff guard — block before even hitting the server
    const now = Date.now();
    for (const b of betslip) {
      if (b.kickoffAt) {
        const ko = new Date(b.kickoffAt).getTime();
        if (now >= ko) {
          setPlaceError(`"${b.matchName}" has already started. Remove it to continue.`);
          return;
        }
      }
    }

    setPlacing(true);
    try {
      const res = await fetch(`${API}/api/v1/bets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id, stake: stakeNum, total_odds: totalOdds,
          selections: betslip.map(b => ({
            fixtureId:     b.fixtureId,
            matchName:     b.matchName,
            marketName:    b.marketName,
            selectionName: b.selectionName,
            odds:          b.odds,
            homeLogo:      b.homeLogo,
            awayLogo:      b.awayLogo,
            kickoffAt:     b.kickoffAt,  // ← now sent to backend so server can double-check
          })),
        }),
      });
      if (!res.ok) {
        const txt = await res.text();
        try { setPlaceError(JSON.parse(txt).message || 'Failed to place bet'); } catch { setPlaceError(txt || 'Failed'); }
        return;
      }
      setPlacedMsg('🎉 Bet placed successfully!');
      clearAll(); setStake('');
      setTimeout(() => setPlacedMsg(''), 4000);
    } catch { setPlaceError('Network error. Try again.'); }
    finally { setPlacing(false); }
  };

  const checkTicket = async () => {
    if (!ticketCode.trim()) return;
    setChecking(true); setCheckError(''); setCheckResult(null);
    try {
      const code = ticketCode.trim().toUpperCase().replace(/^TICKET-/, '');
      const res = await fetch(`${API}/api/v1/bets/check?code=TICKET-${code}`);
      if (!res.ok) { setCheckError('Ticket not found. Check the code and try again.'); return; }
      setCheckResult(await res.json());
    } catch { setCheckError('Network error. Try again.'); }
    finally { setChecking(false); }
  };

  const submitDeposit = async () => {
    setDepositMsg(''); setDepositError('');
    const user = JSON.parse(localStorage.getItem('miraclbet_user') || 'null');
    if (!user) { setDepositError('Please log in to deposit'); return; }
    const amount = parseFloat(depositAmount);
    if (!amount || amount < 10) { setDepositError('Minimum deposit is 10 Br'); return; }
    setDepositing(true);
    try {
      const res = await fetch(`${API}/api/v1/deposits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id, amount, method: depositMethod }),
      });
      if (!res.ok) {
        const txt = await res.text();
        try { setDepositError(JSON.parse(txt).message || 'Failed'); } catch { setDepositError(txt || 'Failed'); }
        return;
      }
      setDepositMsg('✅ Deposit submitted! Awaiting approval.');
      setDepositAmount('');
    } catch { setDepositError('Network error. Try again.'); }
    finally { setDepositing(false); }
  };

  return (
    <div
      className="hidden md:flex fixed top-[56px] right-0 bottom-0 z-[35] flex-col"
      style={{ width: 350, background: '#0A1628', borderLeft: '1px solid rgba(255,255,255,0.07)' }}
    >
      {/* Tabs */}
      <div className="flex shrink-0 border-b" style={{ borderColor: 'rgba(255,255,255,0.07)', background: '#060F1E' }}>
        <TabBtn label="Betslip" active={tab === 'betslip'} onClick={() => setTab('betslip')} badge={betslip.length}
          icon={<svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="12" y2="17"/></svg>}
        />
        <TabBtn label="Check" active={tab === 'check'} onClick={() => setTab('check')}
          icon={<svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>}
        />
        <TabBtn label="Deposit" active={tab === 'deposit'} onClick={() => setTab('deposit')}
          icon={<svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/><circle cx="12" cy="15" r="1.5" fill="currentColor"/></svg>}
        />
      </div>

      {/* ─── BETSLIP (Renders Mobile Page Component Directly) ─── */}
      {tab === 'betslip' && (
        <div className="flex flex-col flex-1 overflow-y-auto bg-[#0A0E1A] [&>div>div:first-child]:hidden [&>div]:!min-h-0 [&>div]:!pb-0">
          <BetslipPage />
        </div>
      )}

      {/* ─── CHECK ─── */}
      {tab === 'check' && (
        <div className="flex flex-col flex-1 overflow-y-auto px-4 py-4">
          <div className="text-center mb-5">
            <div className="text-3xl mb-2">🔍</div>
            <div className="text-white font-bold text-sm">Check Ticket Status</div>
            <div className="text-white/40 text-xs mt-1">Enter your ticket code to check results</div>
          </div>

          <input
            value={ticketCode} onChange={e => setTicketCode(e.target.value.toUpperCase())}
            onKeyDown={e => e.key === 'Enter' && checkTicket()}
            placeholder="e.g. TICKET-AB12CD34"
            className="w-full rounded-xl px-4 py-3 text-white text-sm font-bold outline-none mb-3"
            style={{ background: '#111F35', border: '1.5px solid rgba(255,255,255,0.1)', textTransform: 'uppercase' }}
          />
          <button onClick={checkTicket} disabled={checking || !ticketCode}
            className="w-full py-3 rounded-xl text-sm font-black mb-4"
            style={{ background: checking || !ticketCode ? '#1A2535' : '#19E66B', color: checking || !ticketCode ? '#4B5563' : '#000', cursor: checking || !ticketCode ? 'not-allowed' : 'pointer' }}>
            {checking ? '⏳ Checking...' : 'CHECK TICKET'}
          </button>

          {checkError && (
            <div className="rounded-xl px-4 py-3 text-xs font-bold mb-3" style={{ background: '#1A0506', color: '#EF4444', border: '1px solid #EF444430' }}>⚠️ {checkError}</div>
          )}

          {checkResult && (
            <div className="rounded-xl p-4 space-y-3" style={{ background: '#111F35', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="flex items-center justify-between">
                <span className="text-white/60 text-xs">Status</span>
                <StatusBadge status={checkResult.status} />
              </div>
              {checkResult.stake !== undefined && (
                <div className="flex justify-between text-xs"><span className="text-white/40">Stake</span><span className="text-white font-bold">{checkResult.stake?.toFixed(2)} Br</span></div>
              )}
              {checkResult.total_odds !== undefined && (
                <div className="flex justify-between text-xs"><span className="text-white/40">Total Odds</span><span className="text-white font-bold">{checkResult.total_odds?.toFixed(2)}</span></div>
              )}
              {checkResult.potential_payout !== undefined && (
                <div className="flex justify-between text-xs"><span className="text-white/40">Payout</span><span className="font-black" style={{ color: '#19E66B' }}>{checkResult.potential_payout?.toFixed(2)} Br</span></div>
              )}
              {checkResult.selections && checkResult.selections.length > 0 && (
                <div className="pt-2 border-t border-white/10 space-y-1">
                  {checkResult.selections.map((s, i) => (
                    <div key={i} className="text-xs text-white/50 truncate">{s.matchName} — <span className="text-white/80">{s.selectionName}</span> @ <span style={{ color: '#F5A623' }}>{s.odds?.toFixed(2)}</span></div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ─── DEPOSIT ─── */}
      {tab === 'deposit' && (
        <div className="flex flex-col flex-1 overflow-y-auto px-4 py-4">
          <div className="text-center mb-5">
            <div className="text-3xl mb-2">💳</div>
            <div className="text-white font-bold text-sm">Deposit Funds</div>
            <div className="text-white/40 text-xs mt-1">Add money to your account</div>
          </div>

          {/* Method selector */}
          <label className="text-[10px] text-white/40 font-bold uppercase tracking-wide mb-2 block">Payment Method</label>
          <div className="grid grid-cols-2 gap-2 mb-4">
            {[
              { key: 'telebirr', label: 'TeleBirr', icon: '📱' },
              { key: 'cbe', label: 'CBE Birr', icon: '🏦' },
              { key: 'mpesa', label: 'M-Pesa', icon: '📲' },
              { key: 'bank', label: 'Bank Transfer', icon: '🏛️' },
            ].map(m => (
              <button key={m.key} onClick={() => setDepositMethod(m.key)}
                className="flex flex-col items-center gap-1 py-3 rounded-xl text-xs font-bold transition-all"
                style={{
                  background: depositMethod === m.key ? '#19E66B22' : '#111F35',
                  border: depositMethod === m.key ? '1.5px solid #19E66B' : '1.5px solid rgba(255,255,255,0.08)',
                  color: depositMethod === m.key ? '#19E66B' : '#9CA3AF',
                }}>
                <span className="text-xl">{m.icon}</span>
                {m.label}
              </button>
            ))}
          </div>

          <label className="text-[10px] text-white/40 font-bold uppercase tracking-wide mb-2 block">Amount (Br)</label>
          <div className="relative mb-2">
            <input
              type="number" value={depositAmount} onChange={e => setDepositAmount(e.target.value)}
              placeholder="Min. 10 Br"
              className="w-full rounded-xl px-4 py-3 text-white text-sm font-bold outline-none"
              style={{ background: '#111F35', border: '1.5px solid rgba(255,255,255,0.1)' }}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-white/30">Br</span>
          </div>

          {/* Quick amount buttons */}
          <div className="grid grid-cols-4 gap-1.5 mb-4">
            {[50, 100, 200, 500].map(a => (
              <button key={a} onClick={() => setDepositAmount(String(a))}
                className="py-1.5 rounded-lg text-xs font-bold transition-colors"
                style={{ background: depositAmount === String(a) ? '#19E66B' : '#111F35', color: depositAmount === String(a) ? '#000' : '#9CA3AF', border: '1px solid rgba(255,255,255,0.06)' }}>
                +{a}
              </button>
            ))}
          </div>

          {depositError && (
            <div className="rounded-xl px-4 py-3 text-xs font-bold mb-3" style={{ background: '#1A0506', color: '#EF4444', border: '1px solid #EF444430' }}>⚠️ {depositError}</div>
          )}
          {depositMsg && (
            <div className="rounded-xl px-4 py-3 text-xs font-bold mb-3" style={{ background: '#052E16', color: '#19E66B', border: '1px solid #19E66B30' }}>{depositMsg}</div>
          )}

          <button onClick={submitDeposit} disabled={depositing || !depositAmount}
            className="w-full py-3 rounded-xl text-sm font-black"
            style={{
              background: depositing || !depositAmount ? '#1A2535' : 'linear-gradient(135deg, #19E66B, #0DB857)',
              color: depositing || !depositAmount ? '#4B5563' : '#000',
              cursor: depositing || !depositAmount ? 'not-allowed' : 'pointer',
            }}>
            {depositing ? '⏳ Processing...' : `DEPOSIT${depositAmount ? ` · ${depositAmount} Br` : ''}`}
          </button>

          <p className="text-center text-white/20 text-[10px] mt-4">Deposits are reviewed within 5–30 minutes</p>
        </div>
      )}
    </div>
  );
}
