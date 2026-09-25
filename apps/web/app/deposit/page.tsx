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

export default function DepositPage() {
  const router = useRouter();
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedMethodId, setSelectedMethodId] = useState<string | null>(null);
  const [amount, setAmount] = useState<string>('');
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Check auth
    const userStr = localStorage.getItem('miraclbet_user');
    if (!userStr) {
      router.push('/login');
      return;
    }

    // Fetch methods
    fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/api/v1/admin/payment-methods`)
      .then(res => res.json())
      .then(data => {
        const active = (data || []).filter((m: PaymentMethod) => m.is_active);
        setMethods(active);
        if (active.length > 0) setSelectedMethodId(active[0].id);
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [router]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setScreenshotFile(file);
      setScreenshotPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMethodId || !amount || !screenshotFile) {
      setError('Please fill all fields and upload a screenshot.');
      return;
    }
    setError('');
    setIsSubmitting(true);

    const userStr = localStorage.getItem('miraclbet_user');
    const user = userStr ? JSON.parse(userStr) : null;

    const formData = new FormData();
    formData.append('user_id', user?.id || '');
    formData.append('payment_method_id', selectedMethodId);
    formData.append('amount', amount);
    formData.append('screenshot', screenshotFile);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/api/v1/deposits`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error('Deposit submission failed');
      
      setSuccess(true);
      setTimeout(() => router.push('/'), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9CA3AF' }}>Loading...</div>;
  }

  if (success) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', textAlign: 'center' }}>
        <div style={{ width: '80px', height: '80px', borderRadius: '40px', background: 'rgba(22, 163, 74, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
          <svg viewBox="0 0 24 24" style={{ width: '40px', height: '40px', color: '#16A34A' }} fill="none" stroke="currentColor" strokeWidth="3">
            <path d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '12px' }}>Deposit Submitted!</h1>
        <p style={{ color: '#9CA3AF', fontSize: '15px' }}>Your deposit is being verified by an admin. Your balance will be updated automatically shortly.</p>
      </div>
    );
  }

  const selectedMethod = methods.find(m => m.id === selectedMethodId);

  return (
    <div style={{ padding: '24px 16px', maxWidth: '500px', margin: '0 auto', paddingBottom: '100px' }}>
      <h1 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '8px', color: '#FFFFFF' }}>Deposit Funds</h1>
      <p style={{ color: '#9CA3AF', fontSize: '14px', marginBottom: '24px' }}>Send funds to one of our accounts and upload the receipt.</p>

      {error && <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#EF4444', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '14px', borderRadius: '12px', fontSize: '14px', marginBottom: '20px' }}>{error}</div>}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* Method Selection */}
        <div>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: 700, color: '#D1D5DB', marginBottom: '12px' }}>Select Payment Method</label>
          <div style={{ display: 'grid', gap: '12px' }}>
            {methods.map(method => (
              <div 
                key={method.id}
                onClick={() => setSelectedMethodId(method.id)}
                style={{
                  padding: '16px', borderRadius: '16px', cursor: 'pointer',
                  border: `2px solid ${selectedMethodId === method.id ? '#F5A623' : '#1E293B'}`,
                  background: selectedMethodId === method.id ? 'rgba(245, 166, 35, 0.05)' : '#111827',
                  display: 'flex', alignItems: 'center', gap: '16px',
                  transition: 'all 0.2s'
                }}
              >
                <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#1E293B', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {method.logo_url ? (
                    <img src={method.logo_url} alt={method.provider_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <span style={{ fontSize: '20px' }}>🏦</span>
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '15px', fontWeight: 800, color: '#FFF' }}>{method.provider_name}</div>
                  <div style={{ fontSize: '13px', color: '#9CA3AF', marginTop: '2px' }}>{method.account_name}</div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#F5A623', marginTop: '4px' }}>{method.account_number}</div>
                </div>
                <div style={{
                  width: '24px', height: '24px', borderRadius: '12px', border: `2px solid ${selectedMethodId === method.id ? '#F5A623' : '#374151'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  {selectedMethodId === method.id && <div style={{ width: '12px', height: '12px', borderRadius: '6px', background: '#F5A623' }} />}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Selected Instructions */}
        {selectedMethod && (
          <div style={{ background: '#1A2235', padding: '16px', borderRadius: '12px', borderLeft: '4px solid #F5A623' }}>
            <p style={{ margin: 0, fontSize: '13px', color: '#D1D5DB', lineHeight: 1.5 }}>
              Please transfer your funds to <strong>{selectedMethod.account_number}</strong> ({selectedMethod.provider_name}). Then enter the amount below and upload the transaction screenshot.
            </p>
          </div>
        )}

        {/* Amount */}
        <div>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: 700, color: '#D1D5DB', marginBottom: '8px' }}>Amount (Br)</label>
          <input 
            type="number" min="1" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} required
            placeholder="Enter amount to deposit"
            style={{ 
              width: '100%', padding: '16px', borderRadius: '12px', background: '#111827', 
              border: '1px solid #1E293B', color: '#FFF', fontSize: '16px', outline: 'none' 
            }}
          />
        </div>

        {/* Screenshot */}
        <div>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: 700, color: '#D1D5DB', marginBottom: '8px' }}>Payment Screenshot</label>
          <div 
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: '2px dashed #374151', borderRadius: '16px', padding: '24px',
              textAlign: 'center', cursor: 'pointer', background: '#111827',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px'
            }}
          >
            {screenshotPreview ? (
              <div style={{ width: '100%', maxWidth: '200px', borderRadius: '12px', overflow: 'hidden' }}>
                <img src={screenshotPreview} alt="Receipt" style={{ width: '100%', height: 'auto', display: 'block' }} />
              </div>
            ) : (
              <>
                <svg viewBox="0 0 24 24" style={{ width: '40px', height: '40px', color: '#6B7280' }} fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <div style={{ fontSize: '15px', fontWeight: 600, color: '#D1D5DB' }}>Tap to upload screenshot</div>
                <div style={{ fontSize: '13px', color: '#6B7280' }}>JPG, PNG accepted</div>
              </>
            )}
          </div>
          <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" required={!screenshotPreview} style={{ display: 'none' }} />
        </div>

        <button 
          type="submit" disabled={isSubmitting || !selectedMethodId || !amount || !screenshotPreview}
          style={{
            width: '100%', padding: '16px', background: isSubmitting ? '#9CA3AF' : '#F5A623', color: '#000',
            border: 'none', borderRadius: '12px', fontSize: '16px', fontWeight: 800,
            cursor: isSubmitting ? 'not-allowed' : 'pointer', marginTop: '10px'
          }}
        >
          {isSubmitting ? 'Submitting...' : 'Submit Deposit'}
        </button>

      </form>
    </div>
  );
}