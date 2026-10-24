'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type UserSession = { phone: string; role: string; balance?: number; id?: string };

type PromoStats = {
  promo_code: string;
  referral_url: string;
  register_url: string;
  total_users: number;
  total_deposits: number;
  accepted_deposit_count: number;
  pending_deposits: number;
  total_withdrawals: number;
  accepted_withdrawal_count: number;
  pending_withdrawals: number;
  total_bets: number;
  total_staked: number;
};

const adminMenus = [
  { label: 'Users', icon: '👥', href: '/admin/users', color: '#3B82F6', bg: '#EFF6FF' },
  { label: 'Workers', icon: '🔧', href: '/admin/workers', color: '#8B5CF6', bg: '#F5F3FF' },
  { label: 'Agents', icon: '🏪', href: '/admin/agents', color: '#9333EA', bg: '#F3E8FF' },
  { label: 'Deposits', icon: '💰', href: '/admin/deposits', color: '#10B981', bg: '#ECFDF5' },
  { label: 'Withdrawals', icon: '💸', href: '/admin/withdrawals', color: '#F59E0B', bg: '#FFFBEB' },
  { label: 'Deposit Methods', icon: '💳', href: '/admin/deposit-methods', color: '#06B6D4', bg: '#ECFEFF' },
  { label: 'Withdrawal Methods', icon: '🏦', href: '/admin/withdrawal-methods', color: '#EC4899', bg: '#FDF2F8' },
  { label: 'Inviter Codes', icon: '🎟️', href: '/admin/inviter-codes', color: '#7C3AED', bg: '#F5F3FF' },
  { label: 'Bets', icon: '🎫', href: '/admin/bets', color: '#EF4444', bg: '#FEF2F2' },
  { label: 'Manual Bet', icon: '⚡', href: '/admin/manual-bet', color: '#19E66B', bg: '#0D2219' },
  { label: 'Support Chat', icon: '💬', href: '/admin/support', color: '#0284C7', bg: '#E0F2FE' },
  { label: 'Withdrawal Rules', icon: '📜', href: '/admin/withdrawal-rules', color: '#D97706', bg: '#FEF3C7' },
  { label: 'Balance Manager', icon: '⚖️', href: '/admin/balance-manager', color: '#2563EB', bg: '#EFF6FF' },
  { label: 'Settings', icon: '⚙️', href: '/admin/settings', color: '#6B7280', bg: '#F9FAFB' },
];

export default function AdminDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<UserSession | null>(null);
  const [pendingStats, setPendingStats] = useState({ deposits: 0, withdrawals: 0, support: 0 });
  
  // Super Admin Promo States
  const [promoStats, setPromoStats] = useState<PromoStats | null>(null);
  const [isEditingCode, setIsEditingCode] = useState(false);
  const [newCodeInput, setNewCodeInput] = useState('');
  const [codeSaving, setCodeSaving] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const [regCopied, setRegCopied] = useState(false);

  const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

  const fetchPromoStats = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/v1/admin/super/promo-stats`);
      if (res.ok) {
        const data = await res.json();
        setPromoStats(data);
        setNewCodeInput(data.promo_code || '7777');
      }
    } catch (e) {
      console.error('Failed to fetch promo stats:', e);
    }
  }, [API]);

  useEffect(() => {
    const savedUser = localStorage.getItem('miraclbet_user');
    if (!savedUser) { router.push('/login'); return; }
    const parsed = JSON.parse(savedUser);
    
    // Allow both ADMIN and SUPER_ADMIN
    if (parsed.role !== 'ADMIN' && parsed.role !== 'SUPER_ADMIN') {
      if (parsed.role === 'WORKER') router.push('/worker');
      else if (parsed.role === 'AGENT') router.push('/agent');
      else router.push('/');
      return;
    }
    setUser(parsed);

    const authHeaders = {
      'X-Admin-Role': parsed.role || 'ADMIN',
      'X-Admin-ID': parsed.id || '',
    };

    // Fetch pending counts (filtered based on caller role)
    fetch(`${API}/api/v1/admin/stats/pending?admin_role=${parsed.role}&admin_id=${parsed.id || ''}`, {
      headers: authHeaders,
    })
      .then(res => res.json())
      .then(data => {
        if (data) setPendingStats(prev => ({ ...prev, deposits: data.deposits || 0, withdrawals: data.withdrawals || 0 }));
      })
      .catch(console.error);

    // Fetch unread support messages count
    fetch(`${API}/api/v1/admin/support/unread-count?admin_role=${parsed.role}&admin_id=${parsed.id || ''}`, {
      headers: authHeaders,
    })
      .then(res => res.json())
      .then(data => {
        if (data && typeof data.unread === 'number') {
          setPendingStats(prev => ({ ...prev, support: data.unread }));
        }
      })
      .catch(console.error);

    // If SUPER_ADMIN, also fetch promo stats
    if (parsed.role === 'SUPER_ADMIN') {
      fetchPromoStats();
    }
  }, [router, API, fetchPromoStats]);

  const handleLogout = () => {
    localStorage.removeItem('miraclbet_user');
    router.push('/login');
  };

  const handleSavePromoCode = async () => {
    const clean = newCodeInput.trim().toUpperCase();
    if (clean.length !== 4) {
      alert('Promo code must be exactly 4 alphanumeric characters (e.g. 7777)');
      return;
    }
    setCodeSaving(true);
    try {
      const res = await fetch(`${API}/api/v1/admin/super/promo-code`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: clean }),
      });
      if (res.ok) {
        setIsEditingCode(false);
        fetchPromoStats();
      } else {
        const d = await res.json();
        alert(d.error || 'Failed to update code');
      }
    } catch {
      alert('Network error updating promo code');
    } finally {
      setCodeSaving(false);
    }
  };

  const copyToClipboard = (text: string, type: 'main' | 'reg') => {
    navigator.clipboard.writeText(text);
    if (type === 'main') {
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    } else {
      setRegCopied(true);
      setTimeout(() => setRegCopied(false), 2000);
    }
  };

  if (!user) return null;

  const shortId = user.id ? user.id.slice(-6).toUpperCase() : user.phone?.slice(-6) ?? '------';
  const isSuper = user.role === 'SUPER_ADMIN';

  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC', fontFamily: 'system-ui, -apple-system, sans-serif' }}>

      {/* Sticky Top Bar */}
      <div style={{
        background: '#FFFFFF', borderBottom: '1px solid #E5E7EB',
        padding: '12px 16px', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100,
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
      }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: '17px', color: '#111827', lineHeight: 1 }}>
            Miracl<span style={{ color: '#16A34A' }}>Bet</span>
            {isSuper ? (
              <span style={{
                marginLeft: '8px', fontSize: '10px', fontWeight: 800, color: '#6D28D9',
                background: '#EDE9FE', border: '1px solid #DDD6FE', padding: '2px 8px', borderRadius: '999px', verticalAlign: 'middle',
                letterSpacing: 0.5
              }}>👑 SUPER ADMIN</span>
            ) : (
              <span style={{
                marginLeft: '8px', fontSize: '10px', fontWeight: 700, color: '#16A34A',
                background: '#DCFCE7', padding: '2px 7px', borderRadius: '999px', verticalAlign: 'middle',
              }}>ADMIN</span>
            )}
          </div>
          <div style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '3px' }}>ID: {shortId}</div>
        </div>
        <button
          onClick={handleLogout}
          style={{
            background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA',
            borderRadius: '8px', padding: '8px 14px', fontSize: '13px',
            fontWeight: 700, cursor: 'pointer',
          }}
        >
          Logout
        </button>
      </div>

      {/* Page Content */}
      <div style={{ padding: '20px 16px', maxWidth: '640px', margin: '0 auto' }}>

        {/* Welcome */}
        <div style={{ marginBottom: '20px' }}>
          <h1 style={{ fontSize: '20px', fontWeight: 800, color: '#111827', margin: '0 0 4px' }}>
            {isSuper ? 'Super Admin Dashboard' : 'Admin Dashboard'}
          </h1>
          <p style={{ fontSize: '13px', color: '#6B7280', margin: 0 }}>
            {isSuper ? 'Full platform control & confidential promo management' : 'Manage your MiraclBet platform'}
          </p>
        </div>

        {/* ── SUPER ADMIN SECRET PROMO PORTAL (Exclusive for SUPER_ADMIN) ── */}
        {isSuper && (
          <div style={{
            background: 'linear-gradient(135deg, #1E1B4B 0%, #312E81 50%, #4338CA 100%)',
            borderRadius: '18px',
            padding: '20px',
            color: '#FFFFFF',
            marginBottom: '24px',
            boxShadow: '0 8px 24px rgba(49, 46, 129, 0.25)',
            border: '1px solid rgba(199, 210, 254, 0.25)',
          }}>
            {/* Header row */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '20px' }}>👑</span>
                <div>
                  <div style={{ fontSize: '15px', fontWeight: 800, letterSpacing: '0.3px' }}>
                    Super Admin Secret Promo Portal
                  </div>
                  <div style={{ fontSize: '11px', color: '#C7D2FE', marginTop: '1px' }}>
                    Users with this code are completely HIDDEN from normal Admins
                  </div>
                </div>
              </div>
              <button
                onClick={fetchPromoStats}
                style={{
                  background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '8px', padding: '5px 10px', color: '#fff', fontSize: '11px', fontWeight: 700, cursor: 'pointer'
                }}
              >
                ↻ Refresh
              </button>
            </div>

            {/* 4-digit Promo Code Box */}
            <div style={{
              background: 'rgba(0,0,0,0.25)', borderRadius: '12px', padding: '12px 14px', marginBottom: '14px',
              border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px'
            }}>
              <div>
                <div style={{ fontSize: '10px', color: '#A5B4FC', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                  4-Digit Promo Code
                </div>
                {isEditingCode ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                    <input
                      type="text"
                      maxLength={4}
                      value={newCodeInput}
                      onChange={(e) => setNewCodeInput(e.target.value.toUpperCase())}
                      style={{
                        width: '80px', padding: '4px 8px', borderRadius: '6px', border: '1.5px solid #818CF8',
                        background: '#0F172A', color: '#fff', fontWeight: 900, fontSize: '16px', letterSpacing: '2px', textAlign: 'center'
                      }}
                    />
                    <button
                      onClick={handleSavePromoCode}
                      disabled={codeSaving}
                      style={{
                        background: '#10B981', color: '#fff', border: 'none', borderRadius: '6px',
                        padding: '6px 12px', fontSize: '11px', fontWeight: 800, cursor: 'pointer'
                      }}
                    >
                      {codeSaving ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      onClick={() => setIsEditingCode(false)}
                      style={{
                        background: 'transparent', color: '#94A3B8', border: 'none', fontSize: '11px', cursor: 'pointer'
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div style={{ fontSize: '22px', fontWeight: 900, color: '#38BDF8', letterSpacing: '2px', lineHeight: 1.2 }}>
                    {promoStats?.promo_code || '7777'}
                  </div>
                )}
              </div>

              {!isEditingCode && (
                <button
                  onClick={() => setIsEditingCode(true)}
                  style={{
                    background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)',
                    borderRadius: '8px', padding: '6px 12px', color: '#fff', fontSize: '11px', fontWeight: 700, cursor: 'pointer'
                  }}
                >
                  ✎ Change Code
                </button>
              )}
            </div>

            {/* Referral Links Section */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
              {/* Home link */}
              <div style={{
                background: 'rgba(255,255,255,0.08)', borderRadius: '10px', padding: '9px 12px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px'
              }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: '10px', color: '#A5B4FC', fontWeight: 700 }}>HOME LINK (AUTO-ATTACH)</div>
                  <div style={{ fontSize: '12px', color: '#E0E7FF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600 }}>
                    {promoStats?.referral_url || `https://www.miraclbet.com/?ref=7777`}
                  </div>
                </div>
                <button
                  onClick={() => copyToClipboard(promoStats?.referral_url || `https://www.miraclbet.com/?ref=7777`, 'main')}
                  style={{
                    background: codeCopied ? '#10B981' : 'rgba(255,255,255,0.2)', border: 'none',
                    borderRadius: '7px', padding: '6px 10px', color: '#fff', fontSize: '11px', fontWeight: 800, cursor: 'pointer', flexShrink: 0
                  }}
                >
                  {codeCopied ? '✓ Copied' : 'Copy Link'}
                </button>
              </div>

              {/* Direct Register link */}
              <div style={{
                background: 'rgba(255,255,255,0.08)', borderRadius: '10px', padding: '9px 12px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px'
              }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: '10px', color: '#A5B4FC', fontWeight: 700 }}>REGISTER DIRECT LINK</div>
                  <div style={{ fontSize: '12px', color: '#E0E7FF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600 }}>
                    {promoStats?.register_url || `https://www.miraclbet.com/register?promo=7777`}
                  </div>
                </div>
                <button
                  onClick={() => copyToClipboard(promoStats?.register_url || `https://www.miraclbet.com/register?promo=7777`, 'reg')}
                  style={{
                    background: regCopied ? '#10B981' : 'rgba(255,255,255,0.2)', border: 'none',
                    borderRadius: '7px', padding: '6px 10px', color: '#fff', fontSize: '11px', fontWeight: 800, cursor: 'pointer', flexShrink: 0
                  }}
                >
                  {regCopied ? '✓ Copied' : 'Copy Link'}
                </button>
              </div>
            </div>

            {/* Real-time Metrics Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '14px' }}>
              <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '10px', padding: '10px 12px' }}>
                <div style={{ fontSize: '11px', color: '#A5B4FC', fontWeight: 700 }}>👥 Promo Users</div>
                <div style={{ fontSize: '18px', fontWeight: 900, color: '#38BDF8', marginTop: '2px' }}>
                  {promoStats?.total_users ?? 0}
                </div>
              </div>
              <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '10px', padding: '10px 12px' }}>
                <div style={{ fontSize: '11px', color: '#A5B4FC', fontWeight: 700 }}>💰 Promo Deposits</div>
                <div style={{ fontSize: '15px', fontWeight: 900, color: '#34D399', marginTop: '2px' }}>
                  ETB {(promoStats?.total_deposits ?? 0).toFixed(2)}
                </div>
                {(promoStats?.pending_deposits ?? 0) > 0 && (
                  <div style={{ fontSize: '10px', color: '#FCD34D', fontWeight: 700, marginTop: '2px' }}>
                    ⚡ {promoStats?.pending_deposits} pending
                  </div>
                )}
              </div>
              <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '10px', padding: '10px 12px' }}>
                <div style={{ fontSize: '11px', color: '#A5B4FC', fontWeight: 700 }}>💸 Promo Withdrawals</div>
                <div style={{ fontSize: '15px', fontWeight: 900, color: '#F472B6', marginTop: '2px' }}>
                  ETB {(promoStats?.total_withdrawals ?? 0).toFixed(2)}
                </div>
                {(promoStats?.pending_withdrawals ?? 0) > 0 && (
                  <div style={{ fontSize: '10px', color: '#FCD34D', fontWeight: 700, marginTop: '2px' }}>
                    ⚡ {promoStats?.pending_withdrawals} pending
                  </div>
                )}
              </div>
              <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '10px', padding: '10px 12px' }}>
                <div style={{ fontSize: '11px', color: '#A5B4FC', fontWeight: 700 }}>🎫 Promo Bets</div>
                <div style={{ fontSize: '15px', fontWeight: 900, color: '#FBBF24', marginTop: '2px' }}>
                  {promoStats?.total_bets ?? 0} tickets
                </div>
                <div style={{ fontSize: '10px', color: '#E2E8F0', marginTop: '2px' }}>
                  ETB {(promoStats?.total_staked ?? 0).toFixed(2)} staked
                </div>
              </div>
            </div>

            {/* Quick Access to Promo-only views */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              <Link
                href="/admin/users?promo_filter=only"
                style={{
                  background: 'rgba(255,255,255,0.15)', color: '#fff', borderRadius: '6px', padding: '5px 10px',
                  fontSize: '11px', fontWeight: 700, textDecoration: 'none', border: '1px solid rgba(255,255,255,0.2)'
                }}
              >
                👥 Promo Users
              </Link>
              <Link
                href="/admin/deposits?promo_filter=only"
                style={{
                  background: 'rgba(255,255,255,0.15)', color: '#fff', borderRadius: '6px', padding: '5px 10px',
                  fontSize: '11px', fontWeight: 700, textDecoration: 'none', border: '1px solid rgba(255,255,255,0.2)'
                }}
              >
                💰 Promo Deposits
              </Link>
              <Link
                href="/admin/withdrawals?promo_filter=only"
                style={{
                  background: 'rgba(255,255,255,0.15)', color: '#fff', borderRadius: '6px', padding: '5px 10px',
                  fontSize: '11px', fontWeight: 700, textDecoration: 'none', border: '1px solid rgba(255,255,255,0.2)'
                }}
              >
                💸 Promo Withdrawals
              </Link>
              <Link
                href="/admin/bets?promo_filter=only"
                style={{
                  background: 'rgba(255,255,255,0.15)', color: '#fff', borderRadius: '6px', padding: '5px 10px',
                  fontSize: '11px', fontWeight: 700, textDecoration: 'none', border: '1px solid rgba(255,255,255,0.2)'
                }}
              >
                🎫 Promo Bets
              </Link>
            </div>
          </div>
        )}

        {/* 2-column button grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          {adminMenus.map((item) => {
            let badgeCount = 0;
            if (item.label === 'Deposits') badgeCount = pendingStats.deposits;
            if (item.label === 'Withdrawals') badgeCount = pendingStats.withdrawals;
            if (item.label === 'Support Chat') badgeCount = pendingStats.support;

            return (
              <Link
                key={item.label}
                href={item.href}
                style={{
                  background: '#FFFFFF',
                  border: `1.5px solid ${item.bg === '#F9FAFB' ? '#E5E7EB' : item.bg}`,
                  borderRadius: '16px',
                  padding: '20px 14px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                  transition: 'box-shadow 0.15s',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  textDecoration: 'none',
                  position: 'relative'
                }}
              >
                {/* Badge */}
                {badgeCount > 0 && (
                  <div style={{
                    position: 'absolute', top: 12, right: 12, background: '#EF4444', color: '#fff',
                    fontSize: '11px', fontWeight: 800, padding: '2px 6px', borderRadius: '999px',
                    minWidth: '20px', textAlign: 'center', boxShadow: '0 2px 4px rgba(239,68,68,0.3)'
                  }}>
                    {badgeCount}
                  </div>
                )}
                
                {/* Icon circle */}
                <div style={{
                  width: '46px', height: '46px', borderRadius: '14px',
                  background: item.bg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '22px',
                }}>
                  {item.icon}
                </div>
                {/* Label */}
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#111827', lineHeight: 1.2 }}>
                    {item.label}
                  </div>
                  <div style={{ marginTop: '4px' }}>
                    <svg viewBox="0 0 24 24" style={{ width: '14px', height: '14px', color: item.color }} fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        <div style={{ height: '32px' }} />
      </div>
    </div>
  );
}
