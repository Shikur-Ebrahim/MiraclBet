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
};

export default function WithdrawPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [methods, setMethods] = useState<WithdrawalMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingWithdrawal, setPendingWithdrawal] = useState<PendingWithdrawal | null>(null);
  const [ruleStatus, setRuleStatus] = useState<WithdrawalRuleStatus | null>(null);
  const [showRuleModal, setShowRuleModal] = useState(false);

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
      if (pendingData && pendingData.id) {
        setPendingWithdrawal(pendingData);
      }
      if (ruleData) {
        setRuleStatus(ruleData);
      }
      if (settingsData) {
        setContactPhone(settingsData.contact_phone || '');
        setTelegramUsername(settingsData.telegram_username || '');
      }
    }).catch(console.error).finally(() => setLoading(false));
  }, [mounted, router]);

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

    // PRIORITY 1: Check user balance FIRST!
    // If user has 0 or less balance than withdrawal amount, show Insufficient balance
    const currentBalance = Number(user?.balance ?? 0);
    if (!user || currentBalance < withdrawNum) {
      setError('Insufficient balance');
      return;
    }

    // PRIORITY 2: If user has enough balance, THEN check the withdrawal rule!
    if (ruleStatus && !ruleStatus.fulfilled) {
      setShowRuleModal(true);
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/api/v1/withdrawals`, {
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user?.id,
          withdrawal_method_id: selectedMethod.id,
          account_name: accountName,
          account_number: accountNumber,
          amount: withdrawNum
        })
      });
      
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        if (data?.rule_unfulfilled) {
          setShowRuleModal(true);
          throw new Error(data.error || 'Withdrawal rule requirement not met');
        }
        throw new Error(data?.message || data?.error || (typeof data === 'string' ? data : 'Failed to submit withdrawal request'));
      }
      
      // Update local storage balance preemptively
      if (user && user.balance !== undefined) {
        user.balance -= withdrawNum;
        localStorage.setItem('miraclbet_user', JSON.stringify(user));
        window.dispatchEvent(new Event('miraclbet_auth_change'));
      }

      setSuccess(true);
      setTimeout(() => router.push('/'), 3000);
    } catch (err: any) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setIsSubmitting(false);
    }
  };

  if (!mounted || loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid #1E293B', borderTop: '3px solid #F5A623', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <div style={{ color: '#6B7280', fontSize: '14px' }}>Loading...</div>
      </div>
    );
  }

  // ── PENDING STATE ──
  if (pendingWithdrawal) {
    return (
      <div style={{ minHeight: '100vh', paddingBottom: '80px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', borderBottom: '1px solid #1E293B', background: '#0A0E1A', position: 'sticky', top: '56px', zIndex: 10 }}>
          <button onClick={() => router.push('/')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', padding: '4px' }}>
            <svg viewBox="0 0 24 24" style={{ width: '22px', height: '22px' }} fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 18l-6-6 6-6" /></svg>
          </button>
          <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#FFF' }}>Withdraw Funds</h1>
        </div>
        <div style={{ padding: '32px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
          <div style={{ width: '100px', height: '100px', borderRadius: '50px', background: 'rgba(59,130,246,0.1)', border: '2px solid rgba(59,130,246,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px' }}>
            <svg viewBox="0 0 24 24" style={{ width: '48px', height: '48px', color: '#3B82F6' }} fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
          </div>
          <h2 style={{ fontSize: '22px', fontWeight: 900, color: '#FFF', marginBottom: '8px' }}>Withdrawal Processing</h2>
          <p style={{ color: '#9CA3AF', fontSize: '14px', lineHeight: 1.6, maxWidth: '320px', marginBottom: '24px' }}>
            Your withdrawal request is currently under review by an admin. You can submit another request once this one is completed.
          </p>

          <div style={{ width: '100%', maxWidth: '340px', background: '#111827', borderRadius: '20px', overflow: 'hidden', border: '1px solid #1E293B', marginBottom: '24px' }}>
            <div style={{ background: 'rgba(59,130,246,0.08)', padding: '12px 16px', borderBottom: '1px solid #1E293B' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#3B82F6', letterSpacing: '0.05em' }}>PENDING WITHDRAWAL</span>
            </div>
            <div style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#6B7280', fontSize: '14px' }}>Amount</span>
                <span style={{ color: '#FFF', fontSize: '20px', fontWeight: 900 }}>{Number(pendingWithdrawal.amount).toFixed(2)} <span style={{ color: '#F5A623' }}>Br</span></span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#6B7280', fontSize: '14px' }}>Method</span>
                <span style={{ color: '#FFF', fontSize: '14px', fontWeight: 700 }}>{pendingWithdrawal.provider_name}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#6B7280', fontSize: '14px' }}>Account Number</span>
                <span style={{ color: '#FFF', fontSize: '14px', fontWeight: 700 }}>{pendingWithdrawal.account_number}</span>
              </div>
            </div>
            <div style={{ height: '4px', background: 'linear-gradient(90deg, #3B82F6, #60A5FA, #3B82F6)', backgroundSize: '200% 100%', animation: 'pulse 2s ease infinite' }} />
          </div>

          {(contactPhone || telegramUsername) && (
            <div style={{ width: '100%', maxWidth: '340px', display: 'flex', gap: '10px' }}>
              {contactPhone && (
                <a href={`tel:${contactPhone}`} style={{ flex: 1, textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', background: '#3B82F6', color: '#FFF', padding: '12px', borderRadius: '10px', fontSize: '14px', fontWeight: 700 }}>
                  Call Support
                </a>
              )}
              {telegramUsername && (
                <a href={telegramUsername.startsWith('http') ? telegramUsername : `https://t.me/${telegramUsername.replace('@', '')}`} target="_blank" rel="noopener noreferrer" style={{ flex: 1, textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', background: '#0088cc', color: '#FFF', padding: '12px', borderRadius: '10px', fontSize: '14px', fontWeight: 700 }}>
                  Telegram Support
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
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px', textAlign: 'center' }}>
        <div style={{ width: '90px', height: '90px', borderRadius: '45px', background: 'rgba(25, 230, 107, 0.12)', border: '2px solid rgba(25,230,107,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px' }}>
          <svg viewBox="0 0 24 24" style={{ width: '44px', height: '44px', color: '#19E66B' }} fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 13l4 4L19 7" /></svg>
        </div>
        <h1 style={{ fontSize: '26px', fontWeight: 900, marginBottom: '12px', color: '#FFF' }}>Request Submitted!</h1>
        <p style={{ color: '#9CA3AF', fontSize: '15px', lineHeight: 1.6, maxWidth: '300px', marginBottom: '24px' }}>
          Your withdrawal request is being processed. The amount has been deducted from your balance.
        </p>
        <button 
          onClick={() => router.push('/')}
          style={{ width: '100%', maxWidth: '300px', padding: '14px', background: '#F5A623', color: '#000', border: 'none', borderRadius: '12px', fontWeight: 800, fontSize: '15px', cursor: 'pointer' }}
        >
          Return to Home
        </button>
      </div>
    );
  }

  // ── STEP 1: Select Method ──
  if (step === 1) {
    return (
      <div style={{ minHeight: '100vh', paddingBottom: '80px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', borderBottom: '1px solid #1E293B', position: 'sticky', top: '56px', zIndex: 10, background: '#0A0E1A' }}>
          <button onClick={() => router.push('/')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', padding: '4px' }}>
            <svg viewBox="0 0 24 24" style={{ width: '22px', height: '22px' }} fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 18l-6-6 6-6" /></svg>
          </button>
          <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#FFF' }}>Withdraw Funds</h1>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', padding: '20px 20px 8px' }}>
          <div style={{ flex: 1, height: '3px', borderRadius: '2px', background: '#F5A623' }} />
          <div style={{ width: '8px', height: '8px', borderRadius: '4px', background: '#F5A623', margin: '0 4px' }} />
          <div style={{ flex: 1, height: '3px', borderRadius: '2px', background: '#1E293B' }} />
          <div style={{ fontSize: '11px', color: '#6B7280', marginLeft: '8px', fontWeight: 600 }}>STEP 1/2</div>
        </div>

        <div style={{ padding: '12px 16px 24px' }}>
          <p style={{ color: '#9CA3AF', fontSize: '14px', marginBottom: '20px' }}>Choose where to receive your money:</p>
          {methods.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 24px', color: '#6B7280', background: '#111827', borderRadius: '16px', border: '1px dashed #1E293B' }}>
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>💳</div>
              <div style={{ fontSize: '15px' }}>No withdrawal methods available</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {methods.map(method => (
                <button key={method.id} onClick={() => { setSelectedMethod(method); setStep(2); }}
                  style={{ width: '100%', textAlign: 'left', cursor: 'pointer', padding: '16px', borderRadius: '16px', border: '1.5px solid #1E293B', background: '#111827', display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{ width: '52px', height: '52px', borderRadius: '14px', background: '#1A2235', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '1px solid #1E293B' }}>
                    {method.logo_url ? <img src={method.logo_url} alt={method.provider_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: '22px' }}>💳</span>}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '16px', fontWeight: 800, color: '#FFF' }}>{method.provider_name}</div>
                  </div>
                  <svg viewBox="0 0 24 24" style={{ width: '20px', height: '20px', color: '#374151', flexShrink: 0 }} fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 18l6-6-6-6" /></svg>
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
    <div style={{ minHeight: '100vh', paddingBottom: '80px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', borderBottom: '1px solid #1E293B', position: 'sticky', top: '56px', zIndex: 10, background: '#0A0E1A' }}>
        <button onClick={() => { setStep(1); setError(''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', padding: '4px' }}>
          <svg viewBox="0 0 24 24" style={{ width: '22px', height: '22px' }} fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 18l-6-6 6-6" /></svg>
        </button>
        <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#FFF' }}>Withdraw Details</h1>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', padding: '20px 20px 8px' }}>
        <div style={{ flex: 1, height: '3px', borderRadius: '2px', background: '#F5A623' }} />
        <div style={{ width: '8px', height: '8px', borderRadius: '4px', background: '#F5A623', margin: '0 4px' }} />
        <div style={{ flex: 1, height: '3px', borderRadius: '2px', background: '#F5A623' }} />
        <div style={{ fontSize: '11px', color: '#F5A623', marginLeft: '8px', fontWeight: 600 }}>STEP 2/2</div>
      </div>

      <div style={{ padding: '12px 16px' }}>
        {selectedMethod && (
          <div style={{ background: '#111827', borderRadius: '16px', overflow: 'hidden', border: '1px solid #1E293B', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: '#1A2235', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #1E293B' }}>
                {selectedMethod.logo_url ? <img src={selectedMethod.logo_url} alt={selectedMethod.provider_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: '20px' }}>💳</span>}
              </div>
              <div>
                <div style={{ fontSize: '13px', color: '#6B7280' }}>Selected Method</div>
                <div style={{ fontSize: '15px', fontWeight: 800, color: '#FFF' }}>{selectedMethod.provider_name}</div>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {error && (
            <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '10px', padding: '12px 14px', fontSize: '14px', color: '#F87171' }}>{error}</div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#D1D5DB', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Amount (Br)</label>
            <div style={{ position: 'relative' }}>
              <input type="number" min="10" step="any" value={amount} onChange={e => setAmount(e.target.value)} required placeholder="0.00"
                style={{ width: '100%', padding: '16px 50px 16px 16px', borderRadius: '14px', background: '#111827', border: '1.5px solid #1E293B', color: '#FFF', fontSize: '20px', fontWeight: 800, outline: 'none', boxSizing: 'border-box' }} />
              <span style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', fontSize: '16px', fontWeight: 700, color: '#F5A623' }}>Br</span>
            </div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
              {[100, 200, 500, 1000].map(q => (
                <button key={q} type="button" onClick={() => setAmount(String(q))} style={{ flex: 1, padding: '8px 0', borderRadius: '8px', fontSize: '13px', fontWeight: 700, background: amount === String(q) ? 'rgba(245,166,35,0.15)' : '#111827', border: `1px solid ${amount === String(q) ? '#F5A623' : '#1E293B'}`, color: amount === String(q) ? '#F5A623' : '#6B7280', cursor: 'pointer' }}>
                  {q}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#D1D5DB', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Account Name</label>
            <input type="text" value={accountName} onChange={e => setAccountName(e.target.value)} required placeholder="Account Holder Name"
              style={{ width: '100%', padding: '16px', borderRadius: '14px', background: '#111827', border: '1.5px solid #1E293B', color: '#FFF', fontSize: '16px', fontWeight: 600, outline: 'none', boxSizing: 'border-box' }} />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#D1D5DB', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Account Number / Phone</label>
            <input type="text" value={accountNumber} onChange={e => setAccountNumber(e.target.value)} required placeholder="1000123456789"
              style={{ width: '100%', padding: '16px', borderRadius: '14px', background: '#111827', border: '1.5px solid #1E293B', color: '#FFF', fontSize: '16px', fontWeight: 600, outline: 'none', boxSizing: 'border-box' }} />
          </div>

          <button type="submit" disabled={isSubmitting || !amount || !accountName || !accountNumber}
            style={{ width: '100%', padding: '18px', background: isSubmitting || !amount || !accountName || !accountNumber ? '#1E293B' : '#F5A623', color: isSubmitting || !amount || !accountName || !accountNumber ? '#4B5563' : '#000', border: 'none', borderRadius: '14px', fontSize: '16px', fontWeight: 900, cursor: isSubmitting || !amount || !accountName || !accountNumber ? 'not-allowed' : 'pointer', transition: 'all 0.2s', marginTop: '10px' }}>
            {isSubmitting ? 'Processing...' : 'Withdraw'}
          </button>
        </form>
      </div>

      {/* ATTRACTIVE RULE POPUP MODAL - ONLY APPEARS WHEN USER HAS BALANCE AND CLICKS WITHDRAW */}
      {showRuleModal && ruleStatus && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(0, 0, 0, 0.85)', backdropFilter: 'blur(5px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
        }}>
          <div style={{
            background: '#111827', border: '1.5px solid #F5A623',
            borderRadius: '24px', maxWidth: '380px', width: '100%',
            padding: '28px 20px', textAlign: 'center', boxShadow: '0 10px 40px rgba(0,0,0,0.7)',
            position: 'relative'
          }}>
            <div style={{ width: '68px', height: '68px', borderRadius: '34px', background: 'rgba(245, 166, 35, 0.15)', border: '2px solid rgba(245, 166, 35, 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto' }}>
              <span style={{ fontSize: '30px' }}>🔒</span>
            </div>
            <h3 style={{ fontSize: '20px', fontWeight: 900, color: '#FFFFFF', margin: '0 0 10px 0' }}>
              {ruleStatus.rule_title || 'Withdrawal Rule Requirement'}
            </h3>
            <p style={{ color: '#9CA3AF', fontSize: '14px', lineHeight: 1.5, margin: '0 0 20px 0' }}>
              {ruleStatus.rule_message || `Before making a withdrawal, your account must reach a total deposit history of at least ${ruleStatus.required_deposit.toLocaleString()} Br.`}
            </p>

            <div style={{ background: '#0A0E1A', padding: '14px 16px', borderRadius: '14px', border: '1px solid #1E293B', marginBottom: '22px', textAlign: 'left' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '8px' }}>
                <span style={{ color: '#9CA3AF' }}>Your Total Deposits:</span>
                <span style={{ color: '#10B981', fontWeight: 700 }}>{ruleStatus.total_deposited.toFixed(2)} Br</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '8px' }}>
                <span style={{ color: '#9CA3AF' }}>Required Deposit:</span>
                <span style={{ color: '#F5A623', fontWeight: 700 }}>{ruleStatus.required_deposit.toFixed(2)} Br</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', borderTop: '1px solid #1E293B', paddingTop: '8px' }}>
                <span style={{ color: '#F87171', fontWeight: 600 }}>Remaining to Fulfill:</span>
                <span style={{ color: '#F87171', fontWeight: 800 }}>{ruleStatus.remaining.toFixed(2)} Br</span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                type="button"
                onClick={() => router.push('/deposit')}
                style={{
                  width: '100%', padding: '14px', background: '#F5A623',
                  color: '#000000', border: 'none', borderRadius: '12px',
                  fontWeight: 800, fontSize: '15px', cursor: 'pointer',
                  boxShadow: '0 2px 10px rgba(245,166,35,0.3)'
                }}
              >
                Deposit Now ({ruleStatus.remaining.toFixed(0)} Br Needed)
              </button>
              <button
                type="button"
                onClick={() => setShowRuleModal(false)}
                style={{
                  width: '100%', padding: '12px', background: 'transparent',
                  color: '#9CA3AF', border: '1px solid #1E293B', borderRadius: '12px',
                  fontWeight: 600, fontSize: '14px', cursor: 'pointer'
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
