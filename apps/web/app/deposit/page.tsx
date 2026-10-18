'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';

type PaymentMethod = {
  id: string;
  provider_name: string;
  account_name: string;
  account_number: string;
  logo_url: string | null;
  is_active: boolean;
  min_deposit: number;
};

type PendingDeposit = {
  id: string;
  amount: number;
  provider_name: string;
  created_at: string;
};

function CopyIcon() {
  return (
    <svg viewBox="0 0 24 24" style={{ width: '15px', height: '15px' }} fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" style={{ width: '15px', height: '15px' }} fill="none" stroke="#16A34A" strokeWidth="3">
      <path d="M5 13l4 4L19 7" />
    </svg>
  );
}

export default function DepositPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingDeposit, setPendingDeposit] = useState<PendingDeposit | null>(null);

  const [step, setStep] = useState(1);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [amount, setAmount] = useState('');
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!mounted) return;
    const userStr = localStorage.getItem('miraclbet_user');
    if (!userStr) { router.push('/login?redirect=/deposit'); return; }
    const user = JSON.parse(userStr);
    const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
    Promise.all([
      fetch(`${API}/api/v1/payment-methods`).then(r => r.json()),
      fetch(`${API}/api/v1/deposits/pending?user_id=${user.id}`).then(r => r.json()).catch(() => null),
    ]).then(([methodsData, pendingData]) => {
      const active = (Array.isArray(methodsData) ? methodsData : []).filter((m: PaymentMethod) => m.is_active);
      setMethods(active);
      if (pendingData && pendingData.id) setPendingDeposit(pendingData);
    }).catch(console.error).finally(() => setLoading(false));
  }, [mounted, router]);

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setScreenshotFile(file);
      setScreenshotPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMethod || !amount || !screenshotFile) {
      setError('Please fill all fields and upload a screenshot.');
      return;
    }
    const minAmount = selectedMethod.min_deposit || 450;
    if (parseFloat(amount) < minAmount) {
      setError(`Minimum deposit amount is ${minAmount} Br.`);
      return;
    }
    setError('');
    setIsSubmitting(true);
    const userStr = localStorage.getItem('miraclbet_user');
    const user = userStr ? JSON.parse(userStr) : null;
    const formData = new FormData();
    formData.append('user_id', user?.id || '');
    formData.append('payment_method_id', selectedMethod.id);
    formData.append('amount', amount);
    formData.append('screenshot', screenshotFile);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/api/v1/deposits`, {
        method: 'POST', body: formData,
      });
      if (!res.ok) throw new Error('Failed to submit');
      setSuccess(true);
      setTimeout(() => router.push('/'), 3500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setIsSubmitting(false);
    }
  };

  const spinStyle = `@keyframes spin{to{transform:rotate(360deg)}} @keyframes shimmer{0%{background-position:0%}100%{background-position:200%}}`;

  // ── LOADING ──
  if (!mounted || loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#F8FAFC', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
        <style>{spinStyle}</style>
        <div style={{ width: '40px', height: '40px', border: '3px solid #E2E8F0', borderTop: '3px solid #10B981', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <div style={{ color: '#94A3B8', fontSize: '14px', fontWeight: 500 }}>Loading...</div>
      </div>
    );
  }

  // ── PENDING STATE ──
  if (pendingDeposit) {
    return (
      <div style={{ minHeight: '100vh', background: '#F8FAFC', paddingBottom: '80px' }}>
        <style>{spinStyle}</style>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 20px', background: '#FFFFFF', borderBottom: '1px solid #E2E8F0', position: 'sticky', top: '56px', zIndex: 10, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <button onClick={() => router.push('/')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B', padding: '4px', display: 'flex' }}>
            <svg viewBox="0 0 24 24" style={{ width: '22px', height: '22px' }} fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 18l-6-6 6-6" /></svg>
          </button>
          <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0F172A' }}>Deposit</h1>
        </div>

        <div style={{ padding: '40px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
          <div style={{ width: '96px', height: '96px', borderRadius: '48px', background: 'linear-gradient(135deg, #FEF3C7, #FDE68A)', border: '3px solid #F59E0B', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px', boxShadow: '0 4px 20px rgba(245,158,11,0.2)' }}>
            <svg viewBox="0 0 24 24" style={{ width: '44px', height: '44px', color: '#D97706' }} fill="none" stroke="currentColor" strokeWidth="1.8">
              <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <h2 style={{ fontSize: '22px', fontWeight: 900, color: '#0F172A', marginBottom: '10px' }}>Deposit Processing</h2>
          <p style={{ color: '#64748B', fontSize: '15px', lineHeight: 1.6, maxWidth: '300px', marginBottom: '32px' }}>
            Your deposit is being reviewed by an admin. You cannot submit another deposit until this one is verified.
          </p>
          <div style={{ width: '100%', maxWidth: '360px', background: '#FFFFFF', borderRadius: '20px', overflow: 'hidden', border: '1px solid #E2E8F0', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
            <div style={{ background: 'linear-gradient(135deg, #FFFBEB, #FEF3C7)', padding: '14px 20px', borderBottom: '1px solid #FDE68A' }}>
              <span style={{ fontSize: '12px', fontWeight: 800, color: '#92400E', letterSpacing: '0.08em' }}>⏳ PENDING DEPOSIT</span>
            </div>
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#64748B', fontSize: '14px' }}>Amount</span>
                <span style={{ color: '#0F172A', fontSize: '22px', fontWeight: 900 }}>{Number(pendingDeposit.amount).toFixed(2)} <span style={{ color: '#F59E0B', fontSize: '16px' }}>Br</span></span>
              </div>
              <div style={{ height: '1px', background: '#F1F5F9' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#64748B', fontSize: '14px' }}>Method</span>
                <span style={{ color: '#0F172A', fontSize: '14px', fontWeight: 700 }}>{pendingDeposit.provider_name}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#64748B', fontSize: '14px' }}>Submitted</span>
                <span style={{ color: '#94A3B8', fontSize: '13px' }}>{new Date(pendingDeposit.created_at).toLocaleString()}</span>
              </div>
            </div>
            <div style={{ height: '4px', background: 'linear-gradient(90deg, #F59E0B, #FBBF24, #F59E0B)', backgroundSize: '200%', animation: 'shimmer 2s linear infinite' }} />
          </div>
          <p style={{ color: '#94A3B8', fontSize: '13px', marginTop: '20px' }}>Your balance will update automatically once approved.</p>
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
        <h1 style={{ fontSize: '26px', fontWeight: 900, marginBottom: '12px', color: '#0F172A' }}>Deposit Submitted!</h1>
        <p style={{ color: '#64748B', fontSize: '15px', lineHeight: 1.6, maxWidth: '300px' }}>
          Your deposit request has been sent. An admin will verify it shortly and your balance will be updated automatically.
        </p>
        <div style={{ marginTop: '24px', display: 'flex', gap: '8px', alignItems: 'center', color: '#94A3B8', fontSize: '13px' }}>
          <div style={{ width: '18px', height: '18px', border: '2px solid #10B981', borderTop: '2px solid transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          Redirecting to home...
        </div>
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
            <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0F172A' }}>Deposit Funds</h1>
            <p style={{ margin: 0, fontSize: '12px', color: '#94A3B8', fontWeight: 500 }}>Step 1 of 2 — Select payment method</p>
          </div>
        </div>

        {/* Progress */}
        <div style={{ height: '4px', background: '#E2E8F0' }}>
          <div style={{ width: '50%', height: '100%', background: 'linear-gradient(90deg, #10B981, #34D399)', borderRadius: '0 4px 4px 0' }} />
        </div>

        <div style={{ padding: '24px 16px' }}>
          <p style={{ color: '#64748B', fontSize: '14px', marginBottom: '20px', fontWeight: 500 }}>Choose where to send your money:</p>
          {methods.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '56px 24px', background: '#FFFFFF', borderRadius: '20px', border: '2px dashed #E2E8F0', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
              <div style={{ fontSize: '40px', marginBottom: '16px' }}>🏦</div>
              <div style={{ fontSize: '15px', fontWeight: 600, color: '#64748B' }}>No payment methods available</div>
              <div style={{ fontSize: '13px', color: '#94A3B8', marginTop: '6px' }}>Please contact support</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {methods.map(method => (
                <button key={method.id} onClick={() => { setSelectedMethod(method); setStep(2); }}
                  style={{ width: '100%', textAlign: 'left', cursor: 'pointer', padding: '16px 18px', borderRadius: '18px', border: '1.5px solid #E2E8F0', background: '#FFFFFF', display: 'flex', alignItems: 'center', gap: '14px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                  <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: '#F1F5F9', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '1px solid #E2E8F0' }}>
                    {method.logo_url ? <img src={method.logo_url} alt={method.provider_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: '24px' }}>🏦</span>}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', marginBottom: '3px' }}>{method.provider_name}</div>
                    <div style={{ fontSize: '13px', color: '#94A3B8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{method.account_name}</div>
                    <div style={{ fontSize: '12px', color: '#10B981', fontWeight: 700, marginTop: '2px' }}>Min: {method.min_deposit || 450} Br</div>
                  </div>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg viewBox="0 0 24 24" style={{ width: '18px', height: '18px', color: '#94A3B8' }} fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 18l6-6-6-6" /></svg>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── STEP 2: Enter Amount + Upload ──
  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC', paddingBottom: '80px' }}>
      <style>{spinStyle}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 20px', background: '#FFFFFF', borderBottom: '1px solid #E2E8F0', position: 'sticky', top: '56px', zIndex: 10, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
        <button onClick={() => { setStep(1); setError(''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B', padding: '4px', display: 'flex' }}>
          <svg viewBox="0 0 24 24" style={{ width: '22px', height: '22px' }} fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 18l-6-6 6-6" /></svg>
        </button>
        <div>
          <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0F172A' }}>Send Payment</h1>
          <p style={{ margin: 0, fontSize: '12px', color: '#94A3B8', fontWeight: 500 }}>Step 2 of 2 — Transfer & confirm</p>
        </div>
      </div>

      {/* Progress full */}
      <div style={{ height: '4px', background: '#E2E8F0' }}>
        <div style={{ width: '100%', height: '100%', background: 'linear-gradient(90deg, #10B981, #34D399)' }} />
      </div>

      <div style={{ padding: '20px 16px' }}>
        {/* Account card */}
        {selectedMethod && (
          <div style={{ background: '#FFFFFF', borderRadius: '20px', overflow: 'hidden', border: '1px solid #E2E8F0', marginBottom: '16px', boxShadow: '0 4px 16px rgba(0,0,0,0.06)' }}>
            <div style={{ background: 'linear-gradient(135deg, #0F172A, #1E293B)', padding: '16px 18px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '46px', height: '46px', borderRadius: '12px', background: 'rgba(255,255,255,0.12)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,255,255,0.15)' }}>
                {selectedMethod.logo_url ? <img src={selectedMethod.logo_url} alt={selectedMethod.provider_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: '20px' }}>🏦</span>}
              </div>
              <div>
                <div style={{ fontSize: '15px', fontWeight: 800, color: '#FFFFFF' }}>{selectedMethod.provider_name}</div>
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>Transfer to this account</div>
              </div>
            </div>

            <div style={{ padding: '14px 18px', borderBottom: '1px solid #F1F5F9' }}>
              <div style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>Account Name</div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A' }}>{selectedMethod.account_name}</span>
                <button onClick={() => handleCopy(selectedMethod.account_name, 'name')}
                  style={{ background: copiedField === 'name' ? '#D1FAE5' : '#F1F5F9', border: `1px solid ${copiedField === 'name' ? '#10B981' : '#E2E8F0'}`, borderRadius: '8px', padding: '6px 12px', cursor: 'pointer', color: copiedField === 'name' ? '#059669' : '#64748B', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: 700 }}>
                  {copiedField === 'name' ? <><CheckIcon /> Copied!</> : <><CopyIcon /> Copy</>}
                </button>
              </div>
            </div>

            <div style={{ padding: '14px 18px' }}>
              <div style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>Account Number / Phone</div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '22px', fontWeight: 900, color: '#0EA5E9', letterSpacing: '1px' }}>{selectedMethod.account_number}</span>
                <button onClick={() => handleCopy(selectedMethod.account_number, 'number')}
                  style={{ background: copiedField === 'number' ? '#D1FAE5' : '#EFF6FF', border: `1px solid ${copiedField === 'number' ? '#10B981' : '#BFDBFE'}`, borderRadius: '8px', padding: '6px 12px', cursor: 'pointer', color: copiedField === 'number' ? '#059669' : '#2563EB', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: 700 }}>
                  {copiedField === 'number' ? <><CheckIcon /> Copied!</> : <><CopyIcon /> Copy</>}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Info tip */}
        <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '12px', padding: '14px 16px', marginBottom: '20px', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
          <span style={{ fontSize: '18px', flexShrink: 0 }}>💡</span>
          <p style={{ margin: 0, fontSize: '13px', color: '#92400E', lineHeight: 1.6 }}>
            Send your money to the account above, then enter the exact amount and upload a screenshot of the payment confirmation.
          </p>
        </div>

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
                min={selectedMethod?.min_deposit || 450}
                step="any"
                inputMode="decimal"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                required
                placeholder={String(selectedMethod?.min_deposit || 450)}
                style={{ width: '100%', padding: '14px 56px 14px 16px', borderRadius: '12px', background: '#F8FAFC', border: '1.5px solid #E2E8F0', color: '#0F172A', fontSize: '22px', fontWeight: 900, outline: 'none', boxSizing: 'border-box' }}
              />
              <span style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', fontSize: '16px', fontWeight: 800, color: '#F59E0B' }}>Br</span>
            </div>
            <p style={{ margin: '8px 0 0', fontSize: '12px', color: '#94A3B8', fontWeight: 600 }}>
              Minimum: <span style={{ color: '#10B981', fontWeight: 700 }}>{selectedMethod?.min_deposit || 450} Br</span>
            </p>
          </div>

          {/* Screenshot upload */}
          <div style={{ background: '#FFFFFF', borderRadius: '16px', border: '1px solid #E2E8F0', padding: '16px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#64748B', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Payment Screenshot</label>
            <div onClick={() => fileInputRef.current?.click()}
              style={{ border: `2px dashed ${screenshotPreview ? '#10B981' : '#CBD5E1'}`, borderRadius: '14px', padding: screenshotPreview ? '0' : '32px 24px', textAlign: 'center', cursor: 'pointer', background: screenshotPreview ? '#F0FDF4' : '#F8FAFC', overflow: 'hidden', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
              {screenshotPreview ? (
                <div style={{ width: '100%', position: 'relative' }}>
                  <img src={screenshotPreview} alt="Receipt" style={{ width: '100%', maxHeight: '220px', objectFit: 'cover', display: 'block', borderRadius: '12px' }} />
                  <div style={{ position: 'absolute', bottom: '10px', right: '10px', background: 'rgba(0,0,0,0.6)', borderRadius: '8px', padding: '6px 10px', fontSize: '12px', color: '#FFF', fontWeight: 600 }}>Tap to change</div>
                </div>
              ) : (
                <>
                  <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg viewBox="0 0 24 24" style={{ width: '28px', height: '28px', color: '#93C5FD' }} fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: '#334155' }}>Tap to upload screenshot</div>
                  <div style={{ fontSize: '12px', color: '#94A3B8' }}>JPG or PNG from your gallery</div>
                </>
              )}
            </div>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" style={{ display: 'none' }} />
          </div>

          {/* Submit */}
          <button type="submit" disabled={isSubmitting || !amount || !screenshotPreview}
            style={{ width: '100%', padding: '18px', background: isSubmitting || !amount || !screenshotPreview ? '#E2E8F0' : 'linear-gradient(135deg, #10B981, #059669)', color: isSubmitting || !amount || !screenshotPreview ? '#94A3B8' : '#FFFFFF', border: 'none', borderRadius: '16px', fontSize: '16px', fontWeight: 900, cursor: isSubmitting || !amount || !screenshotPreview ? 'not-allowed' : 'pointer', boxShadow: isSubmitting || !amount || !screenshotPreview ? 'none' : '0 4px 16px rgba(16,185,129,0.35)' }}>
            {isSubmitting ? (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                <div style={{ width: '18px', height: '18px', border: '2.5px solid rgba(255,255,255,0.3)', borderTop: '2.5px solid #FFF', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                Submitting...
              </span>
            ) : '✓ Submit Deposit'}
          </button>
        </form>
      </div>
    </div>
  );
}