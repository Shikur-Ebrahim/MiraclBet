'use client';

import React, { useEffect, useState } from 'react';

export function Header() {
  const [user, setUser] = useState<{ phone: string; role: string } | null>(null);

  useEffect(() => {
    // Check if user is logged in
    const savedUser = localStorage.getItem('miraclbet_user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        // ignore
      }
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('miraclbet_user');
    setUser(null);
    window.location.href = '/';
  };

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

        {/* Auth Buttons or Profile */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {user ? (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              {/* Profile button (just visual for now, or link to admin if admin) */}
              <a
                href={user.role === 'ADMIN' ? '/admin' : '#'}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.1)',
                  color: '#FFFFFF',
                  textDecoration: 'none',
                  border: '1px solid rgba(255,255,255,0.2)'
                }}
              >
                <svg viewBox="0 0 24 24" style={{ width: '18px', height: '18px' }} fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </a>
              {/* Logout button */}
              <button
                onClick={handleLogout}
                style={{
                  cursor: 'pointer',
                  padding: '6px 12px',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#ef4444',
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                  borderRadius: '6px',
                }}
              >
                Logout
              </button>
            </div>
          ) : (
            <>
              <a
                href="/login"
                style={{
                  textDecoration: 'none',
                  padding: '7px 16px',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#FFFFFF',
                  border: '1px solid rgba(255,255,255,0.4)',
                  borderRadius: '6px',
                  display: 'inline-block',
                  whiteSpace: 'nowrap',
                }}
              >
                Log In
              </a>
              <a
                href="/register"
                style={{
                  textDecoration: 'none',
                  padding: '7px 16px',
                  fontSize: '13px',
                  fontWeight: 700,
                  color: '#000000',
                  background: '#F5A623',
                  borderRadius: '6px',
                  display: 'inline-block',
                  whiteSpace: 'nowrap',
                }}
              >
                Registration
              </a>
            </>
          )}
        </div>

      </div>
    </header>
  );
}
