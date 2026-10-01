'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

type GameMode = 'select' | 'practice' | 'real';
type GamePhase = 'waiting' | 'flying' | 'crashed';

interface HistoryItem { crashAt: number; id: string; }

const PRACTICE_BALANCE = 10000;
const GROWTH_RATE = 0.005; // per 100ms tick
const TICK_MS = 100;
const WAIT_SECS = 5;

function genCrash(): number {
  const r = Math.random();
  if (r < 0.02) return 1.00;
  const c = 0.99 / (1 - r);
  return Math.max(1.00, Math.min(Math.floor(c * 100) / 100, 150));
}

function fmtX(n: number) { return n.toFixed(2) + 'x'; }
function fmtBr(n: number) { return n.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' Br'; }

function crashColor(c: number) {
  if (c < 1.5)  return '#FF3A3A';
  if (c < 2.0)  return '#FF8C00';
  if (c < 5.0)  return '#19E66B';
  return '#00CFFF';
}

export default function AviatorPage() {
  const router = useRouter();
  const [mode, setMode]       = useState<GameMode>('select');
  const [user, setUser]       = useState<{ id: string; balance: number; phone: string } | null>(null);
  const [phase, setPhase]     = useState<GamePhase>('waiting');
  const [multiplier, setMult] = useState(1.00);
  const [countdown, setCD]    = useState(WAIT_SECS);
  const [crashAt, setCrashAt] = useState<number | null>(null);
  const [balance, setBalance] = useState(PRACTICE_BALANCE);
  const [betAmt, setBetAmt]   = useState('100');
  const [activeBet, setActiveBet] = useState<number | null>(null);
  const [cashedOut, setCashedOut] = useState<number | null>(null);
  const [profit, setProfit]   = useState<number | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [msg, setMsg]         = useState('');

  // refs for game loop
  const phaseRef    = useRef<GamePhase>('waiting');
  const multRef     = useRef(1.00);
  const crashRef    = useRef(1.00);
  const betRef      = useRef<number | null>(null);
  const cashedRef   = useRef<number | null>(null);
  const timerRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const canvasRef   = useRef<HTMLCanvasElement>(null);
  const rafRef      = useRef<number>(0);
  const startTsRef  = useRef(0);
  const starsRef    = useRef<{ x: number; y: number; r: number; a: number }[]>([]);

  // Init stars once
  useEffect(() => {
    starsRef.current = Array.from({ length: 80 }, () => ({
      x: Math.random(), y: Math.random(),
      r: Math.random() * 1.5 + 0.3,
      a: Math.random() * 0.7 + 0.3,
    }));
  }, []);

  useEffect(() => {
    const u = localStorage.getItem('miraclbet_user');
    if (u && u !== 'null') {
      try { const p = JSON.parse(u); setUser(p); } catch { /* */ }
    }
  }, []);

  // ──────────── Canvas draw ────────────
  const draw = useCallback(() => {
    const cvs = canvasRef.current;
    if (!cvs) return;
    const ctx = cvs.getContext('2d');
    if (!ctx) return;
    const W = cvs.width, H = cvs.height;
    ctx.clearRect(0, 0, W, H);

    // BG
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#050b18');
    bg.addColorStop(1, '#0a1628');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // stars
    starsRef.current.forEach(s => {
      ctx.beginPath();
      ctx.arc(s.x * W, s.y * H, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${s.a})`;
      ctx.fill();
    });

    const ph = phaseRef.current;
    const mult = multRef.current;

    const padL = 50, padB = 50;
    const gW = W - padL - 20;
    const gH = H - padB - 20;

    // Grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 1;
    for (let i = 1; i < 5; i++) {
      ctx.beginPath(); ctx.moveTo(padL, 20 + (gH / 5) * i); ctx.lineTo(W - 20, 20 + (gH / 5) * i); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(padL + (gW / 5) * i, 20); ctx.lineTo(padL + (gW / 5) * i, H - padB); ctx.stroke();
    }

    if (ph === 'waiting') {
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      ctx.font = 'bold 15px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('WAITING FOR NEXT ROUND', W / 2, H / 2 + 6);
      drawPlane(ctx, padL + 10, H - padB - 10, 0);
      rafRef.current = requestAnimationFrame(draw);
      return;
    }

    if (ph === 'crashed') {
      // red flash overlay
      ctx.fillStyle = 'rgba(255,50,50,0.08)';
      ctx.fillRect(0, 0, W, H);
      const c = crashRef.current;
      ctx.fillStyle = '#FF3A3A';
      ctx.font = 'bold 18px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`FLEW AWAY @ ${fmtX(c)}`, W / 2, H / 2 + 6);
      rafRef.current = requestAnimationFrame(draw);
      return;
    }

    // FLYING — draw curve + plane
    const elapsed = (Date.now() - startTsRef.current) / 1000;
    const maxTime = 60;
    const t = Math.min(elapsed / maxTime, 0.98);

    // path points (quadratic bezier)
    const sx = padL + 10, sy = H - padB - 10;
    const ex = W - 20,    ey = 30;
    const cpx = padL + gW * 0.25, cpy = H - padB - gH * 0.7;

    // Draw path so far
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    const steps = 60;
    for (let i = 0; i <= steps * t; i++) {
      const ti = i / steps;
      const px = (1-ti)*(1-ti)*sx + 2*(1-ti)*ti*cpx + ti*ti*ex;
      const py = (1-ti)*(1-ti)*sy + 2*(1-ti)*ti*cpy + ti*ti*ey;
      ctx.lineTo(px, py);
    }
    const grad = ctx.createLinearGradient(sx, sy, ex, ey);
    grad.addColorStop(0, 'rgba(25,230,107,0.8)');
    grad.addColorStop(1, 'rgba(0,207,255,0.8)');
    ctx.strokeStyle = grad;
    ctx.lineWidth = 2.5;
    ctx.setLineDash([]);
    ctx.stroke();

    // Glow under curve
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    for (let i = 0; i <= steps * t; i++) {
      const ti = i / steps;
      const px = (1-ti)*(1-ti)*sx + 2*(1-ti)*ti*cpx + ti*ti*ex;
      const py = (1-ti)*(1-ti)*sy + 2*(1-ti)*ti*cpy + ti*ti*ey;
      ctx.lineTo(px, py);
    }
    ctx.lineTo((1-t)*(1-t)*sx + 2*(1-t)*t*cpx + t*t*ex, sy);
    ctx.closePath();
    const fill = ctx.createLinearGradient(0, ey, 0, sy);
    fill.addColorStop(0, 'rgba(25,230,107,0.12)');
    fill.addColorStop(1, 'rgba(25,230,107,0)');
    ctx.fillStyle = fill;
    ctx.fill();

    // Plane position
    const pt = t;
    const px = (1-pt)*(1-pt)*sx + 2*(1-pt)*pt*cpx + pt*pt*ex;
    const py = (1-pt)*(1-pt)*sy + 2*(1-pt)*pt*cpy + pt*pt*ey;
    const pxprev = (1-Math.max(0,pt-0.01))*(1-Math.max(0,pt-0.01))*sx + 2*(1-Math.max(0,pt-0.01))*Math.max(0,pt-0.01)*cpx + Math.max(0,pt-0.01)*Math.max(0,pt-0.01)*ex;
    const pyprev = (1-Math.max(0,pt-0.01))*(1-Math.max(0,pt-0.01))*sy + 2*(1-Math.max(0,pt-0.01))*Math.max(0,pt-0.01)*cpy + Math.max(0,pt-0.01)*Math.max(0,pt-0.01)*ey;
    const angle = Math.atan2(py - pyprev, px - pxprev);
    drawPlane(ctx, px, py, angle);

    rafRef.current = requestAnimationFrame(draw);
  }, []);

  function drawPlane(ctx: CanvasRenderingContext2D, x: number, y: number, angle: number) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);

    // Body
    ctx.fillStyle = '#FF6B35';
    ctx.beginPath();
    ctx.moveTo(28, 0);
    ctx.lineTo(-8, -8);
    ctx.lineTo(-18, 0);
    ctx.lineTo(-8, 8);
    ctx.closePath();
    ctx.fill();

    // Wing top
    ctx.fillStyle = '#FF8C60';
    ctx.beginPath();
    ctx.moveTo(4, -2);
    ctx.lineTo(-12, -18);
    ctx.lineTo(-18, -4);
    ctx.closePath();
    ctx.fill();

    // Wing bottom
    ctx.fillStyle = '#FF8C60';
    ctx.beginPath();
    ctx.moveTo(4, 2);
    ctx.lineTo(-12, 18);
    ctx.lineTo(-18, 4);
    ctx.closePath();
    ctx.fill();

    // Engine glow
    const glow = ctx.createRadialGradient(-20, 0, 0, -20, 0, 16);
    glow.addColorStop(0, 'rgba(255,180,50,0.9)');
    glow.addColorStop(1, 'rgba(255,100,0,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(-20, 0, 16, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  // ──────────── Game loop ────────────
  const startRound = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    const crash = genCrash();
    crashRef.current = crash;
    phaseRef.current = 'waiting';
    multRef.current = 1.00;
    betRef.current = null;
    cashedRef.current = null;
    setPhase('waiting');
    setMult(1.00);
    setCD(WAIT_SECS);
    setCrashAt(null);
    setCashedOut(null);
    setProfit(null);
    setActiveBet(null);
    setMsg('');

    let cd = WAIT_SECS;
    timerRef.current = setInterval(() => {
      cd--;
      setCD(cd);
      if (cd <= 0) {
        clearInterval(timerRef.current!);
        // Deduct bet if placed
        phaseRef.current = 'flying';
        setPhase('flying');
        startTsRef.current = Date.now();

        let m = 1.00;
        timerRef.current = setInterval(() => {
          m = Math.round((m + m * GROWTH_RATE) * 100) / 100;
          multRef.current = m;
          setMult(m);

          if (m >= crash) {
            clearInterval(timerRef.current!);
            crashRef.current = crash;
            phaseRef.current = 'crashed';
            setPhase('crashed');
            setMult(crash);
            multRef.current = crash;
            setCrashAt(crash);

            // If bet active and not cashed out → lost
            if (betRef.current !== null && cashedRef.current === null) {
              setMsg(`Lost ${fmtBr(betRef.current)} 💸`);
              betRef.current = null;
              setActiveBet(null);
            }

            setHistory(prev => [{ crashAt: crash, id: Date.now().toString() }, ...prev.slice(0, 19)]);
            setTimeout(() => startRound(), 4000);
          }
        }, TICK_MS);
      }
    }, 1000);
  }, []);

  // Start modes
  const handlePractice = () => {
    setMode('practice');
    setBalance(PRACTICE_BALANCE);
    setHistory([]);
    setTimeout(() => startRound(), 200);
  };

  const handleReal = () => {
    if (!user) { router.push('/login?callback=/games/aviator'); return; }
    setMode('real');
    setBalance(user.balance || 0);
    setHistory([]);
    setTimeout(() => startRound(), 200);
  };

  // Bet actions
  const placeBet = () => {
    const a = parseFloat(betAmt);
    if (!a || a <= 0 || a > balance || phase !== 'waiting' || activeBet !== null) return;
    setBalance(b => b - a);
    betRef.current = a;
    setActiveBet(a);
    setMsg('');
  };

  const cancelBet = () => {
    if (phase !== 'waiting' || activeBet === null) return;
    setBalance(b => b + activeBet);
    betRef.current = null;
    setActiveBet(null);
  };

  const cashOut = () => {
    const m = multRef.current;
    const bet = betRef.current;
    if (phase !== 'flying' || bet === null || cashedRef.current !== null) return;
    cashedRef.current = m;
    setCashedOut(m);
    const win = Math.floor(bet * m * 100) / 100;
    const prof = Math.floor((win - bet) * 100) / 100;
    setBalance(b => b + win);
    betRef.current = null;
    setActiveBet(null);
    setProfit(prof);
    setMsg(`Won ${fmtBr(win)} @ ${fmtX(m)} 🎉`);
  };

  // RAF
  useEffect(() => {
    if (mode === 'select') return;
    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [mode, draw]);

  // Resize canvas
  useEffect(() => {
    const resize = () => {
      const cvs = canvasRef.current;
      if (!cvs) return;
      const parent = cvs.parentElement;
      if (parent) { cvs.width = parent.clientWidth; cvs.height = parent.clientHeight; }
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [mode]);

  // ──────────── MODE SELECT SCREEN ────────────
  if (mode === 'select') {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #050b18 0%, #0a1628 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 20px', textAlign: 'center' }}>
        {/* Stars bg */}
        <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
          {Array.from({ length: 60 }).map((_, i) => (
            <div key={i} style={{ position: 'absolute', left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%`, width: Math.random() * 2 + 1, height: Math.random() * 2 + 1, borderRadius: '50%', background: 'white', opacity: Math.random() * 0.7 + 0.3 }} />
          ))}
        </div>

        {/* Game logo */}
        <div className="relative mb-6" style={{ width: 140, height: 140, borderRadius: 24, overflow: 'hidden', boxShadow: '0 0 60px rgba(255,107,53,0.4)', border: '2px solid rgba(255,107,53,0.4)' }}>
          <Image src="/games/aviator.png" alt="Aviator" fill className="object-cover" unoptimized />
        </div>

        <h1 style={{ fontSize: 42, fontWeight: 900, color: '#FFF', margin: '0 0 6px', letterSpacing: -1 }}>
          ✈️ Aviator
        </h1>
        <p style={{ color: '#9CA3AF', fontSize: 15, margin: '0 0 40px', maxWidth: 300, lineHeight: 1.6 }}>
          Watch the multiplier grow. Cash out before the plane flies away or lose your bet!
        </p>

        {/* Mode buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, width: '100%', maxWidth: 320 }}>
          {/* Practice */}
          <button onClick={handlePractice} style={{ padding: '18px 24px', borderRadius: 16, border: '2px solid rgba(25,230,107,0.3)', background: 'rgba(25,230,107,0.08)', color: '#19E66B', fontSize: 16, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, transition: 'all 0.15s' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(25,230,107,0.15)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(25,230,107,0.08)')}
          >
            <span style={{ fontSize: 22 }}>🎮</span>
            <div style={{ textAlign: 'left' }}>
              <div>Practice Mode</div>
              <div style={{ fontSize: 12, fontWeight: 500, opacity: 0.7 }}>10,000 Br free chips • No login needed</div>
            </div>
          </button>

          {/* Real */}
          <button onClick={handleReal} style={{ padding: '18px 24px', borderRadius: 16, border: 'none', background: 'linear-gradient(135deg, #FF6B35, #FF4500)', color: '#FFF', fontSize: 16, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, boxShadow: '0 8px 32px rgba(255,107,53,0.35)', transition: 'transform 0.15s' }}
            onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.03)')}
            onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
          >
            <span style={{ fontSize: 22 }}>💰</span>
            <div style={{ textAlign: 'left' }}>
              <div>Play Real Money</div>
              <div style={{ fontSize: 12, fontWeight: 500, opacity: 0.85 }}>{user ? `Balance: ${fmtBr(user.balance || 0)}` : 'Login required'}</div>
            </div>
          </button>
        </div>

        {/* Back */}
        <button onClick={() => router.push('/')} style={{ marginTop: 28, background: 'none', border: 'none', color: '#6B7280', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
          ← Back to home
        </button>
      </div>
    );
  }

  // ──────────── GAME SCREEN ────────────
  const multColor = phase === 'crashed' ? '#FF3A3A' : phase === 'waiting' ? '#9CA3AF' : crashColor(multiplier);

  return (
    <div style={{ minHeight: '100vh', background: '#050b18', display: 'flex', flexDirection: 'column' }}>
      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', background: '#070f1e' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={() => { setMode('select'); if (timerRef.current) clearInterval(timerRef.current); cancelAnimationFrame(rafRef.current); }} style={{ background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer', fontSize: 20 }}>←</button>
          <span style={{ color: '#FF6B35', fontSize: 18, fontWeight: 900 }}>✈️ Aviator</span>
          <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 6, background: mode === 'practice' ? 'rgba(25,230,107,0.15)' : 'rgba(255,107,53,0.15)', color: mode === 'practice' ? '#19E66B' : '#FF6B35', border: `1px solid ${mode === 'practice' ? 'rgba(25,230,107,0.3)' : 'rgba(255,107,53,0.3)'}` }}>
            {mode === 'practice' ? 'PRACTICE' : 'REAL'}
          </span>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 10, color: '#6B7280', fontWeight: 600 }}>BALANCE</div>
          <div style={{ fontSize: 15, fontWeight: 900, color: '#19E66B' }}>{fmtBr(balance)}</div>
        </div>
      </div>

      {/* Crash history pills */}
      <div style={{ display: 'flex', gap: 6, padding: '8px 12px', overflowX: 'auto', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        {history.slice(0, 12).map(h => (
          <span key={h.id} style={{ flexShrink: 0, padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 800, whiteSpace: 'nowrap', background: `${crashColor(h.crashAt)}18`, color: crashColor(h.crashAt), border: `1px solid ${crashColor(h.crashAt)}44` }}>
            {fmtX(h.crashAt)}
          </span>
        ))}
        {history.length === 0 && <span style={{ color: '#374151', fontSize: 12 }}>No rounds yet</span>}
      </div>

      {/* Game canvas */}
      <div style={{ position: 'relative', flex: 1, minHeight: 220, maxHeight: 300 }}>
        <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />

        {/* Multiplier overlay */}
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
          {phase === 'waiting' && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 13, color: '#9CA3AF', fontWeight: 600, marginBottom: 4 }}>Starting in</div>
              <div style={{ fontSize: 56, fontWeight: 900, color: '#FFFFFF', lineHeight: 1 }}>{countdown}</div>
            </div>
          )}
          {phase === 'flying' && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 60, fontWeight: 900, color: multColor, lineHeight: 1, textShadow: `0 0 30px ${multColor}88`, transition: 'color 0.3s' }}>{fmtX(multiplier)}</div>
            </div>
          )}
          {phase === 'crashed' && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 14, color: '#FF3A3A', fontWeight: 700, marginBottom: 4 }}>FLEW AWAY!</div>
              <div style={{ fontSize: 52, fontWeight: 900, color: '#FF3A3A', lineHeight: 1 }}>{fmtX(crashAt ?? 1)}</div>
            </div>
          )}
        </div>
      </div>

      {/* Bet panel */}
      <div style={{ padding: '14px 14px 20px', background: '#070f1e', borderTop: '1px solid rgba(255,255,255,0.06)' }}>

        {/* Message */}
        {msg && (
          <div style={{ textAlign: 'center', padding: '8px 12px', borderRadius: 10, marginBottom: 10, background: msg.includes('Lost') ? 'rgba(255,58,58,0.1)' : 'rgba(25,230,107,0.1)', color: msg.includes('Lost') ? '#FF6B6B' : '#19E66B', fontSize: 14, fontWeight: 700, border: `1px solid ${msg.includes('Lost') ? '#FF3A3A44' : '#19E66B44'}` }}>
            {msg}
          </div>
        )}

        {/* Cash out (during flight with active bet) */}
        {phase === 'flying' && activeBet !== null && cashedOut === null && (
          <button onClick={cashOut} style={{ width: '100%', padding: '16px', borderRadius: 14, border: 'none', background: 'linear-gradient(135deg, #19E66B, #0DB857)', color: '#032107', fontSize: 18, fontWeight: 900, cursor: 'pointer', marginBottom: 10, boxShadow: '0 6px 24px rgba(25,230,107,0.35)', animation: 'pulse-btn 1s ease infinite' }}>
            💸 CASH OUT — {fmtBr(Math.floor(activeBet * multiplier * 100) / 100)}
          </button>
        )}

        {/* Cashed out confirmation */}
        {cashedOut !== null && (
          <div style={{ textAlign: 'center', padding: '12px', borderRadius: 12, marginBottom: 10, background: 'rgba(25,230,107,0.1)', border: '1px solid rgba(25,230,107,0.3)', color: '#19E66B', fontWeight: 800, fontSize: 14 }}>
            ✅ Cashed out @ {fmtX(cashedOut)} • +{fmtBr(profit ?? 0)} profit
          </div>
        )}

        {/* Bet amount input */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <input
              type="number"
              value={betAmt}
              onChange={e => setBetAmt(e.target.value)}
              disabled={activeBet !== null || phase === 'flying'}
              placeholder="Bet amount"
              style={{ width: '100%', padding: '12px 40px 12px 14px', borderRadius: 12, border: '1.5px solid rgba(255,255,255,0.1)', background: '#0D1928', color: '#FFFFFF', fontSize: 16, fontWeight: 800, outline: 'none', boxSizing: 'border-box' }}
            />
            <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#4B5563', fontSize: 12, fontWeight: 700 }}>Br</span>
          </div>
        </div>

        {/* Quick amounts */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
          {[50, 100, 200, 500, 1000].map(a => (
            <button key={a} onClick={() => setBetAmt(String(a))} disabled={activeBet !== null || phase === 'flying'}
              style={{ flex: 1, padding: '7px 0', borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)', background: betAmt === String(a) ? '#19E66B' : '#0D1928', color: betAmt === String(a) ? '#032107' : '#9CA3AF', fontSize: 12, fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s' }}>
              +{a}
            </button>
          ))}
        </div>

        {/* Place / Cancel bet button */}
        {activeBet === null && (
          <button onClick={placeBet} disabled={phase === 'flying' || phase === 'crashed'}
            style={{ width: '100%', padding: '14px', borderRadius: 14, border: 'none', background: phase === 'waiting' ? 'linear-gradient(135deg, #FF6B35, #FF4500)' : '#1A2535', color: phase === 'waiting' ? '#FFF' : '#4B5563', fontSize: 16, fontWeight: 900, cursor: phase === 'waiting' ? 'pointer' : 'not-allowed', boxShadow: phase === 'waiting' ? '0 6px 24px rgba(255,107,53,0.3)' : 'none', transition: 'all 0.2s' }}>
            {phase === 'waiting' ? `🎯 Place Bet${betAmt ? ` — ${betAmt} Br` : ''}` : phase === 'flying' ? 'Wait for next round' : 'Next round starting...'}
          </button>
        )}
        {activeBet !== null && phase === 'waiting' && (
          <button onClick={cancelBet} style={{ width: '100%', padding: '14px', borderRadius: 14, border: '1.5px solid rgba(255,58,58,0.4)', background: 'rgba(255,58,58,0.08)', color: '#FF6B6B', fontSize: 16, fontWeight: 900, cursor: 'pointer' }}>
            ✕ Cancel Bet — {fmtBr(activeBet)}
          </button>
        )}

        {mode === 'practice' && (
          <p style={{ textAlign: 'center', color: '#374151', fontSize: 11, margin: '8px 0 0', fontWeight: 600 }}>
            🎮 Practice mode — fake chips only
          </p>
        )}
      </div>

      <style>{`
        @keyframes pulse-btn {
          0%, 100% { transform: scale(1); box-shadow: 0 6px 24px rgba(25,230,107,0.35); }
          50%        { transform: scale(1.02); box-shadow: 0 8px 32px rgba(25,230,107,0.55); }
        }
      `}</style>
    </div>
  );
}
