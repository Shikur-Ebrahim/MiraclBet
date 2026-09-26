'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';

type WithdrawalMethod = {
  id: string;
  provider_name: string;
  logo_url: string | null;
  is_active: boolean;
};

const defaultBanks = [
  'Telebirr',
  'Commercial Bank of Ethiopia (CBE)',
  'Awash Bank',
  'Dashen Bank',
  'Abyssinia Bank',
  'CBE Birr',
  'M-Pesa',
  'Bank of Abyssinia',
  'Wegagen Bank',
  'United Bank',
  'Nib International Bank',
  'Cooperative Bank of Oromia',
  'Oromia International Bank',
  'Zemen Bank'
];

export default function WithdrawalMethodsAdmin() {
  const router = useRouter();
  const [methods, setMethods] = useState<WithdrawalMethod[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  
  // Form state
  const [providerName, setProviderName] = useState(defaultBanks[0]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchMethods();
  }, []);

  const fetchMethods = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/api/v1/admin/withdrawal-methods`);
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
    if (!providerName) {
      setError('Provider name is required');
      return;
    }

    setSaving(true);
    setError('');

    const formData = new FormData();
    formData.append('provider_name', providerName);
    if (logoFile) {
      formData.append('logo', logoFile);
    }

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/api/v1/admin/withdrawal-methods`, {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const newMethod = await res.json();
        setMethods([newMethod, ...methods]);
        setIsModalOpen(false);
        resetForm();
      } else {
        const text = await res.text();
        setError(text || 'Failed to add withdrawal method');
      }
    } catch (err) {
      console.error(err);
      setError('Network error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this withdrawal method?')) return;
    
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/api/v1/admin/withdrawal-methods/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setMethods(methods.filter(m => m.id !== id));
      } else {
        alert('Failed to delete');
      }
    } catch (err) {
      console.error(err);
      alert('Network error');
    }
  };

  const toggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/api/v1/admin/withdrawal-methods/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !currentStatus }),
      });
      if (res.ok) {
        setMethods(methods.map(m => m.id === id ? { ...m, is_active: !currentStatus } : m));
      } else {
        alert('Failed to update status');
      }
    } catch (err) {
      console.error(err);
      alert('Network error');
    }
  };

  const resetForm = () => {
    setProviderName(defaultBanks[0]);
    setLogoFile(null);
    setLogoPreview(null);
    setError('');
    setIsDropdownOpen(false);
  };

  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      
      {/* HEADER */}
      <div style={{
        background: '#FFFFFF', borderBottom: '1px solid #E5E7EB',
        padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button onClick={() => router.push('/admin')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
            <svg viewBox="0 0 24 24" style={{ width: '24px', height: '24px', color: '#111827' }} fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#111827' }}>Withdrawal Methods</h1>
        </div>
        <button 
          onClick={() => { resetForm(); setIsModalOpen(true); }}
          style={{
            background: '#F5A623', color: '#000', border: 'none', borderRadius: '8px',
            padding: '8px 16px', fontSize: '14px', fontWeight: 700, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: '6px'
          }}
        >
          <svg viewBox="0 0 24 24" style={{ width: '18px', height: '18px' }} fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add New
        </button>
      </div>

      <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#6B7280' }}>Loading...</div>
        ) : methods.length === 0 ? (
          <div style={{ background: '#FFF', borderRadius: '12px', padding: '48px 24px', textAlign: 'center', border: '1px dashed #D1D5DB' }}>
            <div style={{ fontSize: '32px', marginBottom: '16px' }}>💳</div>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#374151', margin: '0 0 8px' }}>No Withdrawal Methods</h3>
            <p style={{ color: '#6B7280', fontSize: '14px', margin: 0 }}>Add banks where users can withdraw their funds.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
            {methods.map(method => (
              <div key={method.id} style={{
                background: '#FFFFFF', borderRadius: '12px', border: '1px solid #E5E7EB',
                overflow: 'hidden', display: 'flex', flexDirection: 'column'
              }}>
                <div style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '16px', borderBottom: '1px solid #F3F4F6' }}>
                  {/* Logo */}
                  <div style={{ 
                    width: '60px', height: '60px', borderRadius: '12px', background: '#F8FAFC', 
                    border: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    overflow: 'hidden', flexShrink: 0
                  }}>
                    {method.logo_url ? (
                      <img src={method.logo_url} alt={method.provider_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <span style={{ fontSize: '24px' }}>🏦</span>
                    )}
                  </div>
                  {/* Info */}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '16px', fontWeight: 800, color: '#111827', marginBottom: '4px' }}>
                      {method.provider_name}
                    </div>
                  </div>
                </div>
                
                {/* Actions */}
                <div style={{ display: 'flex', background: '#F8FAFC', padding: '12px 16px', gap: '12px' }}>
                  <button 
                    onClick={() => toggleStatus(method.id, method.is_active)}
                    style={{
                      flex: 1, padding: '8px', borderRadius: '6px', fontSize: '13px', fontWeight: 700, cursor: 'pointer',
                      background: method.is_active ? '#DCFCE7' : '#F1F5F9',
                      color: method.is_active ? '#16A34A' : '#64748B',
                      border: `1px solid ${method.is_active ? '#BBF7D0' : '#E2E8F0'}`
                    }}
                  >
                    {method.is_active ? 'Active' : 'Hidden'}
                  </button>
                  <button 
                    onClick={() => handleDelete(method.id)}
                    style={{
                      padding: '8px 16px', borderRadius: '6px', fontSize: '13px', fontWeight: 700, cursor: 'pointer',
                      background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA'
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ADD MODAL */}
      {isModalOpen && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center' // Mobile-first bottom sheet
        }}>
          <div style={{
            background: '#FFFFFF', width: '100%', maxWidth: '500px', borderTopLeftRadius: '20px', borderTopRightRadius: '20px',
            padding: '24px', animation: 'slideUp 0.3s ease-out'
          }}>
            <style>{`@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#111827' }}>Add Bank / Provider</h2>
              <button onClick={() => setIsModalOpen(false)} style={{ background: '#F1F5F9', border: 'none', borderRadius: '20px', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748B' }}>
                <svg viewBox="0 0 24 24" style={{ width: '18px', height: '18px' }} fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12" /></svg>
              </button>
            </div>

            {error && (
              <div style={{ background: '#FEF2F2', color: '#DC2626', padding: '12px', borderRadius: '8px', fontSize: '14px', marginBottom: '16px', border: '1px solid #FECACA' }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* Provider / Bank Name with Custom Dropdown */}
              <div style={{ position: 'relative' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#4B5563', marginBottom: '8px' }}>
                  Bank / Wallet Name
                </label>
                <div 
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  style={{
                    width: '100%', padding: '14px 16px', borderRadius: '10px',
                    border: '1px solid #D1D5DB', background: '#F9FAFB', color: '#111827',
                    fontSize: '15px', fontWeight: 600, display: 'flex', justifyContent: 'space-between',
                    alignItems: 'center', cursor: 'pointer',
                  }}
                >
                  {providerName}
                  <svg viewBox="0 0 24 24" style={{ width: '18px', height: '18px', color: '#6B7280', transform: isDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 9l6 6 6-6"/></svg>
                </div>

                {isDropdownOpen && (
                  <div style={{
                    position: 'absolute', top: 'calc(100% + 8px)', left: 0, right: 0, zIndex: 100,
                    background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '12px',
                    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)',
                    maxHeight: '240px', overflowY: 'auto'
                  }}>
                    {defaultBanks.map(bank => (
                      <div 
                        key={bank}
                        onClick={() => { setProviderName(bank); setIsDropdownOpen(false); }}
                        style={{
                          padding: '12px 16px', cursor: 'pointer', fontSize: '15px', fontWeight: 600,
                          color: '#374151', borderBottom: '1px solid #F3F4F6',
                          background: providerName === bank ? '#F5F3FF' : '#FFF'
                        }}
                      >
                        {bank}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Logo Upload */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#4B5563', marginBottom: '8px' }}>
                  Bank Logo (Optional, recommended)
                </label>
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    border: '2px dashed #D1D5DB', borderRadius: '12px', padding: logoPreview ? '12px' : '32px 24px',
                    textAlign: 'center', cursor: 'pointer', background: '#F9FAFB',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px'
                  }}
                >
                  {logoPreview ? (
                    <div style={{ width: '80px', height: '80px', borderRadius: '12px', overflow: 'hidden', border: '1px solid #E5E7EB' }}>
                      <img src={logoPreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  ) : (
                    <>
                      <div style={{ width: '48px', height: '48px', borderRadius: '24px', background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94A3B8' }}>
                        <svg viewBox="0 0 24 24" style={{ width: '24px', height: '24px' }} fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                      </div>
                      <span style={{ fontSize: '14px', fontWeight: 600, color: '#6B7280' }}>Tap to select logo</span>
                    </>
                  )}
                </div>
                <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" style={{ display: 'none' }} />
              </div>

              <button 
                type="submit" 
                disabled={saving}
                style={{
                  width: '100%', padding: '16px', background: '#F5A623', color: '#000',
                  border: 'none', borderRadius: '12px', fontSize: '16px', fontWeight: 800,
                  cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1,
                  marginTop: '12px'
                }}
              >
                {saving ? 'Adding...' : 'Add Withdrawal Method'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
