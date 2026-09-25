'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

type PaymentMethod = {
  id: string;
  provider_name: string;
  account_name: string;
  account_number: string;
  logo_url: string | null;
  is_active: boolean;
};

const providers = [
  'Telebirr',
  'Commercial Bank of Ethiopia (CBE)',
  'Awash Bank',
  'Dashen Bank',
  'Abyssinia Bank',
  'CBE Birr',
  'M-Pesa',
];

export default function DepositMethodsAdmin() {
  const router = useRouter();
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  
  // Form state
  const [providerName, setProviderName] = useState(providers[0]);
  const [accountName, setAccountName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchMethods();
  }, []);

  const fetchMethods = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/api/v1/admin/payment-methods`);
      if (res.ok) {
        const data = await res.json();
        setMethods(data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    const formData = new FormData();
    formData.append('provider_name', providerName);
    formData.append('account_name', accountName);
    formData.append('account_number', accountNumber);
    if (logoFile) {
      formData.append('logo', logoFile);
    }

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/api/v1/admin/payment-methods`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error('Failed to save deposit method');

      setIsModalOpen(false);
      setProviderName(providers[0]);
      setAccountName('');
      setAccountNumber('');
      setLogoFile(null);
      setLogoPreview(null);
      
      fetchMethods(); // Refresh list
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this deposit method?')) return;
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/api/v1/admin/payment-methods/${id}`, {
        method: 'DELETE',
      });
      fetchMethods();
    } catch (err) {
      console.error('Failed to delete', err);
    }
  };

  const toggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/api/v1/admin/payment-methods/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !currentStatus }),
      });
      fetchMethods();
    } catch (err) {
      console.error('Failed to update status', err);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      
      {/* Header */}
      <div style={{
        background: '#FFFFFF', borderBottom: '1px solid #E5E7EB',
        padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px',
        position: 'sticky', top: 0, zIndex: 100,
      }}>
        <button onClick={() => router.push('/admin')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
          <svg viewBox="0 0 24 24" style={{ width: '24px', height: '24px', color: '#111827' }} fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <h1 style={{ fontSize: '18px', fontWeight: 800, color: '#111827', margin: 0 }}>Deposit Methods</h1>
      </div>

      <div style={{ padding: '20px 16px', maxWidth: '600px', margin: '0 auto' }}>
        
        {/* Add Button */}
        <button
          onClick={() => setIsModalOpen(true)}
          style={{
            width: '100%', padding: '14px', background: '#16A34A', color: '#FFFFFF',
            border: 'none', borderRadius: '12px', fontSize: '15px', fontWeight: 700,
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            boxShadow: '0 2px 8px rgba(22,163,74,0.3)', marginBottom: '24px',
          }}
        >
          <svg viewBox="0 0 24 24" style={{ width: '20px', height: '20px' }} fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Add New Method
        </button>

        {/* List */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#6B7280' }}>Loading...</div>
        ) : methods.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#6B7280', background: '#FFF', borderRadius: '12px', border: '1px dashed #D1D5DB' }}>
            No deposit methods added yet.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {methods.map((method) => (
              <div key={method.id} style={{
                background: '#FFFFFF', borderRadius: '16px', padding: '16px',
                border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                display: 'flex', alignItems: 'center', gap: '16px',
              }}>
                {/* Logo */}
                <div style={{
                  width: '56px', height: '56px', borderRadius: '12px', background: '#F3F4F6',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
                  border: '1px solid #E5E7EB', flexShrink: 0,
                }}>
                  {method.logo_url ? (
                    <img src={method.logo_url} alt={method.provider_name} width={56} height={56} style={{ objectFit: 'cover' }} />
                  ) : (
                    <span style={{ fontSize: '24px' }}>🏦</span>
                  )}
                </div>

                {/* Details */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                    <div style={{ fontSize: '15px', fontWeight: 800, color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {method.provider_name}
                    </div>
                    <span style={{
                      fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px',
                      background: method.is_active ? '#DCFCE7' : '#FEE2E2',
                      color: method.is_active ? '#16A34A' : '#DC2626',
                    }}>
                      {method.is_active ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                  </div>
                  <div style={{ fontSize: '13px', color: '#6B7280', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {method.account_name}
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#374151', marginTop: '2px' }}>
                    {method.account_number}
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <button onClick={() => toggleStatus(method.id, method.is_active)} style={{
                    padding: '6px 12px', fontSize: '12px', fontWeight: 700, borderRadius: '6px', cursor: 'pointer',
                    background: method.is_active ? '#FEF2F2' : '#F0FDF4',
                    color: method.is_active ? '#DC2626' : '#16A34A', border: 'none',
                  }}>
                    {method.is_active ? 'Disable' : 'Enable'}
                  </button>
                  <button onClick={() => handleDelete(method.id)} style={{
                    padding: '6px 12px', fontSize: '12px', fontWeight: 600, borderRadius: '6px', cursor: 'pointer',
                    background: '#F3F4F6', color: '#4B5563', border: 'none',
                  }}>
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Modal */}
      {isModalOpen && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        }}>
          <div style={{
            background: '#FFFFFF', width: '100%', maxWidth: '500px',
            borderTopLeftRadius: '24px', borderTopRightRadius: '24px',
            padding: '24px 20px', maxHeight: '90vh', overflowY: 'auto',
            animation: 'slideUp 0.3s ease-out',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: '#111827' }}>Add Deposit Method</h2>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280' }}>
                <svg viewBox="0 0 24 24" style={{ width: '24px', height: '24px' }} fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            {error && <div style={{ background: '#FEF2F2', color: '#DC2626', padding: '12px', borderRadius: '8px', fontSize: '13px', marginBottom: '16px' }}>{error}</div>}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>Bank / Provider Name</label>
                <select 
                  value={providerName} onChange={(e) => setProviderName(e.target.value)} required
                  style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #D1D5DB', background: '#F9FAFB', fontSize: '15px', color: '#111827', outline: 'none' }}
                >
                  {providers.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>Account Name</label>
                <input 
                  type="text" value={accountName} onChange={(e) => setAccountName(e.target.value)} required
                  placeholder="e.g. MiraclBet PLC"
                  style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #D1D5DB', background: '#FFFFFF', fontSize: '15px', color: '#111827', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>Account Number / Phone</label>
                <input 
                  type="text" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} required
                  placeholder="e.g. 1000123456789 or 0911223344"
                  style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #D1D5DB', background: '#FFFFFF', fontSize: '15px', color: '#111827', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>Logo Image (Optional)</label>
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    border: '2px dashed #D1D5DB', borderRadius: '12px', padding: '20px',
                    textAlign: 'center', cursor: 'pointer', background: '#F9FAFB',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px'
                  }}
                >
                  {logoPreview ? (
                    <img src={logoPreview} alt="Preview" width={64} height={64} style={{ borderRadius: '8px', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ color: '#6B7280' }}>
                      <svg viewBox="0 0 24 24" style={{ width: '32px', height: '32px', margin: '0 auto' }} fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <p style={{ fontSize: '13px', margin: '4px 0 0' }}>Tap to upload bank logo</p>
                    </div>
                  )}
                </div>
                <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" style={{ display: 'none' }} />
              </div>

              <button 
                type="submit" disabled={saving}
                style={{
                  width: '100%', padding: '14px', background: saving ? '#9CA3AF' : '#111827', color: '#FFFFFF',
                  border: 'none', borderRadius: '12px', fontSize: '15px', fontWeight: 700,
                  cursor: saving ? 'not-allowed' : 'pointer', marginTop: '10px'
                }}
              >
                {saving ? 'Saving...' : 'Save Deposit Method'}
              </button>
            </form>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}} />
    </div>
  );
}
