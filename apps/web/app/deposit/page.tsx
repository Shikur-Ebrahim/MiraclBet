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
};

type PendingDeposit = {
  id: string;
  amount: number;
  provider_name: string;
  created_at: string;
};

function CopyIcon() {
  return (
    <svg viewBox="0 0 24 24" style={{ width: '16px', height: '16px' }} fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function CheckIcon({ color = '#16A34A' }: { color?: string }) {
  return (
    <svg viewBox="0 0 24 24" style={{ width: '16px', height: '16px' }} fill="none" stroke={color} strokeWidth="3">
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

    // Fetch both payment methods and pending deposit check in parallel
    Promise.all([
      fetch(`${API}/api/v1/admin/payment-methods`).then(r => r.json()),
      fetch(`${API}/api/v1/deposits/pending?user_id=${user.id}`).then(r => r.json()).catch(() => null),
    ]).then(([methodsData, pendingData]) => {
      const active = (Array.isArray(methodsData) ? methodsData : []).filter((m: PaymentMethod) => m.is_active);
      setMethods(active);
      if (pendingData && pendingData.id) {
        setPendingDeposit(pendingData);
      }
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

  // Loading
  if (!mounted || loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid #1E293B', borderTop: '3px solid #19E66B', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <div style={{ color: '#6B7280', fontSize: '14px' }}>Loading...</div>
      </div>
    );
  }

  // ── PENDING STATE — user has a deposit being reviewed ──
  if (pendingDeposit) {
    return (
      <div style={{ minHeight: '100vh', paddingBottom: '80px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', borderBottom: '1px solid #1E293B', background: '#0A0E1A', position: 'sticky', top: '56px', zIndex: 10 }}>
          <button onClick={() => router.push('/')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', padding: '4px' }}>
            <svg viewBox="0 0 24 24" style={{ width: '22px', height: '22px' }} fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#FFF' }}>Deposit</h1>
        </div>

        <div style={{ padding: '32px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
          {/* Animated clock icon */}
          <div style={{ width: '100px', height: '100px', borderRadius: '50px', background: 'rgba(245,166,35,0.1)', border: '2px solid rgba(245,166,35,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '28px' }}>
            <svg viewBox="0 0 24 24" style={{ width: '48px', height: '48px', color: '#F5A623' }} fill="none" stroke="currentColor" strokeWidth="1.8">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>

          <h2 style={{ fontSize: '22px', fontWeight: 900, color: '#FFF', marginBottom: '12px' }}>Deposit Processing</h2>
          <p style={{ color: '#9CA3AF', fontSize: '15px', lineHeight: 1.6, maxWidth: '300px', marginBottom: '32px' }}>
            Your deposit is being reviewed by an admin. You cannot submit another deposit until this one is verified.
          </p>

          {/* Deposit details card */}
          <div style={{ width: '100%', maxWidth: '340px', background: '#111827', borderRadius: '20px', overflow: 'hidden', border: '1px solid #1E293B' }}>
            <div style={{ background: 'rgba(245,166,35,0.08)', padding: '12px 16px', borderBottom: '1px solid #1E293B' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#F5A623', letterSpacing: '0.05em' }}>PENDING DEPOSIT</span>
            </div>
            <div style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#6B7280', fontSize: '14px' }}>Amount</span>
                <span style={{ color: '#FFF', fontSize: '20px', fontWeight: 900 }}>{Number(pendingDeposit.amount).toFixed(2)} <span style={{ color: '#F5A623' }}>Br</span></span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#6B7280', fontSize: '14px' }}>Method</span>
                <span style={{ color: '#FFF', fontSize: '14px', fontWeight: 700 }}>{pendingDeposit.provider_name}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#6B7280', fontSize: '14px' }}>Submitted</span>
                <span style={{ color: '#9CA3AF', fontSize: '13px' }}>{new Date(pendingDeposit.created_at).toLocaleString()}</span>
              </div>
            </div>
            {/* Pulse bar at bottom */}
            <div style={{ height: '4px', background: 'linear-gradient(90deg, #F5A623, #FF8C00, #F5A623)', backgroundSize: '200% 100%', animation: 'pulse 2s ease infinite' }} />
            <style>{`@keyframes pulse { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }`}</style>
          </div>

          <p style={{ color: '#4B5563', fontSize: '13px', marginTop: '24px' }}>
            Your balance will be updated automatically once approved.
          </p>
        </div>
      </div>
    );
  }

  // ── SUCCESS ──
  if (success) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px', textAlign: 'center' }}>
        <div style={{ width: '90px', height: '90px', borderRadius: '45px', background: 'rgba(25, 230, 107, 0.12)', border: '2px solid rgba(25,230,107,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px' }}>
          <svg viewBox="0 0 24 24" style={{ width: '44px', height: '44px', color: '#19E66B' }} fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 style={{ fontSize: '26px', fontWeight: 900, marginBottom: '12px', color: '#FFF' }}>Deposit Submitted!</h1>
        <p style={{ color: '#9CA3AF', fontSize: '15px', lineHeight: 1.6, maxWidth: '300px' }}>
          Your deposit request has been sent. An admin will verify it shortly and your balance will be updated automatically.
        </p>
        <div style={{ marginTop: '24px', display: 'flex', gap: '8px', alignItems: 'center', color: '#6B7280', fontSize: '13px' }}>
          <div style={{ width: '18px', height: '18px', border: '2px solid #19E66B', borderTop: '2px solid transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          Redirecting to home...
        </div>
      </div>
    );
  }

  // ── STEP 1: Select Method ──
  if (step === 1) {
    return (
      <div style={{ minHeight: '100vh', paddingBottom: '80px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', borderBottom: '1px solid #1E293B', position: 'sticky', top: '56px', zIndex: 10, background: '#0A0E1A' }}>
          <button onClick={() => router.push('/')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', padding: '4px' }}>
            <svg viewBox="0 0 24 24" style={{ width: '22px', height: '22px' }} fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#FFF' }}>Deposit Funds</h1>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', padding: '20px 20px 8px' }}>
          <div style={{ flex: 1, height: '3px', borderRadius: '2px', background: '#19E66B' }} />
          <div style={{ width: '8px', height: '8px', borderRadius: '4px', background: '#19E66B', margin: '0 4px' }} />
          <div style={{ flex: 1, height: '3px', borderRadius: '2px', background: '#1E293B' }} />
          <div style={{ fontSize: '11px', color: '#6B7280', marginLeft: '8px', fontWeight: 600 }}>STEP 1/2</div>
        </div>

        <div style={{ padding: '12px 16px 24px' }}>
          <p style={{ color: '#9CA3AF', fontSize: '14px', marginBottom: '20px' }}>Choose where to send your money:</p>
          {methods.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 24px', color: '#6B7280', background: '#111827', borderRadius: '16px', border: '1px dashed #1E293B' }}>
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>🏦</div>
              <div style={{ fontSize: '15px' }}>No payment methods available</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {methods.map(method => (
                <button key={method.id} onClick={() => { setSelectedMethod(method); setStep(2); }}
                  style={{ width: '100%', textAlign: 'left', cursor: 'pointer', padding: '16px', borderRadius: '16px', border: '1.5px solid #1E293B', background: '#111827', display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{ width: '52px', height: '52px', borderRadius: '14px', background: '#1A2235', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '1px solid #1E293B' }}>
                    {method.logo_url ? <img src={method.logo_url} alt={method.provider_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: '22px' }}>🏦</span>}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '16px', fontWeight: 800, color: '#FFF', marginBottom: '4px' }}>{method.provider_name}</div>
                    <div style={{ fontSize: '13px', color: '#6B7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{method.account_name}</div>
                  </div>
                  <svg viewBox="0 0 24 24" style={{ width: '20px', height: '20px', color: '#374151', flexShrink: 0 }} fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M9 18l6-6-6-6" />
                  </svg>
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
    <div style={{ minHeight: '100vh', paddingBottom: '80px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', borderBottom: '1px solid #1E293B', position: 'sticky', top: '56px', zIndex: 10, background: '#0A0E1A' }}>
        <button onClick={() => { setStep(1); setError(''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', padding: '4px' }}>
          <svg viewBox="0 0 24 24" style={{ width: '22px', height: '22px' }} fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#FFF' }}>Send Payment</h1>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', padding: '20px 20px 8px' }}>
        <div style={{ flex: 1, height: '3px', borderRadius: '2px', background: '#19E66B' }} />
        <div style={{ width: '8px', height: '8px', borderRadius: '4px', background: '#19E66B', margin: '0 4px' }} />
        <div style={{ flex: 1, height: '3px', borderRadius: '2px', background: '#19E66B' }} />
        <div style={{ fontSize: '11px', color: '#19E66B', marginLeft: '8px', fontWeight: 600 }}>STEP 2/2</div>
      </div>

      <div style={{ padding: '12px 16px' }}>
        {selectedMethod && (
          <div style={{ background: '#111827', borderRadius: '20px', overflow: 'hidden', border: '1px solid #1E293B', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px', borderBottom: '1px solid #1E293B' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: '#1A2235', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #1E293B' }}>
                {selectedMethod.logo_url ? <img src={selectedMethod.logo_url} alt={selectedMethod.provider_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: '20px' }}>🏦</span>}
              </div>
              <div>
                <div style={{ fontSize: '15px', fontWeight: 800, color: '#FFF' }}>{selectedMethod.provider_name}</div>
                <div style={{ fontSize: '12px', color: '#6B7280' }}>Transfer to this account</div>
              </div>
            </div>

            <div style={{ padding: '14px 16px', borderBottom: '1px solid #1E293B' }}>
              <div style={{ fontSize: '11px', color: '#6B7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>Account Name</div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '15px', fontWeight: 700, color: '#FFF' }}>{selectedMethod.account_name}</span>
                <button onClick={() => handleCopy(selectedMethod.account_name, 'name')}
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid #1E293B', borderRadius: '8px', padding: '7px 12px', cursor: 'pointer', color: copiedField === 'name' ? '#16A34A' : '#9CA3AF', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: 600 }}>
                  {copiedField === 'name' ? <><CheckIcon /> Copied!</> : <><CopyIcon /> Copy</>}
                </button>
              </div>
            </div>

            <div style={{ padding: '14px 16px' }}>
              <div style={{ fontSize: '11px', color: '#6B7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>Account Number / Phone</div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '20px', fontWeight: 900, color: '#19E66B', letterSpacing: '1px' }}>{selectedMethod.account_number}</span>
                <button onClick={() => handleCopy(selectedMethod.account_number, 'number')}
                  style={{ background: copiedField === 'number' ? 'rgba(22,163,74,0.15)' : 'rgba(25,230,107,0.08)', border: `1px solid ${copiedField === 'number' ? '#16A34A' : 'rgba(25,230,107,0.3)'}`, borderRadius: '8px', padding: '7px 12px', cursor: 'pointer', color: copiedField === 'number' ? '#16A34A' : '#19E66B', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: 700 }}>
                  {copiedField === 'number' ? <><CheckIcon color="#16A34A" /> Copied!</> : <><CopyIcon /> Copy</>}
                </button>
              </div>
            </div>
          </div>
        )}

        <div style={{ background: 'rgba(245,166,35,0.06)', border: '1px solid rgba(245,166,35,0.2)', borderRadius: '12px', padding: '14px', marginBottom: '20px', display: 'flex', gap: '10px' }}>
          <span style={{ fontSize: '18px', flexShrink: 0 }}>💡</span>
          <p style={{ margin: 0, fontSize: '13px', color: '#D1D5DB', lineHeight: 1.6 }}>
            Send your money to the account above, then enter the exact amount and upload a screenshot of the payment confirmation.
          </p>
        </div>

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
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#D1D5DB', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Payment Screenshot</label>
            <div onClick={() => fileInputRef.current?.click()}
              style={{ border: `2px dashed ${screenshotPreview ? '#19E66B' : '#1E293B'}`, borderRadius: '16px', padding: screenshotPreview ? '0' : '32px 24px', textAlign: 'center', cursor: 'pointer', background: '#111827', overflow: 'hidden', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
              {screenshotPreview ? (
                <div style={{ width: '100%', position: 'relative' }}>
                  <img src={screenshotPreview} alt="Receipt" style={{ width: '100%', maxHeight: '240px', objectFit: 'cover', display: 'block' }} />
                  <div style={{ position: 'absolute', bottom: '10px', right: '10px', background: 'rgba(0,0,0,0.7)', borderRadius: '8px', padding: '6px 10px', fontSize: '12px', color: '#FFF', fontWeight: 600 }}>Tap to change</div>
                </div>
              ) : (
                <>
                  <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: '#1A2235', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg viewBox="0 0 24 24" style={{ width: '28px', height: '28px', color: '#6B7280' }} fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: '#D1D5DB' }}>Tap to upload screenshot</div>
                  <div style={{ fontSize: '13px', color: '#4B5563' }}>JPG or PNG from your gallery</div>
                </>
              )}
            </div>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" style={{ display: 'none' }} />
          </div>

          <button type="submit" disabled={isSubmitting || !amount || !screenshotPreview}
            style={{ width: '100%', padding: '18px', background: isSubmitting || !amount || !screenshotPreview ? '#1E293B' : '#19E66B', color: isSubmitting || !amount || !screenshotPreview ? '#4B5563' : '#000', border: 'none', borderRadius: '14px', fontSize: '16px', fontWeight: 900, cursor: isSubmitting || !amount || !screenshotPreview ? 'not-allowed' : 'pointer', transition: 'all 0.2s' }}>
            {isSubmitting ? (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                <div style={{ width: '18px', height: '18px', border: '2.5px solid rgba(0,0,0,0.3)', borderTop: '2.5px solid #000', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                Submitting...
              </span>
            ) : 'Submit Deposit'}
          </button>
        </form>
      </div>
    </div>
  );
}