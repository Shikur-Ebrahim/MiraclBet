'use client';

import React from 'react';
import Link from 'next/link';

export function Header() {
  return (
    <header className="sticky top-0 z-50 bg-[#0A0E1A] border-b border-[#1E293B]">
      <div className="flex items-center justify-between px-4 h-14">

        {/* Logo */}
        <Link href="/" className="flex items-center select-none shrink-0">
          <span className="text-[22px] font-black tracking-tight leading-none">
            <span className="text-white">Miracl</span><span className="text-[#19E66B]">Bet</span>
          </span>
        </Link>

        {/* Auth Buttons — always visible, no hamburger */}
        <div className="flex items-center gap-2">
          <Link href="/login">
            <button className="px-4 py-1.5 text-[13px] font-semibold text-white border border-white/30 rounded-md hover:bg-white/10 transition-colors">
              Log In
            </button>
          </Link>
          <Link href="/register">
            <button className="px-4 py-1.5 text-[13px] font-bold text-black bg-[#19E66B] rounded-md hover:bg-[#14b856] transition-colors">
              Registration
            </button>
          </Link>
        </div>

      </div>
    </header>
  );
}
