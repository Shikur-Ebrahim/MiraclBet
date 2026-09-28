'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';

type UserSession = { phone: string; role: string; balance?: number; id?: string };

export function Header() {
  const [user, setUser] = useState<UserSession | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);

  const loadUser = () => {
    const savedUser = localStorage.getItem('miraclbet_user');
    if (savedUser) {
      try { setUser(JSON.parse(savedUser)); } catch { setUser(null); }
    } else {
      setUser(null);
    }
  };

  useEffect(() => {
    loadUser();
    const onAuth = () => loadUser();
    window.addEventListener('storage', onAuth);
    window.addEventListener('miraclbet_auth_change', onAuth);
    return () => {
      window.removeEventListener('storage', onAuth);
      window.removeEventListener('miraclbet_auth_change', onAuth);
    };
  }, []);

  // Poll /me every 8 seconds to get live balance updates (e.g. after admin approves deposit)
  useEffect(() => {
    const refreshBalance = async () => {
      const savedUser = localStorage.getItem('miraclbet_user');
      if (!savedUser) return;
      try {
        const u = JSON.parse(savedUser);
        if (!u?.id) return;
        const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
        const res = await fetch(`${API}/api/v1/auth/me?user_id=${u.id}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data?.user?.balance !== undefined) {
          const updated = { ...u, balance: data.user.balance };
          localStorage.setItem('miraclbet_user', JSON.stringify(updated));
          setUser(updated);
        }
      } catch { /* silent */ }
    };

    // Run once immediately, then every 8 seconds
    refreshBalance();
    const interval = setInterval(refreshBalance, 8000);
    return () => clearInterval(interval);
  }, []);

  // Close panel on ESC
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setPanelOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  // Prevent scroll when panel open
  useEffect(() => {
    document.body.style.overflow = panelOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [panelOpen]);

  const handleLogout = () => {
    localStorage.removeItem('miraclbet_user');
    setPanelOpen(false);
    window.location.href = '/';
  };

  const shortId = user?.id ? user.id.slice(-6).toUpperCase() : user?.phone?.slice(-6) ?? '------';
  const balance = user?.balance ?? 0;

  const menuItems = [
    { label: 'Deposit',             href: '/deposit',      icon: '💰',  logout: false },
    { label: 'Withdrawal',          href: '/withdraw',     icon: '💸',  logout: false },
    { label: 'Transaction History', href: '/transactions', icon: '📋',  logout: false },
    { label: 'Bet History',         href: '/bets',         icon: '🎫',  logout: false },
    { label: 'Betslip',             href: '/betslip',      icon: '🎯',  logout: false },
    { label: 'Account Settings',    href: '/account',      icon: '👤',  logout: false },
    ...(user?.role === 'ADMIN' ? [{ label: 'Admin Dashboard', href: '/admin', icon: '⚙️', logout: false }] : []),
    { label: 'Log Out',             href: '#logout',       icon: '🚪',  logout: true  },
  ];

  return (
    <>
      <header style={{ 
        position: 'sticky', top: 0, zIndex: 9999, 
        background: '#0A0E1A', borderBottom: '1px solid #1E293B', width: '100%'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', height: '56px' }}>

          {/* Logo */}
          <a href="/" style={{ textDecoration: 'none', fontSize: '22px', fontWeight: 900, letterSpacing: '-0.5px', lineHeight: 1, userSelect: 'none' }}>
            <span style={{ color: '#FFFFFF' }}>Miracl</span>
            <span style={{ color: '#19E66B' }}>Bet</span>
          </a>

          {/* Auth area */}
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            {user ? (
              <button
                onClick={() => setPanelOpen(true)}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              >
                {/* Balance pill */}
                <div style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'flex-end',
                  background: '#1A2235', border: '1px solid #1E293B',
                  borderRadius: '8px', padding: '3px 10px', minWidth: '80px'
                }}>
                  <span style={{ fontSize: '9px', color: '#9CA3AF', lineHeight: 1, marginBottom: '1px' }}>Balance</span>
                  <span style={{ fontSize: '14px', fontWeight: 800, color: '#FFFFFF', lineHeight: 1 }}>
                    {balance.toFixed(2)} Br
                  </span>
                </div>
                {/* Profile icon circle with 3-dot badge */}
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  {/* Main profile circle */}
                  <div style={{
                    width: '34px', height: '34px', borderRadius: '50%',
                    background: '#1A2235',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: '1px solid #1E293B', color: '#FFFFFF',
                  }}>
                    <svg viewBox="0 0 24 24" style={{ width: '18px', height: '18px' }} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  </div>
                  {/* 3-dot badge at bottom-right of circle */}
                  <div style={{
                    position: 'absolute', bottom: '-2px', right: '-4px',
                    background: '#1A2235', border: '1px solid #1E293B',
                    borderRadius: '8px', padding: '1px 3px',
                    display: 'flex', flexDirection: 'column', gap: '1.5px', alignItems: 'center',
                    color: '#9CA3AF',
                  }}>
                    <svg viewBox="0 0 8 16" style={{ width: '5px', height: '10px' }} fill="currentColor">
                      <circle cx="4" cy="2" r="1.5" />
                      <circle cx="4" cy="8" r="1.5" />
                      <circle cx="4" cy="14" r="1.5" />
                    </svg>
                  </div>
                </div>
              </button>
            ) : (
              <>
                <a href="/login" style={{
                  textDecoration: 'none', padding: '7px 16px', fontSize: '13px',
                  fontWeight: 600, color: '#FFFFFF', border: '1px solid rgba(255,255,255,0.4)',
                  borderRadius: '6px', display: 'inline-block', whiteSpace: 'nowrap',
                }}>Log In</a>
                <a href="/register" style={{
                  textDecoration: 'none', padding: '7px 16px', fontSize: '13px',
                  fontWeight: 700, color: '#000', background: '#F5A623',
                  borderRadius: '6px', display: 'inline-block', whiteSpace: 'nowrap',
                }}>Registration</a>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ── RIGHT PANEL DRAWER ── */}
      {/* Backdrop */}
      {panelOpen && (
        <div
          onClick={() => setPanelOpen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 10000,
            background: 'rgba(0,0,0,0.65)',
            backdropFilter: 'blur(2px)',
          }}
        />
      )}

      {/* Drawer — slides in from right, starts BELOW the 56px sticky header */}
      <div style={{
        position: 'fixed', top: 56, right: 0, bottom: 0, zIndex: 10001,
        width: '280px', maxWidth: '85vw',
        background: '#0F1723',
        transform: panelOpen ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.28s cubic-bezier(0.4,0,0.2,1)',
        display: 'flex', flexDirection: 'column',
        overflowY: 'auto',
        boxShadow: panelOpen ? '-4px 0 24px rgba(0,0,0,0.6)' : 'none',
      }}>

        {/* Drawer header with close */}
        {/* Drawer header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderBottom: '1px solid #1E293B' }}>
          <span style={{ fontWeight: 700, fontSize: '13px', color: '#fff' }}>My Account</span>
          <button onClick={() => setPanelOpen(false)} style={{
            background: 'rgba(255,255,255,0.08)', border: 'none', cursor: 'pointer',
            width: '26px', height: '26px', borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
          }}>
            <svg viewBox="0 0 24 24" style={{ width: '14px', height: '14px' }} fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Profile row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderBottom: '1px solid #1E293B' }}>
          <div style={{
            width: '40px', height: '40px', borderRadius: '50%', background: '#F5A623',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 900, fontSize: '14px', color: '#000', flexShrink: 0,
          }}>
            {shortId.slice(-2)}
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#9CA3AF' }}>ID: {shortId}</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
              <span style={{ fontSize: '18px', fontWeight: 900, color: '#fff' }}>{balance.toFixed(2)}</span>
              <span style={{ fontSize: '12px', fontWeight: 800, color: '#F5A623' }}>Br</span>
            </div>
          </div>
          <a href="/deposit" onClick={() => setPanelOpen(false)} style={{
            marginLeft: 'auto', padding: '7px 14px',
            background: '#F5A623', color: '#000', fontWeight: 800,
            fontSize: '12px', borderRadius: '8px', textDecoration: 'none', whiteSpace: 'nowrap',
          }}>
            Deposit
          </a>
        </div>

        {/* Menu items */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {menuItems.map((item) =>
            item.logout ? (
              <button
                key="logout"
                onClick={handleLogout}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '11px 16px',
                  fontSize: '13px', color: '#ef4444', textDecoration: 'none',
                  borderBottom: '1px solid rgba(255,255,255,0.05)',
                  background: 'transparent', fontWeight: 600,
                  width: '100%', border: 'none', cursor: 'pointer', textAlign: 'left',
                }}
              >
                <span style={{ fontSize: 15, width: 20, textAlign: 'center' }}>{item.icon}</span>
                {item.label}
              </button>
            ) : (
              <a
                key={item.href}
                href={item.href}
                onClick={() => setPanelOpen(false)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '11px 16px',
                  fontSize: '13px', color: item.href === '/bets' ? '#19E66B' : '#FFFFFF',
                  textDecoration: 'none',
                  borderBottom: '1px solid rgba(255,255,255,0.05)',
                  background: item.href === '/bets' ? 'rgba(25,230,107,0.05)' : 'transparent',
                  fontWeight: item.href === '/bets' ? 700 : 400,
                }}
              >
                <span style={{ fontSize: 15, width: 20, textAlign: 'center' }}>{item.icon}</span>
                {item.label}
                {item.href === '/bets' && (
                  <span style={{ marginLeft: 'auto', background: '#19E66B', color: '#072414', fontSize: 8, fontWeight: 800, padding: '2px 5px', borderRadius: 99 }}>HISTORY</span>
                )}
              </a>
            )
          )}
        </div>
      </div>
    </>
  );
}
