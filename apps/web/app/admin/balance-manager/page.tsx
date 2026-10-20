'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://api.miraclbet.com:8443';

/* ─── Types ─────────────────────────────────────────────── */
type UserRow = {
  id: string;
  phone: string;
  role: string;
  balance: number;
  is_active: boolean;
  created_at: string;
  total_deposited: number;
  deposit_count: number;
  pending_deposits: number;
  total_bets: number;
  won_bets: number;
  lost_bets: number;
  pending_bets: number;
  total_staked: number;
  total_payout: number;
};

type DepositRow = {
  id: string;
  amount: number;
  status: string;
  provider_name: string;
  created_at: string;
};

type BetRow = {
  id: string;
  stake: number;
  total_odds: number;
  potential_payout: number;
  status: string;
  is_auto_win: boolean;
  leg_count: number;
  created_at: string;
};

type UserDetail = {
  user: {
    id: string;
    phone: string;
    role: string;
    balance: number;
    is_active: boolean;
    created_at: string;
  };
  deposits: DepositRow[];
  bets: BetRow[];
  total_deposited: number;
  deposit_count: number;
  total_bets: number;
  won_bets: number;
  lost_bets: number;
  pending_bets: number;
  total_staked: number;
  total_won_payout: number;
};

/* ─── Helpers ───────────────────────────────────────────── */
function fmt(n: number) { return n.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function fmtDate(iso: string) {
  try { const d = new Date(iso); return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }
  catch { return iso; }
}

const STATUS_COLOR: Record<string, { bg: string; color: string }> = {
  accepted:  { bg: '#DCFCE7', color: '#15803D' },
  pending:   { bg: '#FEF9C3', color: '#A16207' },
  rejected:  { bg: '#FEE2E2', color: '#B91C1C' },
  WON:       { bg: '#DCFCE7', color: '#15803D' },
  LOST:      { bg: '#FEE2E2', color: '#B91C1C' },
  PENDING:   { bg: '#FEF9C3', color: '#A16207' },
  CANCELLED: { bg: '#F3F4F6', color: '#6B7280' },
  REFUNDED:  { bg: '#EFF6FF', color: '#1D4ED8' },
};

/* ─── Detail Modal ──────────────────────────────────────── */
function DetailModal({ userId, onClose, onBalanceUpdated }: {
  userId: string;
  onClose: () => void;
  onBalanceUpdated: (id: string, newBal: number) => void;
}) {
  const [detail, setDetail] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'deposits' | 'bets'>('deposits');
  const [balInput, setBalInput] = useState('');
  const [balMode, setBalMode] = useState<'set' | 'adjust'>('set');
  const [adjustSign, setAdjustSign] = useState<'+' | '-'>('+');
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/v1/admin/balance-manager/${userId}`);
      const data = await res.json();
      setDetail(data);
      setBalInput(String(data.user.balance.toFixed(2)));
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  const handleSaveBalance = async () => {
    if (!detail || !balInput) return;
    let amount = parseFloat(balInput);
    if (isNaN(amount)) { setSaveMsg('Invalid amount'); return; }
    if (balMode === 'adjust' && adjustSign === '-') amount = -Math.abs(amount);
    setSaving(true); setSaveMsg('');
    try {
      const res = await fetch(`${API}/api/v1/admin/users/${userId}/balance`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, mode: balMode }),
      });
      const data = await res.json();
      if (data.balance !== undefined) {
        setSaveMsg(`✅ Balance updated to ${fmt(data.balance)} Br`);
        setDetail(prev => prev ? { ...prev, user: { ...prev.user, balance: data.balance } } : prev);
        onBalanceUpdated(userId, data.balance);
        setBalInput(String(data.balance.toFixed(2)));
      } else {
        setSaveMsg('Failed to update balance');
      }
    } catch { setSaveMsg('Network error'); }
    finally { setSaving(false); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: '#fff', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 600, maxHeight: '93dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 18, color: '#111827' }}>{detail?.user.phone ?? '...'}</div>
            <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>{detail?.user.role} · {detail?.user.is_active ? 'Active' : 'Inactive'}</div>
          </div>
          <button onClick={onClose} style={{ background: '#F3F4F6', border: 'none', borderRadius: 10, padding: '8px 14px', fontWeight: 700, fontSize: 13, cursor: 'pointer', color: '#374151' }}>
            Close
          </button>
        </div>

        <div style={{ overflowY: 'auto', flex: 1 }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#9CA3AF' }}>Loading...</div>
          ) : detail ? (
            <>
              {/* ── Stats Row ── */}
              <div style={{ padding: '16px 20px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                {[
                  { label: 'Current Balance', value: `${fmt(detail.user.balance)} Br`, color: '#1D4ED8', bg: '#EFF6FF' },
                  { label: 'Total Deposited', value: `${fmt(detail.total_deposited)} Br`, color: '#15803D', bg: '#DCFCE7' },
                  { label: 'Total Bets', value: String(detail.total_bets), color: '#7C3AED', bg: '#F5F3FF' },
                ].map(s => (
                  <div key={s.label} style={{ background: s.bg, borderRadius: 12, padding: '12px 10px', textAlign: 'center' }}>
                    <div style={{ fontSize: 15, fontWeight: 900, color: s.color }}>{s.value}</div>
                    <div style={{ fontSize: 10, fontWeight: 600, color: s.color, opacity: 0.75, marginTop: 2 }}>{s.label}</div>
                  </div>
                ))}
              </div>

              {/* ── Bet Stats Row ── */}
              <div style={{ padding: '0 20px 14px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8 }}>
                {[
                  { label: 'Won', value: detail.won_bets, color: '#15803D' },
                  { label: 'Lost', value: detail.lost_bets, color: '#DC2626' },
                  { label: 'Pending', value: detail.pending_bets, color: '#A16207' },
                  { label: 'Payout', value: `${fmt(detail.total_won_payout)}`, color: '#1D4ED8' },
                ].map(s => (
                  <div key={s.label} style={{ background: '#F9FAFB', borderRadius: 10, padding: '10px 6px', textAlign: 'center', border: '1px solid #E5E7EB' }}>
                    <div style={{ fontSize: 16, fontWeight: 900, color: s.color }}>{s.value}</div>
                    <div style={{ fontSize: 10, color: '#6B7280', marginTop: 2 }}>{s.label}</div>
                  </div>
                ))}
              </div>

              {/* ── Balance Editor ── */}
              <div style={{ margin: '0 20px 16px', background: '#F8FAFC', borderRadius: 14, padding: 16, border: '1.5px solid #E2E8F0' }}>
                <div style={{ fontWeight: 800, fontSize: 14, color: '#111827', marginBottom: 12 }}>Edit Balance</div>
                <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
                  {(['set', 'adjust'] as const).map(m => (
                    <button key={m} onClick={() => setBalMode(m)} style={{
                      padding: '7px 18px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer',
                      background: balMode === m ? '#111827' : '#fff',
                      color: balMode === m ? '#fff' : '#374151',
                      border: balMode === m ? 'none' : '1.5px solid #E5E7EB',
                    }}>
                      {m === 'set' ? 'Set Exact Balance' : 'Adjust (+/-)'}
                    </button>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  {balMode === 'adjust' && (
                    <button onClick={() => setAdjustSign(s => s === '+' ? '-' : '+')} style={{
                      padding: '10px 16px', borderRadius: 8, fontSize: 20, fontWeight: 900, cursor: 'pointer',
                      background: adjustSign === '+' ? '#DCFCE7' : '#FEE2E2',
                      color: adjustSign === '+' ? '#15803D' : '#DC2626',
                      border: 'none', minWidth: 50,
                    }}>
                      {adjustSign}
                    </button>
                  )}
                  <input
                    type="number"
                    inputMode="decimal"
                    value={balInput}
                    onChange={e => setBalInput(e.target.value)}
                    placeholder="Amount (Br)"
                    style={{ flex: 1, padding: '11px 14px', borderRadius: 10, border: '1.5px solid #D1D5DB', fontSize: 16, fontWeight: 700, outline: 'none' }}
                  />
                  <button onClick={handleSaveBalance} disabled={saving} style={{
                    padding: '11px 20px', borderRadius: 10, fontSize: 14, fontWeight: 800, cursor: saving ? 'not-allowed' : 'pointer',
                    background: saving ? '#9CA3AF' : '#16A34A', color: '#fff', border: 'none', whiteSpace: 'nowrap',
                  }}>
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                </div>
                {saveMsg && (
                  <div style={{ marginTop: 8, fontSize: 13, fontWeight: 700, color: saveMsg.startsWith('✅') ? '#15803D' : '#DC2626' }}>
                    {saveMsg}
                  </div>
                )}
                <div style={{ marginTop: 8, fontSize: 12, color: '#6B7280' }}>
                  Current balance: <strong>{fmt(detail.user.balance)} Br</strong>
                  {detail.total_deposited > 0 && (
                    <> · Calculated correct balance: <strong style={{ color: '#1D4ED8' }}>
                      {fmt(Math.max(0, detail.total_deposited - detail.total_staked + detail.total_won_payout))} Br
                    </strong></>
                  )}
                </div>
              </div>

              {/* ── Tabs ── */}
              <div style={{ display: 'flex', gap: 0, borderBottom: '2px solid #E5E7EB', margin: '0 20px' }}>
                {(['deposits', 'bets'] as const).map(t => (
                  <button key={t} onClick={() => setTab(t)} style={{
                    padding: '10px 20px', fontWeight: 800, fontSize: 14, cursor: 'pointer',
                    background: 'none', border: 'none',
                    color: tab === t ? '#111827' : '#9CA3AF',
                    borderBottom: tab === t ? '2.5px solid #111827' : '2.5px solid transparent',
                    marginBottom: -2,
                  }}>
                    {t === 'deposits' ? `Deposits (${detail.deposit_count})` : `Tickets (${detail.total_bets})`}
                  </button>
                ))}
              </div>

              {/* ── Deposit List ── */}
              {tab === 'deposits' && (
                <div style={{ padding: '12px 20px 30px' }}>
                  {detail.deposits.length === 0 ? (
                    <div style={{ padding: 24, textAlign: 'center', color: '#9CA3AF', fontSize: 14 }}>No deposits found</div>
                  ) : detail.deposits.map(d => {
                    const sc = STATUS_COLOR[d.status] ?? { bg: '#F3F4F6', color: '#6B7280' };
                    return (
                      <div key={d.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 0', borderBottom: '1px solid #F3F4F6' }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 14, color: '#111827' }}>{fmt(d.amount)} Br</div>
                          <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>{d.provider_name} · {fmtDate(d.created_at)}</div>
                        </div>
                        <div style={{ background: sc.bg, color: sc.color, padding: '4px 12px', borderRadius: 8, fontWeight: 800, fontSize: 12 }}>
                          {d.status.charAt(0).toUpperCase() + d.status.slice(1)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* ── Bet List ── */}
              {tab === 'bets' && (
                <div style={{ padding: '12px 20px 30px' }}>
                  {detail.bets.length === 0 ? (
                    <div style={{ padding: 24, textAlign: 'center', color: '#9CA3AF', fontSize: 14 }}>No tickets found</div>
                  ) : detail.bets.map(b => {
                    const sc = STATUS_COLOR[b.status] ?? { bg: '#F3F4F6', color: '#6B7280' };
                    return (
                      <div key={b.id} style={{ background: '#F9FAFB', borderRadius: 12, padding: '13px 14px', marginBottom: 10, border: '1px solid #E5E7EB' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ background: sc.bg, color: sc.color, padding: '4px 10px', borderRadius: 7, fontWeight: 800, fontSize: 12 }}>{b.status}</div>
                            {b.is_auto_win && <div style={{ background: '#F0FDF4', color: '#15803D', padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700 }}>AUTO</div>}
                          </div>
                          <div style={{ fontSize: 12, color: '#9CA3AF' }}>{fmtDate(b.created_at)}</div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                          <div>
                            <span style={{ color: '#6B7280' }}>Stake:</span> <strong>{fmt(b.stake)} Br</strong>
                          </div>
                          <div>
                            <span style={{ color: '#6B7280' }}>Odds:</span> <strong>{b.total_odds.toFixed(2)}x</strong>
                          </div>
                          <div>
                            <span style={{ color: '#6B7280' }}>Legs:</span> <strong>{b.leg_count}</strong>
                          </div>
                        </div>
                        {b.status === 'WON' && (
                          <div style={{ marginTop: 6, fontSize: 13, color: '#15803D', fontWeight: 700 }}>
                            Payout: {fmt(b.potential_payout)} Br
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/* ─── Main Page ─────────────────────────────────────────── */
export default function AdminBalanceManagerPage() {
  const router = useRouter();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [filtered, setFiltered] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem('miraclbet_user');
    if (!saved) { router.push('/login'); return; }
    const u = JSON.parse(saved);
    if (u.role !== 'ADMIN') { router.push('/admin'); return; }

    fetch(`${API}/api/v1/admin/balance-manager`)
      .then(r => r.json())
      .then(data => {
        const arr = Array.isArray(data) ? data : [];
        setUsers(arr);
        setFiltered(arr);
      })
      .catch(() => setUsers([]))
      .finally(() => setLoading(false));
  }, [router]);

  useEffect(() => {
    const q = search.trim().toLowerCase();
    if (!q) { setFiltered(users); return; }
    setFiltered(users.filter(u => u.phone.toLowerCase().includes(q)));
  }, [search, users]);

  if (!mounted) return null;

  const totalBalance   = users.reduce((s, u) => s + u.balance, 0);
  const totalDeposited = users.reduce((s, u) => s + u.total_deposited, 0);

  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC', fontFamily: 'system-ui, sans-serif' }}>

      {/* Sticky Header */}
      <div style={{
        background: '#fff', borderBottom: '1px solid #E5E7EB',
        padding: '14px 16px', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100,
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => router.push('/admin')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex' }}>
            <svg viewBox="0 0 24 24" style={{ width: 20, height: 20 }} fill="none" stroke="#6B7280" strokeWidth="2.5">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 800, color: '#111827', margin: 0, lineHeight: 1 }}>Balance Manager</h1>
            <p style={{ fontSize: 11, color: '#9CA3AF', margin: '3px 0 0' }}>{filtered.length} users with deposits</p>
          </div>
        </div>
        <button onClick={() => { setLoading(true); fetch(`${API}/api/v1/admin/balance-manager`).then(r=>r.json()).then(d=>{const a=Array.isArray(d)?d:[];setUsers(a);setFiltered(a);}).finally(()=>setLoading(false)); }}
          style={{ background: '#F3F4F6', border: 'none', borderRadius: 8, padding: '8px 14px', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
          Refresh
        </button>
      </div>

      <div style={{ padding: '16px', maxWidth: 640, margin: '0 auto' }}>

        {/* Summary cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
          <div style={{ background: '#EFF6FF', borderRadius: 14, padding: '14px 16px' }}>
            <div style={{ fontSize: 20, fontWeight: 900, color: '#1D4ED8' }}>{fmt(totalBalance)} Br</div>
            <div style={{ fontSize: 12, color: '#3B82F6', fontWeight: 600, marginTop: 2 }}>Total Balance (All Users)</div>
          </div>
          <div style={{ background: '#DCFCE7', borderRadius: 14, padding: '14px 16px' }}>
            <div style={{ fontSize: 20, fontWeight: 900, color: '#15803D' }}>{fmt(totalDeposited)} Br</div>
            <div style={{ fontSize: 12, color: '#16A34A', fontWeight: 600, marginTop: 2 }}>Total Deposited (Accepted)</div>
          </div>
        </div>

        {/* Search */}
        <div style={{ position: 'relative', marginBottom: 16 }}>
          <svg viewBox="0 0 24 24" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 16, height: 16 }} fill="none" stroke="#9CA3AF" strokeWidth="2">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by phone number..."
            style={{ width: '100%', padding: '11px 14px 11px 38px', borderRadius: 12, border: '1.5px solid #E5E7EB', fontSize: 14, outline: 'none', boxSizing: 'border-box', background: '#fff' }}
          />
        </div>

        {/* User list */}
        {loading ? (
          <div style={{ padding: 60, textAlign: 'center', color: '#9CA3AF', fontSize: 14, fontWeight: 600 }}>Loading users...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 60, textAlign: 'center', color: '#9CA3AF', fontSize: 14, fontWeight: 600 }}>No users with deposits found</div>
        ) : filtered.map(u => {
          const calculatedBalance = Math.max(0, u.total_deposited - u.total_staked + u.total_payout);
          const balanceDiff = Math.abs(u.balance - calculatedBalance);
          const hasDiscrepancy = balanceDiff > 0.5;
          return (
            <div key={u.id}
              onClick={() => setSelectedId(u.id)}
              style={{
                background: '#fff', borderRadius: 14, border: hasDiscrepancy ? '2px solid #FCA5A5' : '1px solid #E5E7EB',
                marginBottom: 10, overflow: 'hidden', cursor: 'pointer', boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
                transition: 'box-shadow 0.15s',
              }}>
              {hasDiscrepancy && (
                <div style={{ background: '#FEE2E2', padding: '6px 14px', fontSize: 11, fontWeight: 800, color: '#DC2626', display: 'flex', alignItems: 'center', gap: 6 }}>
                  ⚠️ Balance discrepancy detected — {fmt(balanceDiff)} Br difference
                </div>
              )}
              <div style={{ padding: '14px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 16, color: '#111827' }}>{u.phone}</div>
                    <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>{u.role} · {u.is_active ? 'Active' : 'Inactive'} · Since {new Date(u.created_at).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 900, fontSize: 18, color: '#1D4ED8' }}>{fmt(u.balance)} Br</div>
                    <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 1 }}>Current Balance</div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                  <div style={{ background: '#F0FDF4', borderRadius: 8, padding: '8px 10px', textAlign: 'center' }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: '#15803D' }}>{fmt(u.total_deposited)} Br</div>
                    <div style={{ fontSize: 10, color: '#16A34A' }}>Deposited ({u.deposit_count})</div>
                  </div>
                  <div style={{ background: '#F5F3FF', borderRadius: 8, padding: '8px 10px', textAlign: 'center' }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: '#7C3AED' }}>{u.total_bets}</div>
                    <div style={{ fontSize: 10, color: '#7C3AED' }}>{u.won_bets}W / {u.lost_bets}L / {u.pending_bets}P</div>
                  </div>
                  <div style={{ background: '#FFFBEB', borderRadius: 8, padding: '8px 10px', textAlign: 'center' }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: '#A16207' }}>{fmt(u.total_staked)} Br</div>
                    <div style={{ fontSize: 10, color: '#A16207' }}>Total Staked</div>
                  </div>
                </div>

                {hasDiscrepancy && (
                  <div style={{ marginTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#FEF2F2', borderRadius: 8, padding: '8px 12px' }}>
                    <div style={{ fontSize: 12, color: '#991B1B' }}>
                      Expected balance: <strong>{fmt(calculatedBalance)} Br</strong>
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#DC2626' }}>
                      Tap to fix →
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Detail Modal */}
      {selectedId && (
        <DetailModal
          userId={selectedId}
          onClose={() => setSelectedId(null)}
          onBalanceUpdated={(id, newBal) => {
            setUsers(prev => prev.map(u => u.id === id ? { ...u, balance: newBal } : u));
            setFiltered(prev => prev.map(u => u.id === id ? { ...u, balance: newBal } : u));
          }}
        />
      )}
    </div>
  );
}
