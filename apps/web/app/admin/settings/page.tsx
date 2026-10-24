'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminSettingsPage() {
  const router = useRouter();
  const [withdrawalRuleEnabled, setWithdrawalRuleEnabled] = useState(true);
  const [withdrawalRuleAmount, setWithdrawalRuleAmount] = useState('8999');
  const [withdrawalRuleTitle, setWithdrawalRuleTitle] = useState('Withdrawal Rule Requirement');
  const [withdrawalRuleMessage, setWithdrawalRuleMessage] = useState(
    'Before making a withdrawal, your account must reach a total deposit history of at least 8,999 Br. Please make a deposit to fulfill the requirement and activate withdrawals.'
  );

  const [contactPhone, setContactPhone] = useState('');
  const [telegramUsername, setTelegramUsername] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState({ text: '', type: '' });

  const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

  useEffect(() => {
    const saved = localStorage.getItem('miraclbet_user');
    if (!saved) { router.push('/login'); return; }
    const u = JSON.parse(saved);
    if (u.role !== 'ADMIN' && u.role !== 'SUPER_ADMIN') { router.push('/'); return; }
    fetchSettings();
  }, [router]);

  const fetchSettings = async () => {
    try {
      const res = await fetch(`${API}/api/v1/settings`);
      if (res.ok) {
        const data = await res.json();
        if (data.withdrawal_rule_enabled !== undefined) {
          setWithdrawalRuleEnabled(data.withdrawal_rule_enabled !== 'false');
        }
        if (data.withdrawal_rule_amount) {
          setWithdrawalRuleAmount(data.withdrawal_rule_amount);
        }
        if (data.withdrawal_rule_title) {
          setWithdrawalRuleTitle(data.withdrawal_rule_title);
        }
        if (data.withdrawal_rule_message) {
          const amt = data.withdrawal_rule_amount || '8999';
          const formatted = Number(amt).toLocaleString();
          setWithdrawalRuleMessage(
            data.withdrawal_rule_message
              .replace(/7,?500(?:\.00)?\s*(?:Br)?/gi, `${formatted} Br`)
              .replace(/\{amount\}/gi, `${formatted} Br`)
          );
        }
        setContactPhone(data.contact_phone || '');
        setTelegramUsername(data.telegram_username || '');
      }
    } catch (err) {
      console.error('Failed to load settings', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAmountChange = (newAmt: string) => {
    setWithdrawalRuleAmount(newAmt);
    const num = parseFloat(newAmt);
    if (!isNaN(num) && num > 0) {
      const formatted = num.toLocaleString();
      setWithdrawalRuleMessage(prev =>
        prev.replace(/\b(?:7,?500|8,?999|\d[\d,]*)\s*(?:Br)?/gi, `${formatted} Br`)
      );
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMsg({ text: '', type: '' });
    try {
      const res = await fetch(`${API}/api/v1/admin/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          withdrawal_rule_enabled: String(withdrawalRuleEnabled),
          withdrawal_rule_amount: withdrawalRuleAmount || '8999',
          withdrawal_rule_title: withdrawalRuleTitle,
          withdrawal_rule_message: withdrawalRuleMessage,
          contact_phone: contactPhone,
          telegram_username: telegramUsername
        }),
      });
      if (res.ok) {
        setMsg({ text: 'Settings updated successfully!', type: 'success' });
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
    return <div style={{ padding: 24, color: '#6B7280' }}>Loading settings...</div>;
  }

  return (
    <div style={{ maxWidth: 840, margin: '0 auto', padding: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button 
          onClick={() => router.push('/admin')}
          style={{ background: '#F3F4F6', border: 'none', padding: '8px 14px', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}
        >
          ← Back to Dashboard
        </button>
        <h1 style={{ fontSize: 24, fontWeight: 'bold', margin: 0, color: '#111827' }}>Global Settings & Rules</h1>
      </div>

      {msg.text && (
        <div style={{ 
          padding: 14, borderRadius: 10, marginBottom: 20,
          background: msg.type === 'success' ? '#DEF7EC' : '#FDE8E8',
          border: `1px solid ${msg.type === 'success' ? '#31C48D' : '#F98080'}`,
          color: msg.type === 'success' ? '#03543F' : '#9B1C1C',
          fontWeight: 600, fontSize: 14
        }}>
          {msg.text}
        </div>
      )}

      {/* WITHDRAWAL RULE CONFIGURATION */}
      <div style={{ background: '#FFFFFF', border: '1.5px solid #E5E7EB', borderRadius: 16, padding: 24, marginBottom: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 6px 0', color: '#111827', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>📜</span> Withdrawal Rule Configuration
            </h2>
            <p style={{ fontSize: 14, color: '#6B7280', margin: 0 }}>
              Control the deposit requirement rule users must fulfill before they can request a withdrawal.
            </p>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input 
              type="checkbox" 
              checked={withdrawalRuleEnabled} 
              onChange={e => setWithdrawalRuleEnabled(e.target.checked)}
              style={{ width: 18, height: 18, accentColor: '#F5A623', cursor: 'pointer' }}
            />
            <span style={{ fontSize: 14, fontWeight: 700, color: withdrawalRuleEnabled ? '#10B981' : '#6B7280' }}>
              {withdrawalRuleEnabled ? 'Rule Active' : 'Rule Disabled'}
            </span>
          </label>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 20 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 6, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Required Total Deposit History (Br)
            </label>
            <input
              type="number"
              min="0"
              step="any"
              value={withdrawalRuleAmount}
              onChange={(e) => handleAmountChange(e.target.value)}
              placeholder="8999"
              style={{
                width: '100%', padding: '12px 14px', borderRadius: 10,
                border: '1.5px solid #D1D5DB', fontSize: 16, fontWeight: 700, color: '#111827', outline: 'none'
              }}
            />
            <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 4 }}>
              Default is <b>8,999 Br</b>. If the user's total approved deposits are below this amount, withdrawal requests are blocked.
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 6, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Rule Title (Shown to User)
            </label>
            <input
              type="text"
              value={withdrawalRuleTitle}
              onChange={(e) => setWithdrawalRuleTitle(e.target.value)}
              placeholder="Withdrawal Rule Requirement"
              style={{
                width: '100%', padding: '12px 14px', borderRadius: 10,
                border: '1.5px solid #D1D5DB', fontSize: 15, color: '#111827', outline: 'none'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 6, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Rule Explanation Message
            </label>
            <textarea
              value={withdrawalRuleMessage}
              onChange={(e) => setWithdrawalRuleMessage(e.target.value)}
              rows={3}
              placeholder="Explain the requirement to the customer..."
              style={{
                width: '100%', padding: '12px 14px', borderRadius: 10,
                border: '1.5px solid #D1D5DB', fontSize: 14, color: '#111827', outline: 'none', lineHeight: 1.5
              }}
            />
          </div>
        </div>
      </div>

      {/* SUPPORT & CONTACT INFO */}
      <div style={{ background: '#FFFFFF', border: '1.5px solid #E5E7EB', borderRadius: 16, padding: 24, marginBottom: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 6px 0', color: '#111827', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>📞</span> Support & Contact Info
        </h2>
        <p style={{ fontSize: 14, color: '#6B7280', margin: '0 0 16px 0' }}>
          Contact buttons displayed to users on the withdrawal page and support notices.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 6, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Support Phone Number
            </label>
            <input
              type="text"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              placeholder="e.g. +251911234567"
              style={{
                width: '100%', padding: '12px 14px', borderRadius: 10,
                border: '1.5px solid #D1D5DB', fontSize: 15, color: '#111827', outline: 'none'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 6, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Telegram Username or Link
            </label>
            <input
              type="text"
              value={telegramUsername}
              onChange={(e) => setTelegramUsername(e.target.value)}
              placeholder="e.g. @MiraclBetSupport or https://t.me/MiraclBetSupport"
              style={{
                width: '100%', padding: '12px 14px', borderRadius: 10,
                border: '1.5px solid #D1D5DB', fontSize: 15, color: '#111827', outline: 'none'
              }}
            />
          </div>
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        style={{
          background: '#F5A623', color: '#000', border: 'none',
          padding: '14px 28px', borderRadius: 12, fontWeight: 800, fontSize: 16,
          cursor: saving ? 'not-allowed' : 'pointer',
          opacity: saving ? 0.7 : 1, boxShadow: '0 2px 6px rgba(245,166,35,0.3)'
        }}
      >
        {saving ? 'Saving...' : 'Save All Settings'}
      </button>
    </div>
  );
}
