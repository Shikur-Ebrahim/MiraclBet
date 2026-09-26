'use client';

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';

// Lazy import Sidebar only when needed
import dynamic from 'next/dynamic';
const Sidebar = dynamic(() => import('./Sidebar').then(m => ({ default: m.Sidebar })), { ssr: false });

export function BottomNav() {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarMounted, setSidebarMounted] = useState(false);
  const [betCount, setBetCount] = useState(0);

  const isActive = (href: string) => pathname === href;

  const openSidebar = () => {
    setSidebarMounted(true);
    setSidebarOpen(true);
  };

  // Live badge count from betslip localStorage
  useEffect(() => {
    const load = () => {
      const stored = localStorage.getItem('miraclbet_betslip');
      try {
        const arr = stored ? JSON.parse(stored) : [];
        setBetCount(Array.isArray(arr) ? arr.length : 0);
      } catch { setBetCount(0); }
    };
    load();
    window.addEventListener('miraclbet_betslip_change', load);
    window.addEventListener('storage', load);
    window.addEventListener('pageshow', load);
    window.addEventListener('focus', load);
    return () => {
      window.removeEventListener('miraclbet_betslip_change', load);
      window.removeEventListener('storage', load);
      window.removeEventListener('pageshow', load);
      window.removeEventListener('focus', load);
    };
  }, []);

  return (
    <>
      {/* Sidebar — only mounted when Menu is clicked for the first time */}
      {sidebarMounted && (
        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          onSelectSport={() => setSidebarOpen(false)}
          onSelectLeague={() => setSidebarOpen(false)}
        />
      )}

      {/* Bottom Nav Bar — mobile only */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0A0E1A] border-t border-[#1E293B]">
        <div className="grid grid-cols-5 h-[58px]">

          {/* Sport */}
          <button
            onClick={() => window.location.href = '/'}
            className={`flex flex-col items-center justify-center gap-[3px] transition-colors ${
              isActive('/') ? 'text-[#19E66B]' : 'text-gray-400 hover:text-white'
            }`}
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
              <path d="M2 12h20"/>
            </svg>
            <span className="text-[9px] font-semibold leading-none">Sport</span>
          </button>

          {/* Deposit */}
          <button
            onClick={() => window.location.href = '/deposit'}
            className={`flex flex-col items-center justify-center gap-[3px] transition-colors ${
              isActive('/deposit') ? 'text-[#19E66B]' : 'text-gray-400 hover:text-white'
            }`}
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8">
              <rect x="2" y="5" width="20" height="14" rx="2"/>
              <path d="M2 10h20"/>
              <circle cx="12" cy="15" r="1.5" fill="currentColor"/>
            </svg>
            <span className="text-[9px] font-semibold leading-none">Deposit</span>
          </button>

          {/* Check (My Bets) */}
          <button
            onClick={() => window.location.href = '/bets'}
            className={`flex flex-col items-center justify-center gap-[3px] transition-colors ${
              isActive('/bets') ? 'text-[#19E66B]' : 'text-gray-400 hover:text-white'
            }`}
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M9 11l3 3L22 4"/>
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
            </svg>
            <span className="text-[9px] font-semibold leading-none">Check</span>
          </button>

          {/* Bet Slip — with count badge */}
          <button
            onClick={() => window.location.href = '/betslip'}
            className={`flex flex-col items-center justify-center gap-[3px] transition-colors relative ${
              isActive('/betslip') ? 'text-[#19E66B]' : 'text-gray-400 hover:text-white'
            }`}
          >
            {/* Badge */}
            {betCount > 0 && (
              <span
                className="absolute top-1 right-[14px] min-w-[16px] h-4 rounded-full flex items-center justify-center text-[9px] font-black"
                style={{ background: '#EF4444', color: '#fff', padding: '0 3px', lineHeight: 1 }}
              >
                {betCount}
              </span>
            )}
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="9" y1="13" x2="15" y2="13"/>
              <line x1="9" y1="17" x2="12" y2="17"/>
            </svg>
            <span className="text-[9px] font-semibold leading-none">Betslip</span>
          </button>

          {/* Menu */}
          <button
            onClick={openSidebar}
            className={`flex flex-col items-center justify-center gap-[3px] transition-colors ${
              sidebarOpen ? 'text-[#19E66B]' : 'text-gray-400 hover:text-white'
            }`}
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8">
              <line x1="3" y1="6" x2="21" y2="6"/>
              <line x1="3" y1="12" x2="21" y2="12"/>
              <line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
            <span className="text-[9px] font-semibold leading-none">Menu</span>
          </button>

        </div>
      </nav>

      {/* Spacer so page content isn't hidden behind the bottom nav */}
      <div className="md:hidden h-[58px]" />
    </>
  );
}
