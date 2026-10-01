'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

type GameMode = 'select' | 'practice' | 'real';
type GamePhase = 'waiting' | 'flying' | 'crashed';
interface HistoryItem { crashAt: number; id: string; }

const GROWTH_RATE = 0.005; // 0.5% per 100ms tick — matches backend exactly
const TICK_MS     = 100;
const PRACTICE_BALANCE = 10000;

function genCrash(): number {
  const r = Math.random();
  return Math.max(1.01, Math.min(Math.floor(0.99 / (1 - r) * 100) / 100, 200));
}
function fmtX(n: number)  { return n.toFixed(2) + 'x'; }
function fmtBr(n: number) { return n.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' Br'; }
function crashColor(c: number): string {
  if (c < 1.5) return '#FF3A3A';
  if (c < 2.0) return '#FF8C00';
  if (c < 5.0) return '#19E66B';
  return '#00CFFF';
}

const API = process.env.NEXT_PUBLIC_API_URL || 'https://api.miraclbet.com:8443';

export default function AviatorPage() {
  const router = useRouter();

  // ─── React state (layout only — minimal re-renders) ──────────────────
  const [mode, setMode]           = useState<GameMode>('select');
  const [user, setUser]           = useState<{ id: string; balance: number; phone: string } | null>(null);
  const [phase, setPhase]         = useState<GamePhase>('waiting');
  const [balance, setBalance]     = useState(PRACTICE_BALANCE);
  const [betAmt, setBetAmt]       = useState('100');
  const [activeBet, setActiveBet] = useState<number | null>(null);
  const [cashedOutAt, setCashedOutAt] = useState<number | null>(null);
  const [history, setHistory]     = useState<HistoryItem[]>([]);
  const [msg, setMsg]             = useState('');

  // ─── Refs — all game logic lives here, no React re-renders ───────────
  const phaseRef   = useRef<GamePhase>('waiting');
  const multRef    = useRef(1.00);
  const crashRef   = useRef(1.00);
  const cdRef      = useRef(5);
  const betRef     = useRef<number | null>(null);
  const cashedRef  = useRef<number | null>(null);
  const timerRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const rafRef     = useRef<number>(0);
  const startTsRef = useRef(0);
  const starsRef   = useRef<{ x: number; y: number; r: number; a: number }[]>([]);

  // ─── init ─────────────────────────────────────────────────────────────
  useEffect(() => {
    starsRef.current = Array.from({ length: 80 }, () => ({
      x: Math.random(), y: Math.random(),
      r: Math.random() * 1.5 + 0.3,
      a: Math.random() * 0.6 + 0.3,
    }));
    const u = localStorage.getItem('miraclbet_user');
    if (u && u !== 'null') { try { setUser(JSON.parse(u)); } catch { /**/ } }
  }, []);

  // ─── Canvas — draws EVERYTHING (stars, curve, plane, text) ───────────
  const draw = useCallback(() => {
    const cvs = canvasRef.current;
    if (!cvs) return;
    const ctx = cvs.getContext('2d');
    if (!ctx) return;
    const W = cvs.width, H = cvs.height;
    const ph  = phaseRef.current;
    const m   = multRef.current;
    const cd  = cdRef.current;
    const padL = 30, padB = 24;
    const gW   = W - padL - 10;
    const gH   = H - padB - 10;

    ctx.clearRect(0, 0, W, H);

    // Stars
    starsRef.current.forEach(s => {
      ctx.beginPath();
      ctx.arc(s.x * W, s.y * H, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${s.a})`;
      ctx.fill();
    });

    // Grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 1;
    for (let i = 1; i < 5; i++) {
      ctx.beginPath(); ctx.moveTo(padL, H - padB - gH * i / 4); ctx.lineTo(W - 10, H - padB - gH * i / 4); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(padL + gW * i / 4, H - padB); ctx.lineTo(padL + gW * i / 4, 10); ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(padL, 10); ctx.lineTo(padL, H - padB); ctx.lineTo(W - 10, H - padB); ctx.stroke();

    // ── WAITING phase ──────────────────────────────────────────────────
    if (ph === 'waiting') {
      // Plane at origin
      drawPlane(ctx, padL + 10, H - padB - 10, 0);

      // Countdown number — drawn directly on canvas (NO HTML REFS!)
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(255,255,255,0.15)';
      ctx.font = 'bold 12px Inter, sans-serif';
      ctx.fillText('WAITING FOR NEXT ROUND', W / 2, H / 2 - 38);

      ctx.fillStyle = '#FFFFFF';
      ctx.font = `bold 72px Inter, sans-serif`;
      ctx.fillText(String(Math.max(0, cd)), W / 2, H / 2 + 22);

      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.font = 'bold 13px Inter, sans-serif';
      ctx.fillText('Starting in', W / 2, H / 2 - 14);

      rafRef.current = requestAnimationFrame(draw);
      return;
    }

    // ── CRASHED phase ──────────────────────────────────────────────────
    if (ph === 'crashed') {
      ctx.fillStyle = 'rgba(255,40,40,0.07)';
      ctx.fillRect(0, 0, W, H);

      ctx.textAlign = 'center';
      ctx.fillStyle = '#FF3A3A';
      ctx.font = 'bold 13px Inter, sans-serif';
      ctx.fillText('FLEW AWAY!', W / 2, H / 2 - 30);

      ctx.font = `bold 64px Inter, sans-serif`;
      ctx.fillStyle = '#FF3A3A';
      // glow effect
      ctx.shadowColor = 'rgba(255,58,58,0.6)';
      ctx.shadowBlur = 30;
      ctx.fillText(fmtX(crashRef.current), W / 2, H / 2 + 24);
      ctx.shadowBlur = 0;

      rafRef.current = requestAnimationFrame(draw);
      return;
    }

    // ── FLYING phase ───────────────────────────────────────────────────
    const elapsed = (Date.now() - startTsRef.current) / 1000;
    const t = Math.min(elapsed / 60, 0.98);

    const sx = padL + 10, sy = H - padB - 10;
    const ex = W - 20,   ey = 30;
    const cpx = padL + gW * 0.25, cpy = H - padB - gH * 0.7;

    // Bezier curve
    ctx.beginPath(); ctx.moveTo(sx, sy);
    const steps = 60;
    for (let i = 0; i <= steps * t; i++) {
      const ti = i / steps;
      ctx.lineTo(
        (1-ti)*(1-ti)*sx + 2*(1-ti)*ti*cpx + ti*ti*ex,
        (1-ti)*(1-ti)*sy + 2*(1-ti)*ti*cpy + ti*ti*ey
      );
    }
    const cg = ctx.createLinearGradient(sx, sy, ex, ey);
    cg.addColorStop(0, 'rgba(25,230,107,0.9)');
    cg.addColorStop(1, 'rgba(0,207,255,0.9)');
    ctx.strokeStyle = cg; ctx.lineWidth = 2.5; ctx.setLineDash([]); ctx.stroke();

    // Fill under curve
    ctx.beginPath(); ctx.moveTo(sx, sy);
    for (let i = 0; i <= steps * t; i++) {
      const ti = i / steps;
      ctx.lineTo(
        (1-ti)*(1-ti)*sx + 2*(1-ti)*ti*cpx + ti*ti*ex,
        (1-ti)*(1-ti)*sy + 2*(1-ti)*ti*cpy + ti*ti*ey
      );
    }
    const pt = t;
    ctx.lineTo((1-pt)*(1-pt)*sx + 2*(1-pt)*pt*cpx + pt*pt*ex, sy);
    ctx.closePath();
    const fg = ctx.createLinearGradient(0, ey, 0, sy);
    fg.addColorStop(0, 'rgba(25,230,107,0.13)'); fg.addColorStop(1, 'rgba(25,230,107,0)');
    ctx.fillStyle = fg; ctx.fill();

    // Plane at curve tip
    const pxP = (1-pt)*(1-pt)*sx + 2*(1-pt)*pt*cpx + pt*pt*ex;
    const pyP = (1-pt)*(1-pt)*sy + 2*(1-pt)*pt*cpy + pt*pt*ey;
    const pp = Math.max(0, pt - 0.01);
    const ang = Math.atan2(
      pyP - ((1-pp)*(1-pp)*sy + 2*(1-pp)*pp*cpy + pp*pp*ey),
      pxP - ((1-pp)*(1-pp)*sx + 2*(1-pp)*pp*cpx + pp*pp*ex)
    );
    drawPlane(ctx, pxP, pyP, ang);

    // Multiplier text — drawn on canvas (NO HTML REFS!)
    const mc = crashColor(m);
    ctx.textAlign = 'center';
    ctx.shadowColor = mc + '88';
    ctx.shadowBlur = 28;
    ctx.font = 'bold 64px Inter, sans-serif';
    ctx.fillStyle = mc;
    ctx.fillText(fmtX(m), W / 2, H / 2 + 20);
    ctx.shadowBlur = 0;

    rafRef.current = requestAnimationFrame(draw);
  }, []);

  function drawPlane(ctx: CanvasRenderingContext2D, x: number, y: number, angle: number) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(angle);
    ctx.fillStyle = '#FF6B35';
    ctx.beginPath(); ctx.moveTo(28,0); ctx.lineTo(-8,-8); ctx.lineTo(-18,0); ctx.lineTo(-8,8); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#FF8C60';
    ctx.beginPath(); ctx.moveTo(4,-2); ctx.lineTo(-12,-18); ctx.lineTo(-18,-4); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(4,2);  ctx.lineTo(-12,18);  ctx.lineTo(-18,4);  ctx.closePath(); ctx.fill();
    const gl = ctx.createRadialGradient(-20,0,0,-20,0,16);
    gl.addColorStop(0,'rgba(255,180,50,0.9)'); gl.addColorStop(1,'rgba(255,100,0,0)');
    ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(-20,0,16,0,Math.PI*2); ctx.fill();
    ctx.restore();
  }

  // ─── Helpers: transition to each phase ───────────────────────────────
  const goWaiting = useCallback((countdown: number) => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    phaseRef.current = 'waiting';
    multRef.current  = 1.00;
    cdRef.current    = countdown;
    betRef.current   = null;
    cashedRef.current = null;
    setPhase('waiting');
    setActiveBet(null);
    setCashedOutAt(null);
    setMsg('');
  }, []);

  const goFlying = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    phaseRef.current  = 'flying';
    multRef.current   = 1.00;
    startTsRef.current = Date.now();
    setPhase('flying');
    // Tick multiplier via interval — updates ref only, canvas reads it in RAF
    timerRef.current = setInterval(() => {
      multRef.current = Math.round((multRef.current + multRef.current * GROWTH_RATE) * 100) / 100;
    }, TICK_MS);
  }, []);

  const goCrashed = useCallback((crashPoint: number, hadActiveBet: boolean) => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    phaseRef.current  = 'crashed';
    crashRef.current  = crashPoint;
    multRef.current   = crashPoint;
    setPhase('crashed');
    setCashedOutAt(null);
    if (hadActiveBet) {
      const lost = betRef.current!;
      setMsg(`Lost ${fmtBr(lost)} 💸`);
      betRef.current  = null;
      setActiveBet(null);
    }
  }, []);

  // ─── PRACTICE: self-contained game loop ──────────────────────────────
  const startPracticeRound = useCallback(() => {
    const crash = genCrash();
    crashRef.current = crash;
    goWaiting(5);

    let cd = 5;
    timerRef.current = setInterval(() => {
      cd--;
      cdRef.current = cd;
      if (cd <= 0) {
        clearInterval(timerRef.current!);
        goFlying();
        // Check for crash
        const checker = setInterval(() => {
          if (multRef.current >= crash) {
            clearInterval(checker);
            const hadBet = betRef.current !== null && cashedRef.current === null;
            goCrashed(crash, hadBet);
            setHistory(prev => [{ crashAt: crash, id: Date.now().toString() }, ...prev.slice(0, 19)]);
            setTimeout(() => startPracticeRound(), 4000);
          }
        }, TICK_MS);
      }
    }, 1000);
  }, [goWaiting, goFlying, goCrashed]);

  // ─── REAL: SSE drives phase; local interval drives multiplier ─────────
  useEffect(() => {
    if (mode !== 'real') return;
    betRef.current = null; cashedRef.current = null;
    setActiveBet(null); setCashedOutAt(null); setMsg('');

    const es = new EventSource(`${API}/api/v1/games/aviator/stream`);
    es.onopen  = () => console.log('[avi] SSE connected ✓');
    es.onerror = (e) => console.error('[avi] SSE error', e);

    es.onmessage = (ev) => {
      try {
        if (!ev.data || ev.data.trim() === '') return;
        const d = JSON.parse(ev.data);
        switch (d.event) {
          case 'init':
            if (d.history) setHistory(d.history.map((h: {id: string; crash_at: number}) => ({ id: h.id, crashAt: h.crash_at })));
            if (d.status === 'waiting') goWaiting(d.countdown ?? 5);
            else if (d.status === 'flying') goFlying();
            else if (d.status === 'crashed') goCrashed(d.crash_at ?? 1.00, false);
            break;
          case 'waiting':
            if (phaseRef.current !== 'waiting') {
              goWaiting(d.countdown ?? 5);
            } else {
              // Sync countdown from server every second
              cdRef.current = d.countdown ?? cdRef.current;
            }
            break;
          case 'flying':
            if (phaseRef.current !== 'flying') goFlying();
            break;
          case 'crashed': {
            const hadBet = betRef.current !== null && cashedRef.current === null;
            goCrashed(d.crash_at, hadBet);
            setHistory(prev => [{ crashAt: d.crash_at, id: Date.now().toString() }, ...prev.slice(0, 19)]);
            break;
          }
        }
      } catch(err) { console.error('[avi] parse err', err); }
    };

    return () => { es.close(); if (timerRef.current) clearInterval(timerRef.current); };
  }, [mode, goWaiting, goFlying, goCrashed]);

  // ─── RAF loop start/stop ─────────────────────────────────────────────
  useEffect(() => {
    if (mode === 'select') return;
    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [mode, draw]);

  // ─── Resize canvas ───────────────────────────────────────────────────
  useEffect(() => {
    const resize = () => {
      const c = canvasRef.current; if (!c) return;
      const p = c.parentElement; if (!p) return;
      c.width = p.clientWidth; c.height = p.clientHeight;
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [mode]);

  // ─── Bet actions ─────────────────────────────────────────────────────
  const placeBet = async () => {
    const a = parseFloat(betAmt);
    if (!a || a <= 0 || a > balance || phase !== 'waiting' || activeBet !== null) return;
    if (mode === 'real') {
      try {
        const r = await fetch(`${API}/api/v1/games/aviator/bet`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-User-ID': user?.id || '' },
          body: JSON.stringify({ amount: a }),
        });
        if (!r.ok) { setMsg(await r.text()); return; }
      } catch { return; }
    }
    setBalance(b => b - a);
    betRef.current = a; setActiveBet(a); setMsg('');
  };

  const cashOut = async () => {
    const bet = betRef.current;
    if (phase !== 'flying' || bet === null || cashedRef.current !== null) return;
    if (mode === 'real') {
      try {
        const r = await fetch(`${API}/api/v1/games/aviator/cashout`, {
          method: 'POST', headers: { 'X-User-ID': user?.id || '' },
        });
        if (!r.ok) { setMsg('Cashout failed'); return; }
        const data = await r.json();
        cashedRef.current = data.multiplier;
        setCashedOutAt(data.multiplier);
        setBalance(b => b + data.win_amount);
        betRef.current = null; setActiveBet(null);
        setMsg(`Won ${fmtBr(data.win_amount)} @ ${fmtX(data.multiplier)} 🎉`);
        return;
      } catch { return; }
    }
    const m = multRef.current;
    cashedRef.current = m; setCashedOutAt(m);
    const win = Math.floor(bet * m * 100) / 100;
    setBalance(b => b + win);
    betRef.current = null; setActiveBet(null);
    setMsg(`Won ${fmtBr(win)} @ ${fmtX(m)} 🎉`);
  };

  // ─── MODE SELECT ─────────────────────────────────────────────────────
  if (mode === 'select') {
    return (
      <div style={{ minHeight:'100vh', background:'linear-gradient(135deg,#050b18,#0a1628)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'32px 20px', textAlign:'center' }}>
        <div style={{ position:'fixed', inset:0, overflow:'hidden', pointerEvents:'none' }}>
          {Array.from({length:60}).map((_,i)=>(
            <div key={i} style={{ position:'absolute', left:`${(i*137.5)%100}%`, top:`${(i*89.3)%100}%`, width:(i%3)+1, height:(i%3)+1, borderRadius:'50%', background:'white', opacity:0.4+(i%5)*0.1 }}/>
          ))}
        </div>
        <div className="relative mb-6" style={{ width:140, height:140, borderRadius:24, overflow:'hidden', boxShadow:'0 0 60px rgba(255,107,53,0.4)', border:'2px solid rgba(255,107,53,0.4)' }}>
          <Image src="/games/aviator.png" alt="Aviator" fill className="object-cover" unoptimized/>
        </div>
        <h1 style={{ fontSize:42, fontWeight:900, color:'#FFF', margin:'0 0 8px' }}>✈️ Aviator</h1>
        <p style={{ color:'#9CA3AF', fontSize:15, margin:'0 0 40px', maxWidth:300, lineHeight:1.6 }}>
          Watch the multiplier grow. Cash out before the plane flies away!
        </p>
        <div style={{ display:'flex', flexDirection:'column', gap:14, width:'100%', maxWidth:320 }}>
          <button onClick={() => { setMode('practice'); setBalance(PRACTICE_BALANCE); setHistory([]); setTimeout(()=>startPracticeRound(),100); }}
            style={{ padding:'18px 24px', borderRadius:16, border:'2px solid rgba(25,230,107,0.3)', background:'rgba(25,230,107,0.08)', color:'#19E66B', fontSize:16, fontWeight:800, cursor:'pointer', display:'flex', alignItems:'center', gap:10 }}>
            <span style={{fontSize:22}}>🎮</span>
            <div style={{textAlign:'left'}}>
              <div>Practice Mode</div>
              <div style={{fontSize:12,opacity:0.7}}>10,000 Br free chips • No login needed</div>
            </div>
          </button>
          <button onClick={() => { if(!user){router.push('/login?callback=/games/aviator');return;} setMode('real'); setBalance(user.balance||0); setHistory([]); }}
            style={{ padding:'18px 24px', borderRadius:16, border:'none', background:'linear-gradient(135deg,#FF6B35,#FF4500)', color:'#FFF', fontSize:16, fontWeight:800, cursor:'pointer', display:'flex', alignItems:'center', gap:10, boxShadow:'0 8px 32px rgba(255,107,53,0.35)' }}>
            <span style={{fontSize:22}}>💰</span>
            <div style={{textAlign:'left'}}>
              <div>Play Real Money</div>
              <div style={{fontSize:12,opacity:0.85}}>{user?`Balance: ${fmtBr(user.balance||0)}`:'Login required'}</div>
            </div>
          </button>
        </div>
        <button onClick={()=>router.push('/')} style={{ marginTop:28, background:'none', border:'none', color:'#6B7280', cursor:'pointer', fontSize:14 }}>← Back to home</button>
      </div>
    );
  }

  // ─── GAME SCREEN ─────────────────────────────────────────────────────
  const isWaiting = phase === 'waiting';
  const isFlying  = phase === 'flying';
  const isCrashed = phase === 'crashed';

  return (
    <div style={{ minHeight:'100vh', background:'#050b18', display:'flex', flexDirection:'column' }}>

      {/* Top bar */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 16px', borderBottom:'1px solid rgba(255,255,255,0.06)', background:'#070f1e' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <button onClick={()=>{ setMode('select'); if(timerRef.current)clearInterval(timerRef.current); cancelAnimationFrame(rafRef.current); }}
            style={{ background:'none', border:'none', color:'#9CA3AF', cursor:'pointer', fontSize:20 }}>←</button>
          <span style={{ color:'#FF6B35', fontSize:18, fontWeight:900 }}>✈️ Aviator</span>
          <span style={{ fontSize:11, fontWeight:700, padding:'3px 8px', borderRadius:6, background: mode==='practice'?'rgba(25,230,107,0.15)':'rgba(255,107,53,0.15)', color: mode==='practice'?'#19E66B':'#FF6B35' }}>
            {mode==='practice'?'PRACTICE':'REAL'}
          </span>
        </div>
        <div style={{ textAlign:'right' }}>
          <div style={{ fontSize:10, color:'#6B7280', fontWeight:600 }}>BALANCE</div>
          <div style={{ fontSize:15, fontWeight:900, color:'#19E66B' }}>{fmtBr(balance)}</div>
        </div>
      </div>

      {/* History pills */}
      <div style={{ display:'flex', gap:6, padding:'8px 12px', overflowX:'auto', borderBottom:'1px solid rgba(255,255,255,0.04)' }}>
        {history.slice(0,12).map(h=>(
          <span key={h.id} style={{ flexShrink:0, padding:'3px 10px', borderRadius:20, fontSize:12, fontWeight:800, whiteSpace:'nowrap', background:`${crashColor(h.crashAt)}18`, color:crashColor(h.crashAt), border:`1px solid ${crashColor(h.crashAt)}44` }}>
            {fmtX(h.crashAt)}
          </span>
        ))}
        {history.length===0 && <span style={{ color:'#374151', fontSize:12 }}>No rounds yet</span>}
      </div>

      {/* Canvas — draws EVERYTHING: stars, curve, plane, countdown text, multiplier text */}
      <div style={{ position:'relative', flex:1, minHeight:260, maxHeight:340 }}>
        <canvas ref={canvasRef} style={{ width:'100%', height:'100%', display:'block' }}/>
      </div>

      {/* Cashed out badge (only shows when user has cashed out this round) */}
      {cashedOutAt !== null && isFlying && (
        <div style={{ textAlign:'center', padding:'6px', fontSize:13, fontWeight:700, color:'#19E66B', background:'rgba(25,230,107,0.08)' }}>
          ✓ Cashed out @ {fmtX(cashedOutAt)}
        </div>
      )}

      {/* Win/loss message */}
      {msg && (
        <div style={{ textAlign:'center', padding:'8px 16px', fontSize:14, fontWeight:700, color:msg.includes('Won')?'#19E66B':'#FF3A3A', background:msg.includes('Won')?'rgba(25,230,107,0.08)':'rgba(255,58,58,0.08)' }}>
          {msg}
        </div>
      )}

      {/* Bet panel */}
      <div style={{ padding:'14px 14px 28px', background:'#070f1e', borderTop:'1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display:'flex', alignItems:'center', background:'#111827', borderRadius:12, padding:'12px 16px', marginBottom:10, border:'1px solid rgba(255,255,255,0.08)' }}>
          <input type="number" value={betAmt} onChange={e=>setBetAmt(e.target.value)}
            disabled={activeBet!==null||isFlying}
            style={{ flex:1, background:'none', border:'none', outline:'none', color:'#FFF', fontSize:20, fontWeight:700 }}/>
          <span style={{ color:'#6B7280', fontWeight:600 }}>Br</span>
        </div>
        <div style={{ display:'flex', gap:8, marginBottom:12 }}>
          {[50,100,200,500,1000].map(v=>(
            <button key={v} onClick={()=>setBetAmt(String(parseFloat(betAmt||'0')+v))}
              disabled={activeBet!==null||isFlying}
              style={{ flex:1, padding:'8px 4px', borderRadius:10, border:'none', background:'#1A2235', color:'#9CA3AF', fontSize:12, fontWeight:700, cursor:'pointer' }}>
              +{v}
            </button>
          ))}
        </div>

        {/* WAITING — Place Bet */}
        {isWaiting && activeBet===null && (
          <button onClick={placeBet}
            style={{ width:'100%', padding:'16px', borderRadius:14, border:'none', background:'linear-gradient(135deg,#FF6B35,#FF4500)', color:'#FFF', fontSize:16, fontWeight:800, cursor:'pointer', boxShadow:'0 4px 20px rgba(255,107,53,0.35)' }}>
            🎯 Place Bet — {parseFloat(betAmt||'0').toLocaleString('en')} Br
          </button>
        )}
        {/* WAITING — Bet already placed */}
        {isWaiting && activeBet!==null && (
          <div style={{ width:'100%', padding:'16px', borderRadius:14, background:'rgba(25,230,107,0.08)', color:'#19E66B', fontSize:15, fontWeight:700, textAlign:'center', border:'1px solid rgba(25,230,107,0.3)' }}>
            ✓ Bet {fmtBr(activeBet)} placed — waiting for round to start...
          </div>
        )}
        {/* FLYING — Cash Out */}
        {isFlying && activeBet!==null && cashedOutAt===null && (
          <button onClick={cashOut}
            style={{ width:'100%', padding:'16px', borderRadius:14, border:'none', background:'linear-gradient(135deg,#19E66B,#00C853)', color:'#000', fontSize:16, fontWeight:900, cursor:'pointer', boxShadow:'0 4px 20px rgba(25,230,107,0.4)' }}>
            💸 CASH OUT — {fmtBr(Math.floor((activeBet * multRef.current) * 100) / 100)}
          </button>
        )}
        {/* FLYING — No bet or already cashed */}
        {isFlying && (activeBet===null || cashedOutAt!==null) && (
          <div style={{ width:'100%', padding:'16px', borderRadius:14, background:'#111827', color:'#6B7280', fontSize:15, fontWeight:600, textAlign:'center' }}>
            {cashedOutAt!==null ? `✓ Cashed out @ ${fmtX(cashedOutAt)}` : 'Round in progress...'}
          </div>
        )}
        {/* CRASHED */}
        {isCrashed && (
          <div style={{ width:'100%', padding:'16px', borderRadius:14, background:'#111827', color:'#6B7280', fontSize:15, fontWeight:600, textAlign:'center' }}>
            Next round starting soon...
          </div>
        )}
      </div>
    </div>
  );
}
