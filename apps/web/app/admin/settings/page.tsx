'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminSettingsPage() {
  const router = useRouter();
  const [feeAccount, setFeeAccount] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState({ text: '', type: '' });

  const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch(`${API}/api/v1/settings`);
      if (res.ok) {
        const data = await res.json();
        setFeeAccount(data.fee_account || '');
      }
    } catch (err) {
      console.error('Failed to load settings', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMsg({ text: '', type: '' });
    try {
      const res = await fetch(`${API}/api/v1/admin/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fee_account: feeAccount }),
      });
      if (res.ok) {
        setMsg({ text: 'Settings saved successfully', type: 'success' });
      } else {
        setMsg({ text: 'Failed to save settings', type: 'error' });
      }
    } catch (err) {
      setMsg({ text: 'Network error', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div style={{ padding: 20 }}>Loading settings...</div>;
  }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button 
          onClick={() => router.push('/admin')}
          style={{ background: '#f3f4f6', border: 'none', padding: '8px 12px', borderRadius: 8, cursor: 'pointer' }}
        >
          ← Back
        </button>
        <h1 style={{ fontSize: 24, fontWeight: 'bold', margin: 0 }}>Global Settings</h1>
      </div>

      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 24 }}>
        <h2 style={{ fontSize: 18, fontWeight: '600', marginBottom: 16 }}>Withdrawal Fee Payment Account</h2>
        <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 16 }}>
          This is the account information displayed to users when they try to withdraw their winnings. They will be instructed to pay a 15% Betting Agreement fee and a 10% Agent Fee to this account.
        </p>

        {msg.text && (
          <div style={{ 
            padding: 12, borderRadius: 8, marginBottom: 16,
            background: msg.type === 'success' ? '#d1fae5' : '#fee2e2',
            color: msg.type === 'success' ? '#065f46' : '#991b1b'
          }}>
            {msg.text}
          </div>
        )}

        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 8, color: '#374151' }}>
            Fee Account Details
          </label>
          <textarea
            value={feeAccount}
            onChange={(e) => setFeeAccount(e.target.value)}
            rows={4}
            placeholder="e.g. Commercial Bank of Ethiopia (CBE)&#10;Account: 1000123456789&#10;Name: MiraclBet"
            style={{
              width: '100%', padding: '12px', borderRadius: '8px',
              border: '1px solid #d1d5db', fontSize: 15, fontFamily: 'inherit'
            }}
          />
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            background: '#F5A623', color: '#fff', border: 'none',
            padding: '12px 24px', borderRadius: 8, fontWeight: 600,
            cursor: saving ? 'not-allowed' : 'pointer',
            opacity: saving ? 0.7 : 1
          }}
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
}
