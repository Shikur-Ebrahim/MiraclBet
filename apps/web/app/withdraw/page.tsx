'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type WithdrawalMethod = {
  id: string;
  provider_name: string;
  logo_url: string | null;
  is_active: boolean;
};

type PendingWithdrawal = {
  id: string;
  amount: number;
  provider_name: string;
  account_name: string;
  account_number: string;
  created_at: string;
};

type WithdrawalRuleStatus = {
  rule_enabled: boolean;
  required_deposit: number;
  total_deposited: number;
  remaining: number;
  fulfilled: boolean;
  rule_title: string;
  rule_message: string;
  inviter_rule_enabled?: boolean;
  inviter_code_verified?: boolean;
  user_phone?: string;
};

export default function WithdrawPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [methods, setMethods] = useState<WithdrawalMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingWithdrawal, setPendingWithdrawal] = useState<PendingWithdrawal | null>(null);
  const [ruleStatus, setRuleStatus] = useState<WithdrawalRuleStatus | null>(null);
  const [showRuleModal, setShowRuleModal] = useState(false);

  // Inviter Code Verification State
  const [showInviterModal, setShowInviterModal] = useState(false);
  const [inviterCodeInput, setInviterCodeInput] = useState('');
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [inviterError, setInviterError] = useState('');
  const [inviterSuccess, setInviterSuccess] = useState('');
  const [inviterAttempts, setInviterAttempts] = useState(0);
  const MAX_INVITER_ATTEMPTS = 10;

  const [step, setStep] = useState(1);
  const [selectedMethod, setSelectedMethod] = useState<WithdrawalMethod | null>(null);
  const [accountName, setAccountName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [amount, setAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [telegramUsername, setTelegramUsername] = useState('');

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!mounted) return;
    const userStr = localStorage.getItem('miraclbet_user');
    if (!userStr) { router.push('/login?redirect=/withdraw'); return; }
    const user = JSON.parse(userStr);
    const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
    Promise.all([
      fetch(`${API}/api/v1/withdrawal-methods`).then(r => r.json()).catch(() => []),
      fetch(`${API}/api/v1/withdrawals/pending?user_id=${user.id}`).then(r => r.json()).catch(() => null),
      fetch(`${API}/api/v1/withdrawals/rule-check?user_id=${user.id}`).then(r => r.json()).catch(() => null),
      fetch(`${API}/api/v1/settings`).then(r => r.json()).catch(() => ({})),
    ]).then(([methodsData, pendingData, ruleData, settingsData]) => {
      const active = (Array.isArray(methodsData) ? methodsData : []).filter((m: WithdrawalMethod) => m.is_active);
      setMethods(active);
      if (pendingData && pendingData.id) setPendingWithdrawal(pendingData);
      if (ruleData) setRuleStatus(ruleData);
      if (settingsData) {
        setContactPhone(settingsData.contact_phone || '');
        setTelegramUsername(settingsData.telegram_username || '');
      }
    }).catch(console.error).finally(() => setLoading(false));
  }, [mounted, router]);

  const doWithdrawal = async (withdrawNum: number) => {
    const userStr = localStorage.getItem('miraclbet_user');
    const user = userStr ? JSON.parse(userStr) : null;
    setIsSubmitting(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/api/v1/withdrawals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user?.id,
          withdrawal_method_id: selectedMethod?.id,
          account_name: accountName,
          account_number: accountNumber,
          amount: withdrawNum,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        if (data?.rule_unfulfilled) { setShowRuleModal(true); throw new Error(data.error || 'Withdrawal rule not met'); }
        if (data?.inviter_code_required) { setShowInviterModal(true); throw new Error(data.error || 'Inviter code verification required'); }
        throw new Error(data?.message || data?.error || 'Failed to submit withdrawal request');
      }
      if (user && user.balance !== undefined) {
        user.balance -= withdrawNum;
        localStorage.setItem('miraclbet_user', JSON.stringify(user));
        window.dispatchEvent(new Event('miraclbet_auth_change'));
      }
      setSuccess(true);
      setTimeout(() => router.push('/'), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!selectedMethod || !amount || !accountName || !accountNumber) {
      setError('Please fill all fields.');
      return;
    }
    const withdrawNum = parseFloat(amount);
    if (isNaN(withdrawNum) || withdrawNum <= 0) {
      setError('Please enter a valid amount.');
      return;
    }
    const userStr = localStorage.getItem('miraclbet_user');
    const user = userStr ? JSON.parse(userStr) : null;
    const currentBalance = Number(user?.balance ?? 0);
    if (!user || currentBalance < withdrawNum) {
      setError('Insufficient balance');
      return;
    }
    // 1. Check deposit requirement first
    if (ruleStatus && !ruleStatus.fulfilled) {
      setShowRuleModal(true);
      return;
    }
    // 2. Check inviter code requirement second (only once deposit requirement is met)
    if (ruleStatus && ruleStatus.inviter_rule_enabled && !ruleStatus.inviter_code_verified) {
      setShowInviterModal(true);
      return;
    }
    await doWithdrawal(withdrawNum);
  };

  const handleVerifyInviterCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviterError('');
    setInviterSuccess('');

    // Max attempts check
    if (inviterAttempts >= MAX_INVITER_ATTEMPTS) {
      setInviterError('Maximum attempts reached. Please contact support.');
      return;
    }

    const code = inviterCodeInput.trim().toUpperCase();
    if (!code) {
      setInviterError('Please enter your inviter code.');
      return;
    }

    const userStr = localStorage.getItem('miraclbet_user');
    const user = userStr ? JSON.parse(userStr) : null;
    if (!user || !user.id) {
      setInviterError('Session expired. Please log in again.');
      return;
    }

    setVerifyingCode(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/api/v1/withdrawals/verify-inviter-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id, code }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        const newAttempts = inviterAttempts + 1;
        setInviterAttempts(newAttempts);
        const remaining = MAX_INVITER_ATTEMPTS - newAttempts;
        if (remaining <= 0) {
          throw new Error('Maximum attempts reached. Please contact support.');
        }
        throw new Error(`Invalid inviter code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`);
      }

      setInviterSuccess('Inviter code verified! Withdrawals unlocked.');
      if (ruleStatus) {
        setRuleStatus({ ...ruleStatus, inviter_code_verified: true });
      }

      const withdrawNum = parseFloat(amount);
      setTimeout(() => {
        setShowInviterModal(false);
        if (selectedMethod && !isNaN(withdrawNum) && withdrawNum > 0 && accountName && accountNumber) {
          doWithdrawal(withdrawNum);
        }
      }, 1000);
    } catch (err: unknown) {
      setInviterError(err instanceof Error ? err.message : 'Invalid inviter code.');
    } finally {
      setVerifyingCode(false);
    }
  };

  const spinStyle = `@keyframes spin{to{transform:rotate(360deg)}} @keyframes shimmer{0%{background-position:0%}100%{background-position:200%}}`;

  // ── LOADING ──
  if (!mounted || loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#F8FAFC', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
        <style>{spinStyle}</style>
        <div style={{ width: '40px', height: '40px', border: '3px solid #E2E8F0', borderTop: '3px solid #F59E0B', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <div style={{ color: '#94A3B8', fontSize: '14px', fontWeight: 500 }}>Loading...</div>
      </div>
    );
  }

  // ── PENDING STATE ──
  if (pendingWithdrawal) {
    return (
      <div style={{ minHeight: '100vh', background: '#F8FAFC', paddingBottom: '80px' }}>
        <style>{spinStyle}</style>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 20px', background: '#FFFFFF', borderBottom: '1px solid #E2E8F0', position: 'sticky', top: '56px', zIndex: 10, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <button onClick={() => router.push('/')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B', padding: '4px', display: 'flex' }}>
            <svg viewBox="0 0 24 24" style={{ width: '22px', height: '22px' }} fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 18l-6-6 6-6" /></svg>
          </button>
          <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0F172A' }}>Withdraw Funds</h1>
        </div>

        <div style={{ padding: '40px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
          <div style={{ width: '96px', height: '96px', borderRadius: '48px', background: 'linear-gradient(135deg, #EFF6FF, #DBEAFE)', border: '3px solid #3B82F6', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px', boxShadow: '0 4px 20px rgba(59,130,246,0.18)' }}>
            <svg viewBox="0 0 24 24" style={{ width: '44px', height: '44px', color: '#2563EB' }} fill="none" stroke="currentColor" strokeWidth="1.8">
              <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <h2 style={{ fontSize: '22px', fontWeight: 900, color: '#0F172A', marginBottom: '10px' }}>Withdrawal Processing</h2>
          <p style={{ color: '#64748B', fontSize: '15px', lineHeight: 1.6, maxWidth: '320px', marginBottom: '32px' }}>
            Your withdrawal request is currently under review by an admin. You can submit another request once this one is completed.
          </p>

          <div style={{ width: '100%', maxWidth: '360px', background: '#FFFFFF', borderRadius: '20px', overflow: 'hidden', border: '1px solid #E2E8F0', boxShadow: '0 4px 20px rgba(0,0,0,0.06)', marginBottom: '24px' }}>
            <div style={{ background: 'linear-gradient(135deg, #EFF6FF, #DBEAFE)', padding: '14px 20px', borderBottom: '1px solid #BFDBFE' }}>
              <span style={{ fontSize: '12px', fontWeight: 800, color: '#1D4ED8', letterSpacing: '0.08em' }}>⏳ PENDING WITHDRAWAL</span>
            </div>
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#64748B', fontSize: '14px' }}>Amount</span>
                <span style={{ color: '#0F172A', fontSize: '22px', fontWeight: 900 }}>{Number(pendingWithdrawal.amount).toFixed(2)} <span style={{ color: '#F59E0B', fontSize: '16px' }}>Br</span></span>
              </div>
              <div style={{ height: '1px', background: '#F1F5F9' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#64748B', fontSize: '14px' }}>Method</span>
                <span style={{ color: '#0F172A', fontSize: '14px', fontWeight: 700 }}>{pendingWithdrawal.provider_name}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#64748B', fontSize: '14px' }}>Account Number</span>
                <span style={{ color: '#0F172A', fontSize: '14px', fontWeight: 700 }}>{pendingWithdrawal.account_number}</span>
              </div>
            </div>
            <div style={{ height: '4px', background: 'linear-gradient(90deg, #3B82F6, #60A5FA, #3B82F6)', backgroundSize: '200%', animation: 'shimmer 2s linear infinite' }} />
          </div>

          {(contactPhone || telegramUsername) && (
            <div style={{ width: '100%', maxWidth: '360px', display: 'flex', gap: '10px' }}>
              {contactPhone && (
                <a href={`tel:${contactPhone}`} style={{ flex: 1, textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', background: '#3B82F6', color: '#FFF', padding: '13px', borderRadius: '12px', fontSize: '14px', fontWeight: 700, boxShadow: '0 2px 10px rgba(59,130,246,0.25)' }}>
                  📞 Call Support
                </a>
              )}
              {telegramUsername && (
                <a href={telegramUsername.startsWith('http') ? telegramUsername : `https://t.me/${telegramUsername.replace('@', '')}`} target="_blank" rel="noopener noreferrer" style={{ flex: 1, textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', background: '#0088CC', color: '#FFF', padding: '13px', borderRadius: '12px', fontSize: '14px', fontWeight: 700, boxShadow: '0 2px 10px rgba(0,136,204,0.25)' }}>
                  ✈️ Telegram
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── SUCCESS ──
  if (success) {
    return (
      <div style={{ minHeight: '100vh', background: '#F8FAFC', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px', textAlign: 'center' }}>
        <style>{spinStyle}</style>
        <div style={{ width: '90px', height: '90px', borderRadius: '45px', background: 'linear-gradient(135deg, #D1FAE5, #A7F3D0)', border: '3px solid #10B981', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px', boxShadow: '0 4px 20px rgba(16,185,129,0.2)' }}>
          <svg viewBox="0 0 24 24" style={{ width: '44px', height: '44px', color: '#059669' }} fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 13l4 4L19 7" /></svg>
        </div>
        <h1 style={{ fontSize: '26px', fontWeight: 900, marginBottom: '12px', color: '#0F172A' }}>Request Submitted!</h1>
        <p style={{ color: '#64748B', fontSize: '15px', lineHeight: 1.6, maxWidth: '300px', marginBottom: '28px' }}>
          Your withdrawal request is being processed. The amount has been deducted from your balance.
        </p>
        <button onClick={() => router.push('/')}
          style={{ width: '100%', maxWidth: '300px', padding: '14px', background: 'linear-gradient(135deg, #F59E0B, #D97706)', color: '#FFF', border: 'none', borderRadius: '14px', fontWeight: 800, fontSize: '15px', cursor: 'pointer', boxShadow: '0 4px 14px rgba(245,158,11,0.3)' }}>
          Return to Home
        </button>
      </div>
    );
  }

  // ── STEP 1: Select Method ──
  if (step === 1) {
    return (
      <div style={{ minHeight: '100vh', background: '#F8FAFC', paddingBottom: '80px' }}>
        <style>{spinStyle}</style>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 20px', background: '#FFFFFF', borderBottom: '1px solid #E2E8F0', position: 'sticky', top: '56px', zIndex: 10, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <button onClick={() => router.push('/')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B', padding: '4px', display: 'flex' }}>
            <svg viewBox="0 0 24 24" style={{ width: '22px', height: '22px' }} fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 18l-6-6 6-6" /></svg>
          </button>
          <div>
            <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0F172A' }}>Withdraw Funds</h1>
            <p style={{ margin: 0, fontSize: '12px', color: '#94A3B8', fontWeight: 500 }}>Step 1 of 2 — Select withdrawal method</p>
          </div>
        </div>

        {/* Progress */}
        <div style={{ height: '4px', background: '#E2E8F0' }}>
          <div style={{ width: '50%', height: '100%', background: 'linear-gradient(90deg, #F59E0B, #FBBF24)', borderRadius: '0 4px 4px 0' }} />
        </div>

        <div style={{ padding: '24px 16px' }}>
          <p style={{ color: '#64748B', fontSize: '14px', marginBottom: '20px', fontWeight: 500 }}>Choose where to receive your money:</p>
          {methods.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '56px 24px', background: '#FFFFFF', borderRadius: '20px', border: '2px dashed #E2E8F0', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
              <div style={{ fontSize: '40px', marginBottom: '16px' }}>💳</div>
              <div style={{ fontSize: '15px', fontWeight: 600, color: '#64748B' }}>No withdrawal methods available</div>
              <div style={{ fontSize: '13px', color: '#94A3B8', marginTop: '6px' }}>Please contact support</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {methods.map(method => (
                <button key={method.id} onClick={() => { setSelectedMethod(method); setStep(2); }}
                  style={{ width: '100%', textAlign: 'left', cursor: 'pointer', padding: '16px 18px', borderRadius: '18px', border: '1.5px solid #E2E8F0', background: '#FFFFFF', display: 'flex', alignItems: 'center', gap: '14px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                  <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: '#FEF9EC', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '1px solid #FDE68A' }}>
                    {method.logo_url ? <img src={method.logo_url} alt={method.provider_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: '24px' }}>💳</span>}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A' }}>{method.provider_name}</div>
                    <div style={{ fontSize: '13px', color: '#94A3B8', marginTop: '3px' }}>Instant transfer</div>
                  </div>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#FEF9EC', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '1px solid #FDE68A' }}>
                    <svg viewBox="0 0 24 24" style={{ width: '18px', height: '18px', color: '#F59E0B' }} fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 18l6-6-6-6" /></svg>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── STEP 2: Enter Account + Amount ──
  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC', paddingBottom: '80px' }}>
      <style>{spinStyle}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 20px', background: '#FFFFFF', borderBottom: '1px solid #E2E8F0', position: 'sticky', top: '56px', zIndex: 10, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
        <button onClick={() => { setStep(1); setError(''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B', padding: '4px', display: 'flex' }}>
          <svg viewBox="0 0 24 24" style={{ width: '22px', height: '22px' }} fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 18l-6-6 6-6" /></svg>
        </button>
        <div>
          <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0F172A' }}>Withdraw Details</h1>
          <p style={{ margin: 0, fontSize: '12px', color: '#94A3B8', fontWeight: 500 }}>Step 2 of 2 — Enter your details</p>
        </div>
      </div>

      {/* Progress full */}
      <div style={{ height: '4px', background: '#E2E8F0' }}>
        <div style={{ width: '100%', height: '100%', background: 'linear-gradient(90deg, #F59E0B, #FBBF24)' }} />
      </div>

      <div style={{ padding: '20px 16px' }}>
        {/* Selected method badge */}
        {selectedMethod && (
          <div style={{ background: '#FFFFFF', borderRadius: '16px', overflow: 'hidden', border: '1px solid #E2E8F0', marginBottom: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 18px' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: '#FEF9EC', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #FDE68A' }}>
                {selectedMethod.logo_url ? <img src={selectedMethod.logo_url} alt={selectedMethod.provider_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: '20px' }}>💳</span>}
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#94A3B8', fontWeight: 600 }}>Selected Method</div>
                <div style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A' }}>{selectedMethod.provider_name}</div>
              </div>
              <div style={{ marginLeft: 'auto' }}>
                <span style={{ background: '#D1FAE5', color: '#059669', fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '20px' }}>Selected ✓</span>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {error && (
            <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '10px', padding: '12px 14px', fontSize: '14px', color: '#DC2626', fontWeight: 600 }}>{error}</div>
          )}

          {/* Amount */}
          <div style={{ background: '#FFFFFF', borderRadius: '16px', border: '1px solid #E2E8F0', padding: '16px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#64748B', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Amount (Br)</label>
            <div style={{ position: 'relative' }}>
              <input
                type="number"
                min="10"
                step="any"
                inputMode="decimal"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                required
                placeholder="0.00"
                style={{ width: '100%', padding: '14px 56px 14px 16px', borderRadius: '12px', background: '#F8FAFC', border: '1.5px solid #E2E8F0', color: '#0F172A', fontSize: '22px', fontWeight: 900, outline: 'none', boxSizing: 'border-box' }}
              />
              <span style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', fontSize: '16px', fontWeight: 800, color: '#F59E0B' }}>Br</span>
            </div>
          </div>

          {/* Account Name */}
          <div style={{ background: '#FFFFFF', borderRadius: '16px', border: '1px solid #E2E8F0', padding: '16px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#64748B', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Account Name</label>
            <input
              type="text"
              value={accountName}
              onChange={e => setAccountName(e.target.value)}
              required
              placeholder="Account Holder Name"
              style={{ width: '100%', padding: '14px 16px', borderRadius: '12px', background: '#F8FAFC', border: '1.5px solid #E2E8F0', color: '#0F172A', fontSize: '16px', fontWeight: 600, outline: 'none', boxSizing: 'border-box' }}
            />
          </div>

          {/* Account Number */}
          <div style={{ background: '#FFFFFF', borderRadius: '16px', border: '1px solid #E2E8F0', padding: '16px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#64748B', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Account Number / Phone</label>
            <input
              type="tel"
              inputMode="numeric"
              pattern="[0-9]*"
              value={accountNumber}
              onChange={e => setAccountNumber(e.target.value.replace(/\D/g, ''))}
              required
              placeholder="1000123456789"
              style={{ width: '100%', padding: '14px 16px', borderRadius: '12px', background: '#F8FAFC', border: '1.5px solid #E2E8F0', color: '#0F172A', fontSize: '16px', fontWeight: 600, outline: 'none', boxSizing: 'border-box' }}
            />
          </div>

          {/* Submit */}
          <button type="submit" disabled={isSubmitting || !amount || !accountName || !accountNumber}
            style={{ width: '100%', padding: '18px', background: isSubmitting || !amount || !accountName || !accountNumber ? '#E2E8F0' : 'linear-gradient(135deg, #F59E0B, #D97706)', color: isSubmitting || !amount || !accountName || !accountNumber ? '#94A3B8' : '#FFFFFF', border: 'none', borderRadius: '16px', fontSize: '16px', fontWeight: 900, cursor: isSubmitting || !amount || !accountName || !accountNumber ? 'not-allowed' : 'pointer', boxShadow: isSubmitting || !amount || !accountName || !accountNumber ? 'none' : '0 4px 16px rgba(245,158,11,0.35)' }}>
            {isSubmitting ? (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                <div style={{ width: '18px', height: '18px', border: '2.5px solid rgba(255,255,255,0.3)', borderTop: '2.5px solid #FFF', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                Processing...
              </span>
            ) : '→ Withdraw'}
          </button>
        </form>
      </div>

      {/* RULE POPUP MODAL */}
      {showRuleModal && ruleStatus && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: '#FFFFFF', borderRadius: '24px', maxWidth: '380px', width: '100%', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
            {/* Modal header */}
            <div style={{ background: 'linear-gradient(135deg, #FEF3C7, #FDE68A)', padding: '24px 20px', textAlign: 'center', borderBottom: '1px solid #FDE68A' }}>
              <div style={{ fontSize: '48px', marginBottom: '8px' }}>🔒</div>
              <h3 style={{ fontSize: '18px', fontWeight: 900, color: '#92400E', margin: 0 }}>
                {ruleStatus.rule_title || 'Withdrawal Rule'}
              </h3>
            </div>

            {/* Modal body */}
            <div style={{ padding: '20px' }}>
              <p style={{ color: '#64748B', fontSize: '14px', lineHeight: 1.6, margin: '0 0 16px 0', textAlign: 'center' }}>
                {(() => {
                  const amtStr = `${Number(ruleStatus.required_deposit).toLocaleString()} Br`;
                  let msg = ruleStatus.rule_message || `Before making a withdrawal, your account must reach a total deposit history of at least ${amtStr}. Please make a deposit to fulfill the requirement and activate withdrawals.`;
                  return msg
                    .replace(/7,?500(?:\.00)?\s*(?:Br)?/gi, amtStr)
                    .replace(/\{amount\}/gi, amtStr);
                })()}
              </p>

              {/* Stats */}
              <div style={{ background: '#F8FAFC', borderRadius: '14px', border: '1px solid #E2E8F0', overflow: 'hidden', marginBottom: '18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid #E2E8F0' }}>
                  <span style={{ color: '#64748B', fontSize: '13px', fontWeight: 600 }}>Your Total Deposits</span>
                  <span style={{ color: '#10B981', fontSize: '14px', fontWeight: 800 }}>{ruleStatus.total_deposited.toFixed(2)} Br</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid #E2E8F0' }}>
                  <span style={{ color: '#64748B', fontSize: '13px', fontWeight: 600 }}>Required Deposit</span>
                  <span style={{ color: '#F59E0B', fontSize: '14px', fontWeight: 800 }}>{ruleStatus.required_deposit.toFixed(2)} Br</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: '#FEF2F2' }}>
                  <span style={{ color: '#DC2626', fontSize: '13px', fontWeight: 700 }}>Remaining to Fulfill</span>
                  <span style={{ color: '#DC2626', fontSize: '14px', fontWeight: 900 }}>{ruleStatus.remaining.toFixed(2)} Br</span>
                </div>
              </div>

              {/* Buttons */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <button onClick={() => router.push('/deposit')}
                  style={{ width: '100%', padding: '14px', background: 'linear-gradient(135deg, #10B981, #059669)', color: '#FFFFFF', border: 'none', borderRadius: '12px', fontWeight: 800, fontSize: '15px', cursor: 'pointer', boxShadow: '0 4px 14px rgba(16,185,129,0.3)' }}>
                  Deposit Now ({ruleStatus.remaining.toFixed(0)} Br Needed)
                </button>
                <button onClick={() => setShowRuleModal(false)}
                  style={{ width: '100%', padding: '12px', background: '#F1F5F9', color: '#64748B', border: '1px solid #E2E8F0', borderRadius: '12px', fontWeight: 600, fontSize: '14px', cursor: 'pointer' }}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* INVITER CODE MODAL */}
      {showInviterModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(15,23,42,0.65)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: '#FFFFFF', borderRadius: '24px', maxWidth: '380px', width: '100%', overflow: 'hidden', boxShadow: '0 25px 70px rgba(0,0,0,0.3)' }}>

            {/* Header — just icon + title, nothing else */}
            <div style={{ background: 'linear-gradient(135deg, #7C3AED 0%, #4F46E5 100%)', padding: '28px 20px 24px', textAlign: 'center', color: '#FFFFFF' }}>
              <div style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: '60px', height: '60px', borderRadius: '18px',
                background: 'rgba(255,255,255,0.18)',
                fontSize: '30px', marginBottom: '14px',
                border: '1px solid rgba(255,255,255,0.25)',
              }}>
                🎟️
              </div>
              <h3 style={{ fontSize: '20px', fontWeight: 900, margin: 0, letterSpacing: '-0.02em' }}>
                Enter Inviter Code
              </h3>
            </div>

            {/* Body */}
            <div style={{ padding: '22px' }}>
              <form onSubmit={handleVerifyInviterCode}>
                {/* Input */}
                <div style={{ marginBottom: '18px' }}>
                  <input
                    type="text"
                    maxLength={12}
                    value={inviterCodeInput}
                    onChange={e => setInviterCodeInput(e.target.value.toUpperCase())}
                    placeholder="e.g. INV839201"
                    required
                    autoFocus
                    disabled={inviterAttempts >= MAX_INVITER_ATTEMPTS}
                    style={{
                      width: '100%', padding: '16px', borderRadius: '14px',
                      background: inviterAttempts >= MAX_INVITER_ATTEMPTS ? '#F3F4F6' : '#F9FAFB',
                      border: `2px solid ${inviterAttempts >= MAX_INVITER_ATTEMPTS ? '#E5E7EB' : '#8B5CF6'}`,
                      color: '#111827', fontSize: '22px', fontWeight: 900,
                      textAlign: 'center', letterSpacing: '4px', fontFamily: 'monospace',
                      outline: 'none', boxSizing: 'border-box',
                    }}
                  />
                  {/* Attempt counter — only show after first wrong attempt */}
                  {inviterAttempts > 0 && inviterAttempts < MAX_INVITER_ATTEMPTS && (
                    <div style={{ textAlign: 'center', marginTop: '6px', fontSize: '12px', color: '#F59E0B', fontWeight: 700 }}>
                      {MAX_INVITER_ATTEMPTS - inviterAttempts} attempt{MAX_INVITER_ATTEMPTS - inviterAttempts === 1 ? '' : 's'} remaining
                    </div>
                  )}
                </div>

                {/* Error */}
                {inviterError && (
                  <div style={{
                    marginBottom: '14px', padding: '10px 14px', background: '#FEF2F2',
                    border: '1px solid #FECACA', borderRadius: '10px', color: '#DC2626',
                    fontSize: '13px', fontWeight: 700, textAlign: 'center',
                  }}>
                    ⚠️ {inviterError}
                  </div>
                )}

                {/* Success */}
                {inviterSuccess && (
                  <div style={{
                    marginBottom: '14px', padding: '10px 14px', background: '#ECFDF5',
                    border: '1px solid #A7F3D0', borderRadius: '10px', color: '#059669',
                    fontSize: '13px', fontWeight: 700, textAlign: 'center',
                  }}>
                    ✓ {inviterSuccess}
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <button
                    type="submit"
                    disabled={verifyingCode || !inviterCodeInput.trim() || inviterAttempts >= MAX_INVITER_ATTEMPTS}
                    style={{
                      width: '100%', padding: '15px',
                      background: (verifyingCode || !inviterCodeInput.trim() || inviterAttempts >= MAX_INVITER_ATTEMPTS)
                        ? '#E2E8F0'
                        : 'linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)',
                      color: (verifyingCode || !inviterCodeInput.trim() || inviterAttempts >= MAX_INVITER_ATTEMPTS) ? '#94A3B8' : '#FFFFFF',
                      border: 'none', borderRadius: '13px', fontSize: '15px', fontWeight: 800,
                      cursor: (verifyingCode || !inviterCodeInput.trim() || inviterAttempts >= MAX_INVITER_ATTEMPTS) ? 'not-allowed' : 'pointer',
                      boxShadow: (verifyingCode || !inviterCodeInput.trim() || inviterAttempts >= MAX_INVITER_ATTEMPTS) ? 'none' : '0 4px 14px rgba(124, 58, 237, 0.35)',
                    }}
                  >
                    {verifyingCode ? 'Verifying...' : '🔓 Verify & Unlock Withdrawal'}
                  </button>

                  <button
                    type="button"
                    onClick={() => { setShowInviterModal(false); setInviterError(''); }}
                    style={{
                      width: '100%', padding: '12px', background: '#F1F5F9', color: '#64748B',
                      border: '1px solid #E2E8F0', borderRadius: '13px', fontWeight: 600,
                      fontSize: '14px', cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

