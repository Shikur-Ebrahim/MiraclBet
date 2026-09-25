'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';

type UserSession = { phone: string; role: string; balance?: number; id?: string };

export function Header() {
  const [user, setUser] = useState<UserSession | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const loadUser = () => {
    const savedUser = localStorage.getItem('miraclbet_user');
    if (savedUser) {
      try { setUser(JSON.parse(savedUser)); } catch { setUser(null); }
    } else {
      setUser(null);
    }
  };

  useEffect(() => {
    // Load immediately on mount
    loadUser();

    // Listen for storage changes across tabs + same-tab custom event
    const onStorage = () => loadUser();
    window.addEventListener('storage', onStorage);
    window.addEventListener('miraclbet_auth_change', onStorage);

    const onClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);

    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('miraclbet_auth_change', onStorage);
      document.removeEventListener('mousedown', onClickOutside);
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('miraclbet_user');
    loadUser();
    setDropdownOpen(false);
    window.location.href = '/';
  };

  // Short ID from user id (last 6 chars) or phone last 6 digits
  const shortId = user?.id ? user.id.slice(-6).toUpperCase() : user?.phone?.slice(-6) ?? '------';
  const balance = user?.balance ?? 0;

  return (
    <header style={{ 
      position: 'sticky', 
      top: 0, 
      zIndex: 9999, 
      background: '#0A0E1A', 
      borderBottom: '1px solid #1E293B',
      width: '100%'
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
            <div style={{ position: 'relative' }} ref={dropdownRef}>

              {/* Balance pill + profile icon clickable trigger */}
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  background: 'none', border: 'none', cursor: 'pointer', padding: 0
                }}
              >
                {/* Balance pill */}
                <div style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'flex-end',
                  background: 'rgba(25,230,107,0.08)', border: '1px solid rgba(25,230,107,0.25)',
                  borderRadius: '8px', padding: '3px 10px', minWidth: '80px'
                }}>
                  <span style={{ fontSize: '9px', color: '#9CA3AF', lineHeight: 1, marginBottom: '1px' }}>Balance</span>
                  <span style={{ fontSize: '14px', fontWeight: 800, color: '#19E66B', lineHeight: 1 }}>
                    {balance.toFixed(2)} Br
                  </span>
                </div>
                {/* Profile circle */}
                <div style={{
                  width: '34px', height: '34px', borderRadius: '50%',
                  background: '#F5A623', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', fontWeight: 900, fontSize: '12px', color: '#000',
                  border: '2px solid rgba(245,166,35,0.4)', flexShrink: 0,
                }}>
                  {shortId.slice(-2)}
                </div>
              </button>

              {/* Dropdown */}
              {dropdownOpen && (
                <div style={{
                  position: 'absolute', top: 'calc(100% + 8px)', right: 0,
                  width: '220px', background: '#111827',
                  border: '1px solid #1E293B', borderRadius: '12px',
                  overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
                }}>
                  {/* Profile header */}
                  <div style={{ padding: '16px', textAlign: 'center', borderBottom: '1px solid #1E293B' }}>
                    <div style={{
                      width: '56px', height: '56px', borderRadius: '50%',
                      background: '#F5A623', display: 'flex', alignItems: 'center',
                      justifyContent: 'center', fontWeight: 900, fontSize: '18px',
                      color: '#000', margin: '0 auto 10px'
                    }}>
                      {shortId.slice(-2)}
                    </div>
                    <div style={{
                      background: '#1A2235', borderRadius: '6px', padding: '5px 10px',
                      fontSize: '12px', color: '#9CA3AF', marginBottom: '8px'
                    }}>
                      Your ID — {shortId}
                    </div>
                    <div style={{ background: '#1A2235', borderRadius: '6px', padding: '8px 10px' }}>
                      <div style={{ fontSize: '10px', color: '#9CA3AF', marginBottom: '2px', textAlign: 'left' }}>Balance</div>
                      <div style={{ fontSize: '20px', fontWeight: 900, color: '#FFFFFF', textAlign: 'right' }}>
                        {balance.toFixed(2)} <span style={{ color: '#F5A623' }}>Br</span>
                      </div>
                    </div>
                  </div>

                  {/* Deposit button */}
                  <div style={{ padding: '10px 12px', borderBottom: '1px solid #1E293B' }}>
                    <Link href="/deposit" onClick={() => setDropdownOpen(false)} style={{
                      display: 'block', textAlign: 'center', padding: '11px',
                      background: '#F5A623', color: '#000', fontWeight: 800,
                      fontSize: '14px', borderRadius: '8px', textDecoration: 'none',
                    }}>
                      Deposit
                    </Link>
                  </div>

                  {/* Menu items */}
                  {[
                    { label: 'Withdrawal', href: '/withdraw' },
                    { label: 'Transaction History', href: '/transactions' },
                    { label: 'Bet History', href: '/bets' },
                    { label: 'Betslip Check', href: '/betslip' },
                    ...(user.role === 'ADMIN' ? [{ label: 'Admin Dashboard', href: '/admin' }] : []),
                  ].map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setDropdownOpen(false)}
                      style={{
                        display: 'block', padding: '12px 16px', fontSize: '14px',
                        color: '#FFFFFF', textDecoration: 'none',
                        borderBottom: '1px solid #1E293B',
                      }}
                    >
                      {item.label}
                    </Link>
                  ))}

                  <button onClick={handleLogout} style={{
                    display: 'block', width: '100%', padding: '12px 16px',
                    fontSize: '14px', fontWeight: 600, color: '#ef4444',
                    background: 'transparent', border: 'none',
                    textAlign: 'left', cursor: 'pointer',
                  }}>
                    Log out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <a href="/login" style={{
                textDecoration: 'none', padding: '7px 16px', fontSize: '13px',
                fontWeight: 600, color: '#FFFFFF',
                border: '1px solid rgba(255,255,255,0.4)', borderRadius: '6px',
                display: 'inline-block', whiteSpace: 'nowrap',
              }}>
                Log In
              </a>
              <a href="/register" style={{
                textDecoration: 'none', padding: '7px 16px', fontSize: '13px',
                fontWeight: 700, color: '#000000', background: '#F5A623',
                borderRadius: '6px', display: 'inline-block', whiteSpace: 'nowrap',
              }}>
                Registration
              </a>
            </>
          )}
        </div>

      </div>
    </header>
  );
}
