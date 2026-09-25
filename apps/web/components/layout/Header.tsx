'use client';

import React from 'react';
import { useRouter } from 'next/navigation';

export function Header() {
  const router = useRouter();

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
        <span 
          onClick={() => router.push('/')}
          style={{ cursor: 'pointer', fontSize: '22px', fontWeight: 900, letterSpacing: '-0.5px', lineHeight: 1, userSelect: 'none' }}
        >
          <span style={{ color: '#FFFFFF' }}>Miracl</span>
          <span style={{ color: '#19E66B' }}>Bet</span>
        </span>

        {/* Auth Buttons */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span
            onClick={() => router.push('/login')}
            style={{
              cursor: 'pointer',
              padding: '6px 16px',
              fontSize: '13px',
              fontWeight: 600,
              color: '#FFFFFF',
              border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: '6px',
              display: 'inline-block',
              userSelect: 'none',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            Log In
          </span>
          <span
            onClick={() => router.push('/register')}
            style={{
              cursor: 'pointer',
              padding: '6px 16px',
              fontSize: '13px',
              fontWeight: 700,
              color: '#000000',
              background: '#F5A623',
              borderRadius: '6px',
              display: 'inline-block',
              userSelect: 'none',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            Registration
          </span>
        </div>

      </div>
    </header>
  );
}
