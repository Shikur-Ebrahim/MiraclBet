'use client';

import React from 'react';
import Image from 'next/image';

const GAMES = [
  { key: 'keno',         label: 'Keno',        image: '/games/keno.png' },
  { key: 'burning-board',label: 'Burning Board',image: '/games/burning-board.png' },
  { key: 'hitslot',      label: 'Hit Slot',     image: '/games/hitslot.png' },
  { key: 'aviator',      label: 'Aviator',      image: '/games/aviator.png' },
];

export function GamesSection() {
  return (
    <div style={{ background: '#0D1913', borderBottom: '1px solid #1C3026' }}>
      {/* Header row */}
      <div className="flex items-center justify-between px-3 pt-3 pb-1">
        <div className="flex items-center gap-2">
          <span className="text-base">🎮</span>
          <span className="text-[13px] font-bold text-white/80">Games</span>
        </div>
        <button className="text-[11px] font-semibold text-[#19E66B]">
          All Games →
        </button>
      </div>

      {/* Horizontally scrollable game cards */}
      <div
        className="flex overflow-x-auto gap-2.5 px-3 pb-3 pt-1"
        style={{ scrollbarWidth: 'none' }}
      >
        {GAMES.map((game) => (
          <button
            key={game.key}
            className="shrink-0 flex flex-col items-center gap-1 transition-transform hover:scale-105 active:scale-95"
          >
            <div
              className="relative overflow-hidden rounded-xl"
              style={{ width: 90, height: 90 }}
            >
              <Image
                src={game.image}
                alt={game.label}
                fill
                className="object-cover"
                unoptimized
              />
            </div>
            <span className="text-[11px] font-semibold text-white/60 whitespace-nowrap">
              {game.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
