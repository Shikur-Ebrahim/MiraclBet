'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';

export function Header() {
  const [user, setUser] = useState<{ phone: string; role: string; balance?: number } | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('miraclbet_user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        // ignore
      }
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
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
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {user ? (
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }} ref={dropdownRef}>
              
              {/* Balance */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center' }}>
                <span style={{ fontSize: '10px', color: '#9CA3AF', lineHeight: 1, marginBottom: '2px' }}>Balance</span>
                <span style={{ fontSize: '14px', fontWeight: 700, color: '#19E66B', lineHeight: 1 }}>
                  Br {user.balance ? user.balance.toFixed(2) : '0.00'}
                </span>
              </div>

              {/* Profile Dropdown Container */}
              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: 'rgba(255,255,255,0.1)',
                    color: '#FFFFFF',
                    border: '1px solid rgba(255,255,255,0.2)',
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  <svg viewBox="0 0 24 24" style={{ width: '20px', height: '20px' }} fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </button>

                {/* Dropdown Menu */}
                {dropdownOpen && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    marginTop: '8px',
                    width: '160px',
                    background: '#111827',
                    border: '1px solid #1E293B',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.5)',
                    display: 'flex',
                    flexDirection: 'column',
                  }}>
                    {user.role === 'ADMIN' && (
                      <Link 
                        href="/admin"
                        onClick={() => setDropdownOpen(false)}
                        style={{ padding: '12px 16px', fontSize: '14px', color: '#FFFFFF', textDecoration: 'none', borderBottom: '1px solid #1E293B' }}
                      >
                        Admin Dashboard
                      </Link>
                    )}
                    <Link 
                      href="/deposit"
                      onClick={() => setDropdownOpen(false)}
                      style={{ padding: '12px 16px', fontSize: '14px', color: '#FFFFFF', textDecoration: 'none', borderBottom: '1px solid #1E293B' }}
                    >
                      Deposit
                    </Link>
                    <Link 
                      href="/withdraw"
                      onClick={() => setDropdownOpen(false)}
                      style={{ padding: '12px 16px', fontSize: '14px', color: '#FFFFFF', textDecoration: 'none', borderBottom: '1px solid #1E293B' }}
                    >
                      Withdraw
                    </Link>
                    <button
                      onClick={handleLogout}
                      style={{
                        padding: '12px 16px',
                        fontSize: '14px',
                        fontWeight: 600,
                        color: '#ef4444',
                        background: 'transparent',
                        border: 'none',
                        textAlign: 'left',
                        cursor: 'pointer',
                      }}
                    >
                      Logout
                    </button>
                  </div>
                )}
              </div>
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
