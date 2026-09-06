'use client';

import React from 'react';

export function FullPageLoader() {
  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#0A1810]/70 backdrop-blur-md">
      <div className="flex items-baseline gap-2">
        <span className="text-4xl font-black text-white tracking-tight">
          Miracl<span className="text-[#19E66B]">Bet</span>
        </span>
        <div className="flex gap-1.5 mb-2">
          <div className="w-2.5 h-2.5 rounded-full bg-[#19E66B] animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-2.5 h-2.5 rounded-full bg-[#19E66B] animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-2.5 h-2.5 rounded-full bg-[#19E66B] animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  );
}
