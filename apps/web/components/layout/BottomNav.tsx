'use client';

import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Sidebar } from './Sidebar';

export function BottomNav() {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isActive = (href: string) => pathname === href;

  return (
    <>
      {/* Sidebar — triggered by Menu button */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onSelectSport={() => setSidebarOpen(false)}
        onSelectLeague={() => setSidebarOpen(false)}
      />

      {/* Bottom Nav Bar — mobile only */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0A0E1A] border-t border-[#1E293B]">
        <div className="grid grid-cols-5 h-[58px]">

          {/* Sport */}
          <Link
            href="/"
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
          </Link>

          {/* Deposit */}
          <Link
            href="/deposit"
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
          </Link>

          {/* Check (My Bets) */}
          <Link
            href="/bets"
            className={`flex flex-col items-center justify-center gap-[3px] transition-colors ${
              isActive('/bets') ? 'text-[#19E66B]' : 'text-gray-400 hover:text-white'
            }`}
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M9 11l3 3L22 4"/>
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
            </svg>
            <span className="text-[9px] font-semibold leading-none">Check</span>
          </Link>

          {/* Bet Slip */}
          <Link
            href="/betslip"
            className={`flex flex-col items-center justify-center gap-[3px] transition-colors ${
              isActive('/betslip') ? 'text-[#19E66B]' : 'text-gray-400 hover:text-white'
            }`}
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="9" y1="13" x2="15" y2="13"/>
              <line x1="9" y1="17" x2="12" y2="17"/>
            </svg>
            <span className="text-[9px] font-semibold leading-none">Betslip</span>
          </Link>

          {/* Menu */}
          <button
            onClick={() => setSidebarOpen(true)}
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
