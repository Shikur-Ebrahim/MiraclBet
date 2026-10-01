'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';

const GAME_LABELS: Record<string, { label: string; image: string }> = {
  'keno':           { label: 'Keno',             image: '/games/keno.png' },
  'burning-board':  { label: 'Burning Board',    image: '/games/burning-board.png' },
  'hitslot':        { label: 'Hit Slot',          image: '/games/hitslot.png' },
  'aviator':        { label: 'Aviator',           image: '/games/aviator.png' },
  'catchup':        { label: 'Catch Up!',         image: '/games/catchup.png' },
  'crashx':         { label: 'Crash X',           image: '/games/crashx.png' },
  'hot-to-burn':    { label: 'Hot to Burn',       image: '/games/hot-to-burn.png' },
  'jetx':           { label: 'JetX',              image: '/games/jetx.png' },
  'keno2':          { label: 'Keno 80',           image: '/games/keno2.png' },
  'plinko':         { label: 'Plinko',            image: '/games/plinko.png' },
  'racing-roulette':{ label: 'Racing Roulette',   image: '/games/racing-roulette.png' },
  'ultra-hold-spin':{ label: 'Ultra Hold & Spin', image: '/games/ultra-hold-spin.png' },
  'crazy-rocket':   { label: 'Crazy Rocket',      image: '/games/crazy-rocket.png' },
  'plinko2':        { label: 'Plinko',            image: '/games/plinko2.png' },
};

export default function GamePage() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug as string;
  const game = GAME_LABELS[slug];

  const [checked, setChecked] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    const user = localStorage.getItem('miraclbet_user');
    if (!user || user === 'null') {
      router.replace(`/login?callback=/games/${slug}`);
    } else {
      setLoggedIn(true);
    }
    setChecked(true);
  }, [slug, router]);

  if (!checked || !loggedIn) return null;

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0A0E1A 0%, #0D1913 50%, #0A1610 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 20px',
        textAlign: 'center',
      }}
    >
      {/* Game thumbnail */}
      {game?.image && (
        <div
          className="relative mb-8 rounded-2xl overflow-hidden shadow-2xl"
          style={{
            width: 140,
            height: 140,
            boxShadow: '0 0 48px rgba(25,230,107,0.25)',
            border: '2px solid rgba(25,230,107,0.2)',
          }}
        >
          <Image src={game.image} alt={game?.label ?? slug} fill className="object-cover" unoptimized />
        </div>
      )}

      {/* Animated badge */}
      <div
        className="flex items-center gap-2 mb-5 px-4 py-1.5 rounded-full"
        style={{ background: 'rgba(25,230,107,0.08)', border: '1px solid rgba(25,230,107,0.2)' }}
      >
        <span className="w-2 h-2 rounded-full bg-[#19E66B] animate-pulse" />
        <span className="text-[12px] font-bold text-[#19E66B] uppercase tracking-widest">
          In Development
        </span>
      </div>

      {/* Headline */}
      <h1 style={{ fontSize: 36, fontWeight: 900, color: '#FFFFFF', margin: '0 0 12px', lineHeight: 1.1 }}>
        {game?.label ?? slug}
      </h1>
      <p style={{ fontSize: 15, color: '#9CA3AF', maxWidth: 280, lineHeight: 1.6, margin: '0 0 36px' }}>
        This game is coming soon! Our team is working hard to bring you the best experience. Stay tuned! 🚀
      </p>

      {/* Animated rocket */}
      <div style={{ fontSize: 64, marginBottom: 32, animation: 'float 3s ease-in-out infinite' }}>
        🎮
      </div>

      {/* Back button */}
      <button
        onClick={() => router.push('/')}
        className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-transform hover:scale-105 active:scale-95"
        style={{
          background: 'linear-gradient(135deg, #19E66B, #0DB857)',
          color: '#032107',
          boxShadow: '0 8px 24px rgba(25,230,107,0.2)',
        }}
      >
        <svg viewBox="0 0 24 24" style={{ width: 18, height: 18 }} fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M15 18l-6-6 6-6" />
        </svg>
        Back to Home
      </button>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-12px); }
        }
      `}</style>
    </div>
  );
}
