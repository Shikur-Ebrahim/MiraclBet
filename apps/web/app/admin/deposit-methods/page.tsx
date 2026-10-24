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
  
  // Add Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  
  // Add Form state
  const [providerName, setProviderName] = useState(providers[0]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [accountName, setAccountName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [minDepositInput, setMinDepositInput] = useState('450');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  // Edit Modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingMethod, setEditingMethod] = useState<PaymentMethod | null>(null);
  const [editProviderName, setEditProviderName] = useState('');
  const [editIsDropdownOpen, setEditIsDropdownOpen] = useState(false);
  const [editAccountName, setEditAccountName] = useState('');
  const [editAccountNumber, setEditAccountNumber] = useState('');
  const [editMinDepositInput, setEditMinDepositInput] = useState('450');
  const [editLogoFile, setEditLogoFile] = useState<File | null>(null);
  const [editLogoPreview, setEditLogoPreview] = useState<string | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchMethods();
  }, []);

  const fetchMethods = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://api.miraclbet.com:8443'}/api/v1/admin/payment-methods`);
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

  const handleEditFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setEditLogoFile(file);
      setEditLogoPreview(URL.createObjectURL(file));
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
    formData.append('min_deposit', minDepositInput || '450');
    if (logoFile) {
      formData.append('logo', logoFile);
    }

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://api.miraclbet.com:8443'}/api/v1/admin/payment-methods`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => 'Failed to save deposit method');
        throw new Error(errText || 'Failed to save deposit method');
      }

      setIsModalOpen(false);
      setProviderName(providers[0]);
      setAccountName('');
      setAccountNumber('');
      setMinDepositInput('450');
      setLogoFile(null);
      setLogoPreview(null);
      
      fetchMethods(); // Refresh list
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  const openEditModal = (method: PaymentMethod) => {
    setEditingMethod(method);
    setEditProviderName(method.provider_name);
    setEditAccountName(method.account_name);
    setEditAccountNumber(method.account_number);
    setEditMinDepositInput(String(method.min_deposit || 450));
    setEditLogoFile(null);
    setEditLogoPreview(method.logo_url);
    setEditError('');
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMethod) return;
    setSavingEdit(true);
    setEditError('');

    const formData = new FormData();
    formData.append('provider_name', editProviderName);
    formData.append('account_name', editAccountName);
    formData.append('account_number', editAccountNumber);
    formData.append('min_deposit', editMinDepositInput || '450');
    if (editLogoFile) {
      formData.append('logo', editLogoFile);
    }

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://api.miraclbet.com:8443'}/api/v1/admin/payment-methods/${editingMethod.id}`, {
        method: 'PUT',
        body: formData,
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => 'Failed to update deposit method');
        throw new Error(errText || 'Failed to update deposit method');
      }

      setIsEditModalOpen(false);
      setEditingMethod(null);
      fetchMethods(); // Refresh list
    } catch (err: unknown) {
      setEditError(err instanceof Error ? err.message : String(err));
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this deposit method?')) return;
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://api.miraclbet.com:8443'}/api/v1/admin/payment-methods/${id}`, {
        method: 'DELETE',
      });
      fetchMethods();
    } catch (err) {
      console.error('Failed to delete', err);
    }
  };

  const toggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://api.miraclbet.com:8443'}/api/v1/admin/payment-methods/${id}/status`, {
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

      <div style={{ padding: '20px 16px', maxWidth: '640px', margin: '0 auto' }}>
        
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
                display: 'flex', alignItems: 'center', gap: '14px',
              }}>
                {/* Logo */}
                <div style={{
                  width: '56px', height: '56px', borderRadius: '12px', background: '#F3F4F6',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
                  border: '1px solid #E5E7EB', flexShrink: 0,
                }}>
                  {method.logo_url ? (
                    <img src={method.logo_url} alt={method.provider_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <span style={{ fontSize: '24px' }}>💳</span>
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
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#374151', marginTop: '2px', fontFamily: 'monospace' }}>
                    {method.account_number}
                  </div>
                  <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px' }}>
                    Min deposit: <b style={{ color: '#16A34A' }}>{method.min_deposit?.toLocaleString() ?? 450} Br</b>
                  </div>
                </div>

                {/* Actions: Edit, Disable/Enable, Delete */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flexShrink: 0 }}>
                  <button 
                    onClick={() => openEditModal(method)} 
                    style={{
                      padding: '6px 12px', fontSize: '12px', fontWeight: 700, borderRadius: '6px', cursor: 'pointer',
                      background: '#EFF6FF', color: '#2563EB', border: '1px solid #BFDBFE',
                    }}
                  >
                    Edit
                  </button>
                  <button 
                    onClick={() => toggleStatus(method.id, method.is_active)} 
                    style={{
                      padding: '6px 12px', fontSize: '12px', fontWeight: 700, borderRadius: '6px', cursor: 'pointer',
                      background: method.is_active ? '#FEF2F2' : '#F0FDF4',
                      color: method.is_active ? '#DC2626' : '#16A34A', border: 'none',
                    }}
                  >
                    {method.is_active ? 'Disable' : 'Enable'}
                  </button>
                  <button 
                    onClick={() => handleDelete(method.id)} 
                    style={{
                      padding: '6px 12px', fontSize: '12px', fontWeight: 700, borderRadius: '6px', cursor: 'pointer',
                      background: '#F3F4F6', color: '#6B7280', border: 'none',
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
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px',
        }}>
          <div style={{
            background: '#FFFFFF', borderRadius: '20px', width: '100%', maxWidth: '440px',
            padding: '24px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', maxHeight: '90vh', overflowY: 'auto',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#111827', margin: 0 }}>Add Deposit Method</h2>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF' }}>
                <svg viewBox="0 0 24 24" style={{ width: '20px', height: '20px' }} fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            {error && (
              <div style={{ padding: '10px 14px', background: '#FEE2E2', color: '#DC2626', borderRadius: '8px', fontSize: '13px', marginBottom: '16px' }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              {/* Provider Selection */}
              <div style={{ position: 'relative' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>Provider Name</label>
                <div 
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  style={{
                    padding: '12px', borderRadius: '10px', border: '1px solid #D1D5DB',
                    background: '#FFFFFF', fontSize: '15px', color: '#111827', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  }}
                >
                  <span>{providerName}</span>
                  <svg viewBox="0 0 24 24" style={{ width: '18px', height: '18px', color: '#6B7280', transform: isDropdownOpen ? 'rotate(180deg)' : 'none' }} fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M19 9l-7 7-7-7" />
                  </svg>
                </div>

                {isDropdownOpen && (
                  <div style={{ 
                    position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10,
                    marginTop: '8px', background: '#FFFFFF', border: '1px solid #E5E7EB',
                    borderRadius: '16px', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
                    overflow: 'hidden', maxHeight: '240px', overflowY: 'auto'
                  }}>
                    {providers.map(p => (
                      <div 
                        key={p} 
                        onClick={() => { setProviderName(p); setIsDropdownOpen(false); }}
                        style={{ 
                          padding: '14px 16px', fontSize: '15px', color: '#111827', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          borderBottom: '1px solid #F3F4F6',
                          background: providerName === p ? '#F0FDF4' : '#FFFFFF',
                        }}
                      >
                        <span style={{ fontWeight: providerName === p ? 700 : 500 }}>{p}</span>
                        {providerName === p && (
                          <svg viewBox="0 0 24 24" style={{ width: '20px', height: '20px', color: '#16A34A' }} fill="none" stroke="currentColor" strokeWidth="3">
                            <path d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                    ))}
                  </div>
                )}
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
                  type="tel" 
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={accountNumber} 
                  onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ''))} 
                  required
                  placeholder="e.g. 1000123456789 or 0911223344"
                  style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #D1D5DB', background: '#FFFFFF', fontSize: '15px', color: '#111827', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                  Minimum Deposit Amount (Br)
                </label>
                <input 
                  type="number"
                  min="1"
                  step="any"
                  inputMode="decimal"
                  value={minDepositInput}
                  onChange={(e) => setMinDepositInput(e.target.value)}
                  placeholder="450"
                  required
                  style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #D1D5DB', background: '#FFFFFF', fontSize: '15px', color: '#111827', outline: 'none' }}
                />
                <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#6B7280' }}>
                  Users cannot deposit less than this amount. Default: 450 Br.
                </p>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>Logo (Optional)</label>
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    border: '2px dashed #D1D5DB', borderRadius: '12px', padding: logoPreview ? '12px' : '24px',
                    textAlign: 'center', cursor: 'pointer', background: '#F9FAFB',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px'
                  }}
                >
                  {logoPreview ? (
                    <div style={{ position: 'relative', width: '64px', height: '64px' }}>
                      <img src={logoPreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    </div>
                  ) : (
                    <>
                      <svg viewBox="0 0 24 24" style={{ width: '28px', height: '28px', color: '#9CA3AF' }} fill="none" stroke="currentColor" strokeWidth="1.8">
                        <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span style={{ fontSize: '13px', color: '#6B7280', fontWeight: 500 }}>Click to upload logo image</span>
                    </>
                  )}
                </div>
                <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" style={{ display: 'none' }} />
              </div>

              <button 
                type="submit" 
                disabled={saving}
                style={{
                  width: '100%', padding: '14px', background: '#16A34A', color: '#FFFFFF',
                  border: 'none', borderRadius: '12px', fontSize: '15px', fontWeight: 700,
                  cursor: saving ? 'not-allowed' : 'pointer', marginTop: '8px',
                  opacity: saving ? 0.7 : 1,
                }}
              >
                {saving ? 'Saving...' : 'Save Method'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {isEditModalOpen && editingMethod && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px',
        }}>
          <div style={{
            background: '#FFFFFF', borderRadius: '20px', width: '100%', maxWidth: '440px',
            padding: '24px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', maxHeight: '90vh', overflowY: 'auto',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#111827', margin: 0 }}>Edit Deposit Method</h2>
              <button onClick={() => { setIsEditModalOpen(false); setEditingMethod(null); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF' }}>
                <svg viewBox="0 0 24 24" style={{ width: '20px', height: '20px' }} fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            {editError && (
              <div style={{ padding: '10px 14px', background: '#FEE2E2', color: '#DC2626', borderRadius: '8px', fontSize: '13px', marginBottom: '16px' }}>
                {editError}
              </div>
            )}

            <form onSubmit={handleEditSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              {/* Provider Selection */}
              <div style={{ position: 'relative' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>Provider Name</label>
                <div 
                  onClick={() => setEditIsDropdownOpen(!editIsDropdownOpen)}
                  style={{
                    padding: '12px', borderRadius: '10px', border: '1px solid #D1D5DB',
                    background: '#FFFFFF', fontSize: '15px', color: '#111827', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  }}
                >
                  <span>{editProviderName}</span>
                  <svg viewBox="0 0 24 24" style={{ width: '18px', height: '18px', color: '#6B7280', transform: editIsDropdownOpen ? 'rotate(180deg)' : 'none' }} fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M19 9l-7 7-7-7" />
                  </svg>
                </div>

                {editIsDropdownOpen && (
                  <div style={{ 
                    position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10,
                    marginTop: '8px', background: '#FFFFFF', border: '1px solid #E5E7EB',
                    borderRadius: '16px', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
                    overflow: 'hidden', maxHeight: '240px', overflowY: 'auto'
                  }}>
                    {providers.map(p => (
                      <div 
                        key={p} 
                        onClick={() => { setEditProviderName(p); setEditIsDropdownOpen(false); }}
                        style={{ 
                          padding: '14px 16px', fontSize: '15px', color: '#111827', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          borderBottom: '1px solid #F3F4F6',
                          background: editProviderName === p ? '#F0FDF4' : '#FFFFFF',
                        }}
                      >
                        <span style={{ fontWeight: editProviderName === p ? 700 : 500 }}>{p}</span>
                        {editProviderName === p && (
                          <svg viewBox="0 0 24 24" style={{ width: '20px', height: '20px', color: '#16A34A' }} fill="none" stroke="currentColor" strokeWidth="3">
                            <path d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>Account Name</label>
                <input 
                  type="text" value={editAccountName} onChange={(e) => setEditAccountName(e.target.value)} required
                  placeholder="e.g. MiraclBet PLC"
                  style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #D1D5DB', background: '#FFFFFF', fontSize: '15px', color: '#111827', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>Account Number / Phone</label>
                <input 
                  type="tel" 
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={editAccountNumber} 
                  onChange={(e) => setEditAccountNumber(e.target.value.replace(/\D/g, ''))} 
                  required
                  placeholder="e.g. 1000123456789 or 0911223344"
                  style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #D1D5DB', background: '#FFFFFF', fontSize: '15px', color: '#111827', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                  Minimum Deposit Amount (Br)
                </label>
                <input 
                  type="number"
                  min="1"
                  step="any"
                  inputMode="decimal"
                  value={editMinDepositInput}
                  onChange={(e) => setEditMinDepositInput(e.target.value)}
                  placeholder="450"
                  required
                  style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #D1D5DB', background: '#FFFFFF', fontSize: '15px', color: '#111827', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>Logo (Optional)</label>
                <div 
                  onClick={() => editFileInputRef.current?.click()}
                  style={{
                    border: '2px dashed #D1D5DB', borderRadius: '12px', padding: editLogoPreview ? '12px' : '24px',
                    textAlign: 'center', cursor: 'pointer', background: '#F9FAFB',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px'
                  }}
                >
                  {editLogoPreview ? (
                    <div style={{ position: 'relative', width: '64px', height: '64px' }}>
                      <img src={editLogoPreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    </div>
                  ) : (
                    <>
                      <svg viewBox="0 0 24 24" style={{ width: '28px', height: '28px', color: '#9CA3AF' }} fill="none" stroke="currentColor" strokeWidth="1.8">
                        <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span style={{ fontSize: '13px', color: '#6B7280', fontWeight: 500 }}>Click to change logo</span>
                    </>
                  )}
                </div>
                <input type="file" ref={editFileInputRef} onChange={handleEditFileChange} accept="image/*" style={{ display: 'none' }} />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                <button 
                  type="submit" 
                  disabled={savingEdit}
                  style={{
                    flex: 1, padding: '14px', background: '#16A34A', color: '#FFFFFF',
                    border: 'none', borderRadius: '12px', fontSize: '15px', fontWeight: 700,
                    cursor: savingEdit ? 'not-allowed' : 'pointer',
                    opacity: savingEdit ? 0.7 : 1,
                  }}
                >
                  {savingEdit ? 'Saving Changes...' : 'Save Changes'}
                </button>
                <button 
                  type="button" 
                  onClick={() => { setIsEditModalOpen(false); setEditingMethod(null); }}
                  style={{
                    padding: '14px 18px', background: '#F3F4F6', color: '#374151',
                    border: 'none', borderRadius: '12px', fontSize: '15px', fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
