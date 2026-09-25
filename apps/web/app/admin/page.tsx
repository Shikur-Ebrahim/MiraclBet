'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type UserSession = { phone: string; role: string; balance?: number; id?: string };

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

  const stats = [
    { label: 'Total Users', value: '1,248', icon: '👤', color: '#3B82F6' },
    { label: 'Active Bets', value: '342', icon: '🎯', color: '#10B981' },
    { label: "Today's Revenue", value: 'Br 45,200', icon: '💰', color: '#F59E0B' },
    { label: 'Pending Deposits', value: '12', icon: '⏳', color: '#EF4444' },
  ];

  const menuItems = [
    { label: 'Users', icon: '👥', desc: 'Manage user accounts' },
    { label: 'Workers', icon: '🔧', desc: 'Manage worker accounts' },
    { label: 'Deposits', icon: '💳', desc: 'Review deposit requests' },
    { label: 'Withdrawals', icon: '🏧', desc: 'Review withdrawal requests' },
    { label: 'Bet History', icon: '📋', desc: 'View all bets placed' },
    { label: 'Settings', icon: '⚙️', desc: 'System configuration' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC', fontFamily: 'system-ui, sans-serif' }}>

      {/* Top Bar */}
      <div style={{
        background: '#FFFFFF', borderBottom: '1px solid #E5E7EB',
        padding: '12px 16px', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100,
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
      }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: '16px', color: '#111827' }}>
            Miracl<span style={{ color: '#16A34A' }}>Bet</span>{' '}
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#6B7280', background: '#F3F4F6', padding: '2px 8px', borderRadius: '999px' }}>ADMIN</span>
          </div>
          <div style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '1px' }}>ID: {shortId}</div>
        </div>
        <button
          onClick={handleLogout}
          style={{
            background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA',
            borderRadius: '8px', padding: '7px 14px', fontSize: '13px',
            fontWeight: 600, cursor: 'pointer',
          }}
        >
          Logout
        </button>
      </div>

      <div style={{ padding: '16px', maxWidth: '600px', margin: '0 auto' }}>

        {/* Welcome */}
        <div style={{ marginBottom: '20px' }}>
          <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#111827', margin: 0 }}>Dashboard</h1>
          <p style={{ fontSize: '13px', color: '#6B7280', margin: '4px 0 0' }}>Welcome back, Administrator</p>
        </div>

        {/* Stats grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '24px' }}>
          {stats.map((s) => (
            <div key={s.label} style={{
              background: '#FFFFFF', borderRadius: '12px', padding: '14px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.08)', border: '1px solid #F3F4F6',
            }}>
              <div style={{ fontSize: '22px', marginBottom: '6px' }}>{s.icon}</div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '2px' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Menu items */}
        <div style={{ background: '#FFFFFF', borderRadius: '14px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', border: '1px solid #F3F4F6' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #F3F4F6' }}>
            <h2 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#374151' }}>Management</h2>
          </div>
          {menuItems.map((item, i) => (
            <div
              key={item.label}
              style={{
                display: 'flex', alignItems: 'center', gap: '14px',
                padding: '14px 16px', cursor: 'pointer',
                borderBottom: i < menuItems.length - 1 ? '1px solid #F9FAFB' : 'none',
                background: '#FFFFFF',
              }}
            >
              <div style={{
                width: '38px', height: '38px', borderRadius: '10px',
                background: '#F3F4F6', display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: '18px', flexShrink: 0,
              }}>
                {item.icon}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>{item.label}</div>
                <div style={{ fontSize: '12px', color: '#9CA3AF' }}>{item.desc}</div>
              </div>
              <svg viewBox="0 0 24 24" style={{ width: '16px', height: '16px', color: '#D1D5DB' }} fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </div>
          ))}
        </div>

        {/* Create worker */}
        <button style={{
          marginTop: '16px', width: '100%', padding: '14px',
          background: '#16A34A', color: '#FFFFFF',
          border: 'none', borderRadius: '12px',
          fontSize: '15px', fontWeight: 700, cursor: 'pointer',
          boxShadow: '0 2px 8px rgba(22,163,74,0.3)',
        }}>
          + Create New Worker Account
        </button>

        <div style={{ height: '32px' }} />
      </div>
    </div>
  );
}
