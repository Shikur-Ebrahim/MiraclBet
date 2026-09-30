'use client';

import React from 'react';

export default function MobileAppsPage() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px 20px', textAlign: 'center' }}>
      <h1 style={{ fontSize: '32px', fontWeight: 900, marginBottom: '16px', color: '#FFF' }}>MiraclBet Mobile App</h1>
      <p style={{ color: '#9CA3AF', fontSize: '16px', maxWidth: '500px', lineHeight: 1.6, marginBottom: '40px' }}>
        With the MiraclBet mobile app, customers can quickly and easily place bets on their favorite sports anytime, anywhere.
      </p>
      
      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center' }}>
        <button style={{ 
          background: '#111827', border: '1px solid #1E293B', padding: '16px 24px', borderRadius: '12px',
          display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer'
        }}>
          <span style={{ fontSize: '24px' }}>🤖</span>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: '11px', color: '#9CA3AF', fontWeight: 600, textTransform: 'uppercase' }}>Download for</div>
            <div style={{ fontSize: '16px', fontWeight: 800, color: '#FFF' }}>Android</div>
          </div>
        </button>

        <button style={{ 
          background: '#111827', border: '1px solid #1E293B', padding: '16px 24px', borderRadius: '12px',
          display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer'
        }}>
          <span style={{ fontSize: '24px' }}>🍎</span>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: '11px', color: '#9CA3AF', fontWeight: 600, textTransform: 'uppercase' }}>Download on the</div>
            <div style={{ fontSize: '16px', fontWeight: 800, color: '#FFF' }}>App Store</div>
          </div>
        </button>
      </div>
    </div>
  );
}
