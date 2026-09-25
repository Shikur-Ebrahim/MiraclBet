'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type UserSession = { phone: string; role: string; balance?: number; id?: string };

const adminMenus = [
  { label: 'Users', icon: '👤', href: '/admin/users', color: '#3B82F6', bg: '#EFF6FF' },
  { label: 'Workers', icon: '🔧', href: '/admin/workers', color: '#8B5CF6', bg: '#F5F3FF' },
  { label: 'Deposits', icon: '💰', href: '/admin/deposits', color: '#10B981', bg: '#ECFDF5' },
  { label: 'Withdrawals', icon: '🏧', href: '/admin/withdrawals', color: '#F59E0B', bg: '#FFFBEB' },
  { label: 'Deposit Methods', icon: '💳', href: '/admin/deposit-methods', color: '#06B6D4', bg: '#ECFEFF' },
  { label: 'Withdrawal Methods', icon: '🏦', href: '/admin/withdrawal-methods', color: '#EC4899', bg: '#FDF2F8' },
  { label: 'Bets', icon: '🎯', href: '/admin/bets', color: '#EF4444', bg: '#FEF2F2' },
  { label: 'Settings', icon: '⚙️', href: '/admin/settings', color: '#6B7280', bg: '#F9FAFB' },
];

export default function AdminDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<UserSession | null>(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('miraclbet_user');
    if (!savedUser) { router.push('/login'); return; }
    const parsed = JSON.parse(savedUser);
    if (parsed.role !== 'ADMIN') { router.push('/'); return; }
    setUser(parsed);
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('miraclbet_user');
    router.push('/login');
  };

  if (!user) return null;

  const shortId = user.id ? user.id.slice(-6).toUpperCase() : user.phone?.slice(-6) ?? '------';

  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC', fontFamily: 'system-ui, -apple-system, sans-serif' }}>

      {/* Sticky Top Bar */}
      <div style={{
        background: '#FFFFFF', borderBottom: '1px solid #E5E7EB',
        padding: '12px 16px', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100,
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
      }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: '17px', color: '#111827', lineHeight: 1 }}>
            Miracl<span style={{ color: '#16A34A' }}>Bet</span>
            <span style={{
              marginLeft: '8px', fontSize: '10px', fontWeight: 700, color: '#16A34A',
              background: '#DCFCE7', padding: '2px 7px', borderRadius: '999px', verticalAlign: 'middle',
            }}>ADMIN</span>
          </div>
          <div style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '3px' }}>ID: {shortId}</div>
        </div>
        <button
          onClick={handleLogout}
          style={{
            background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA',
            borderRadius: '8px', padding: '8px 14px', fontSize: '13px',
            fontWeight: 700, cursor: 'pointer',
          }}
        >
          Logout
        </button>
      </div>

      {/* Page Content */}
      <div style={{ padding: '20px 16px', maxWidth: '600px', margin: '0 auto' }}>

        {/* Welcome */}
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontSize: '20px', fontWeight: 800, color: '#111827', margin: '0 0 4px' }}>
            Admin Dashboard
          </h1>
          <p style={{ fontSize: '13px', color: '#6B7280', margin: 0 }}>
            Manage your MiraclBet platform
          </p>
        </div>

        {/* 2-column button grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          {adminMenus.map((item) => (
            <button
              key={item.label}
              onClick={() => router.push(item.href)}
              style={{
                background: '#FFFFFF',
                border: `1.5px solid ${item.bg === '#F9FAFB' ? '#E5E7EB' : item.bg}`,
                borderRadius: '16px',
                padding: '20px 14px',
                cursor: 'pointer',
                textAlign: 'left',
                boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                transition: 'box-shadow 0.15s',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}
            >
              {/* Icon circle */}
              <div style={{
                width: '46px', height: '46px', borderRadius: '14px',
                background: item.bg,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '22px',
              }}>
                {item.icon}
              </div>
              {/* Label */}
              <div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#111827', lineHeight: 1.2 }}>
                  {item.label}
                </div>
                <div style={{ marginTop: '4px' }}>
                  <svg viewBox="0 0 24 24" style={{ width: '14px', height: '14px', color: item.color }} fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </button>
          ))}
        </div>

        <div style={{ height: '32px' }} />
      </div>
    </div>
  );
}
