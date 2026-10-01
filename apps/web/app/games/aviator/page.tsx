'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.miraclbet.com:8443';

// ── Formatters ────────────────────────────────────────────────────────────────
function fmtX(n: number)  { return n.toFixed(2) + 'x'; }
function fmtBr(n: number) { return n.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' Br'; }
function multColor(m: number) {
  if (m < 2.0) return '#ff3a3a';
  if (m < 5.0) return '#fbbf24';
  return '#19e66b';
}
function histColor(m: number) {
  if (m < 2)  return { bg: 'rgba(239,68,68,.15)',  text: '#f87171', border: 'rgba(239,68,68,.3)' };
  if (m < 5)  return { bg: 'rgba(251,191,36,.12)', text: '#fbbf24', border: 'rgba(251,191,36,.3)' };
  return       { bg: 'rgba(25,230,107,.12)',        text: '#19e66b', border: 'rgba(25,230,107,.3)' };
}

// ── Ethiopian Phone Number Pool (3000 fake numbers) ───────────────────────────
function generateEthPhonePool(count: number): string[] {
  const prefixes = ['091','092','093','094','095','096','097','098','071','072','073'];
  const pool: string[] = [];
  const seen = new Set<string>();
  const rng = (n: number) => Math.floor(Math.random() * n);
  while (pool.length < count) {
    const prefix = prefixes[rng(prefixes.length)];
    const suffix = String(rng(9000000) + 1000000); // 7 digits
    const num = prefix + suffix;
    if (!seen.has(num)) { seen.add(num); pool.push(num); }
  }
  return pool;
}

function maskPhone(p: string): string {
  // e.g. "0911234567" → "091***567"
  return p.slice(0, 3) + '***' + p.slice(-3);
}

// ── Fake Player types ─────────────────────────────────────────────────────────
interface FakePlayer {
  id: string;
  phone: string;   // masked
  bet: number;
  multiplier: number | null;  // null = still flying; 0 = lost
  win: number | null;
  cashedOut: boolean;
}

const PHONE_POOL: string[] = generateEthPhonePool(3000);

function pickFakePlayers(count: number): FakePlayer[] {
  const shuffled = [...PHONE_POOL].sort(() => Math.random() - 0.5).slice(0, count);
  const betChoices = [10,20,30,50,100,200,500,1000,2000,3000,5000];
  return shuffled.map((p, i) => ({
    id: String(i),
    phone: maskPhone(p),
    bet: betChoices[Math.floor(Math.random() * betChoices.length)],
    multiplier: null,
    win: null,
    cashedOut: false,
  }));
}

// ── Types ─────────────────────────────────────────────────────────────────────
interface LocalUser { id: string; phone: string; balance: number; role: string; }

// ═════════════════════════════════════════════════════════════════════════════
export default function AviatorPage() {
  const router = useRouter();

  // ── screens
  const [screen, setScreen] = useState<'select'|'game'>('select');
  const [mode,   setMode]   = useState<'practice'|'real'>('practice');

  // ── game phase
  const [phase,  setPhase]  = useState<'waiting'|'flying'|'crashed'>('waiting');
  const phaseRef = useRef<'waiting'|'flying'|'crashed'>('waiting');

  // ── user + balance
  const [user,    setUser]    = useState<LocalUser|null>(null);
  const [balance, setBalance] = useState(0);

  // ── betting UI state
  const [betAmt,     setBetAmt]     = useState('100');
  const [activeBet,  setActiveBet]  = useState<number|null>(null);
  const [cashedAt,   setCashedAt]   = useState<number|null>(null);
  const [queuedBet,  setQueuedBet]  = useState<number|null>(null);
  const [history,    setHistory]    = useState<{id:string;m:number}[]>([]);
  const [msg,        setMsg]        = useState('');
  const [loading,    setLoading]    = useState(false);

  // ── fake players live bets table
  const [fakePlayers,    setFakePlayers]    = useState<FakePlayer[]>([]);
  const [betTab,         setBetTab]         = useState<'all'|'prev'|'top'>('all');
  const fakeIntervalRef = useRef<ReturnType<typeof setInterval>|null>(null);

  // ── game refs
  const mult    = useRef(1.00);
  const crashed = useRef(1.00);
  const betRef  = useRef<number|null>(null);
  const cashRef = useRef<number|null>(null);

  // timing refs
  const waitStartTs = useRef(0);
  const waitTotal   = useRef(6);
  const startTs     = useRef(0);

  // canvas / SSE
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef    = useRef(0);
  const esRef     = useRef<EventSource|null>(null);
  const stars     = useRef<{x:number;y:number;r:number;a:number}[]>([]);

  // ── Load user + fetch live balance ────────────────────────────────────────
  const loadUser = useCallback(async () => {
    const raw = localStorage.getItem('miraclbet_user');
    if (!raw) return;
    const u: LocalUser = JSON.parse(raw);
    setUser(u); setBalance(u.balance ?? 0);
    try {
      const res = await fetch(`${API}/api/v1/auth/me?user_id=${u.id}`);
      if (res.ok) {
        const data = await res.json();
        const bal = data.user?.balance ?? data.balance ?? u.balance;
        setBalance(bal);
        const updated = { ...u, balance: bal };
        localStorage.setItem('miraclbet_user', JSON.stringify(updated));
        setUser(updated);
      }
    } catch { /* use localStorage */ }
  }, []);

  useEffect(() => {
    stars.current = Array.from({length:60}, () => ({
      x: Math.random(), y: Math.random(), r: Math.random()*1.3+0.3, a: Math.random()*0.5+0.3,
    }));
    loadUser();
  }, [loadUser]);

  // ── Auto-place queued bet ─────────────────────────────────────────────────
  useEffect(() => {
    if (phase === 'waiting' && queuedBet !== null) {
      const amt = queuedBet;
      setQueuedBet(null);
      setTimeout(() => doPlaceBet(amt), 400);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // ── Fake player simulation helpers ────────────────────────────────────────
  function startFakePlayers() {
    const count = 20 + Math.floor(Math.random() * 181); // 20-200
    const players = pickFakePlayers(count);
    setFakePlayers(players);
    return players;
  }

  function startFakeCashouts(players: FakePlayer[]) {
    if (fakeIntervalRef.current) clearInterval(fakeIntervalRef.current);
    const pending = [...players];
    fakeIntervalRef.current = setInterval(() => {
      const m = mult.current;
      if (phaseRef.current !== 'flying') {
        clearInterval(fakeIntervalRef.current!);
        return;
      }
      // Cash out 1-4 random pending players each tick
      const toCashout = Math.floor(Math.random() * 4) + 1;
      let changed = false;
      for (let k = 0; k < toCashout; k++) {
        const idx = pending.findIndex(p => !p.cashedOut);
        if (idx === -1) { clearInterval(fakeIntervalRef.current!); break; }
        // Randomly decide cashout point between 1.1x and current mult
        const cashM = parseFloat((1.1 + Math.random() * Math.max(0.1, m - 1.1)).toFixed(2));
        pending[idx] = {
          ...pending[idx],
          multiplier: cashM,
          win: Math.floor(pending[idx].bet * cashM * 100) / 100,
          cashedOut: true,
        };
        changed = true;
      }
      if (changed) setFakePlayers([...pending]);
    }, 300 + Math.random() * 400); // every 300-700ms
  }

  function finishFakePlayers(crashPt: number) {
    if (fakeIntervalRef.current) { clearInterval(fakeIntervalRef.current!); }
    setFakePlayers(prev => prev.map(p => p.cashedOut ? p : { ...p, multiplier: 0, win: 0, cashedOut: true }));
    void crashPt;
  }

  // ── Canvas RAF ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (screen !== 'game') return;
    let alive = true;

    function drawPlane(ctx: CanvasRenderingContext2D, x: number, y: number, angle: number) {
      ctx.save(); ctx.translate(x, y); ctx.rotate(angle);
      ctx.fillStyle = '#ff6b35';
      ctx.beginPath(); ctx.moveTo(26,0); ctx.lineTo(-8,-7); ctx.lineTo(-16,0); ctx.lineTo(-8,7); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#ffa07a';
      ctx.beginPath(); ctx.moveTo(2,-1); ctx.lineTo(-11,-16); ctx.lineTo(-16,-3); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(2, 1); ctx.lineTo(-11, 16); ctx.lineTo(-16, 3); ctx.closePath(); ctx.fill();
      const g = ctx.createRadialGradient(-18,0,0,-18,0,13);
      g.addColorStop(0,'rgba(255,165,0,0.95)'); g.addColorStop(1,'rgba(255,90,0,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(-18,0,13,0,Math.PI*2); ctx.fill();
      ctx.restore();
    }

    function frame() {
      if (!alive) return;
      const cvs = canvasRef.current;
      if (!cvs) { rafRef.current = requestAnimationFrame(frame); return; }
      const ctx = cvs.getContext('2d');
      if (!ctx) { rafRef.current = requestAnimationFrame(frame); return; }
      const W = cvs.width, H = cvs.height;
      const ph = phaseRef.current;
      const pL = 28, pB = 22;
      const gW = W - pL - 10, gH = H - pB - 10;

      ctx.clearRect(0, 0, W, H);

      // Stars
      stars.current.forEach(s => {
        ctx.beginPath(); ctx.arc(s.x*W, s.y*H, s.r, 0, Math.PI*2);
        ctx.fillStyle = `rgba(255,255,255,${s.a})`; ctx.fill();
      });
      // Grid
      ctx.strokeStyle = 'rgba(255,255,255,0.04)'; ctx.lineWidth = 1;
      for (let i=1; i<5; i++) {
        ctx.beginPath(); ctx.moveTo(pL, H-pB-gH*i/4); ctx.lineTo(W-8, H-pB-gH*i/4); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(pL+gW*i/4, H-pB); ctx.lineTo(pL+gW*i/4, 10); ctx.stroke();
      }
      ctx.strokeStyle = 'rgba(255,255,255,0.10)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(pL,10); ctx.lineTo(pL,H-pB); ctx.lineTo(W-8,H-pB); ctx.stroke();

      // ── WAITING ──────────────────────────────────────────────────────────
      if (ph === 'waiting') {
        const elSec = (Date.now() - waitStartTs.current) / 1000;
        const left  = Math.max(0, waitTotal.current - elSec);
        const pct   = Math.max(0, Math.min(1, left / waitTotal.current));
        drawPlane(ctx, pL+8, H-pB-8, 0);
        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.font = '700 10px Inter,system-ui';
        ctx.fillText('WAITING FOR NEXT ROUND', W/2, H/2-44);
        ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.font = '500 12px Inter,system-ui';
        ctx.fillText('Starting in', W/2, H/2-20);
        ctx.fillStyle = '#fff'; ctx.font = '900 76px Inter,system-ui';
        ctx.shadowColor = 'rgba(255,255,255,0.18)'; ctx.shadowBlur = 20;
        ctx.fillText(String(Math.ceil(left)), W/2, H/2+38);
        ctx.shadowBlur = 0;
        // Progress bar
        const bx = W/2-90, by = H/2+60, bw = 180, bh = 6;
        ctx.fillStyle = 'rgba(255,255,255,0.08)';
        ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 3); ctx.fill();
        if (pct > 0) {
          const bg = ctx.createLinearGradient(bx,0,bx+bw,0);
          bg.addColorStop(0,'#ff6b35'); bg.addColorStop(1,'#fbbf24');
          ctx.fillStyle = bg;
          ctx.beginPath(); ctx.roundRect(bx, by, bw*pct, bh, 3); ctx.fill();
        }
        rafRef.current = requestAnimationFrame(frame); return;
      }

      // ── CRASHED ──────────────────────────────────────────────────────────
      if (ph === 'crashed') {
        ctx.fillStyle = 'rgba(200,20,20,0.05)'; ctx.fillRect(0,0,W,H);
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ef4444'; ctx.font = '800 11px Inter,system-ui'; ctx.letterSpacing = '4px';
        ctx.fillText('FLEW AWAY!', W/2, H/2-30);
        ctx.letterSpacing = '0px';
        ctx.font = '900 64px Inter,system-ui';
        ctx.shadowColor = 'rgba(239,68,68,0.6)'; ctx.shadowBlur = 32;
        ctx.fillStyle = '#ef4444'; ctx.fillText(fmtX(crashed.current), W/2, H/2+28);
        ctx.shadowBlur = 0;
        rafRef.current = requestAnimationFrame(frame); return;
      }

      // ── FLYING ───────────────────────────────────────────────────────────
      const elMs = Date.now() - startTs.current;
      const ticks = elMs / 100;
      const m = Math.max(1.00, Math.pow(1.005, ticks));
      mult.current = m;
      const t  = Math.min(elMs / 70000, 0.97);
      const sx = pL+8, sy = H-pB-8, ex = W-14, ey = 22;
      const cpx = pL+gW*0.15, cpy = H-pB-gH*0.72;
      // Curve
      ctx.beginPath(); ctx.moveTo(sx, sy);
      for (let i=0; i<=80*t; i++) {
        const ti = i/80;
        ctx.lineTo((1-ti)**2*sx+2*(1-ti)*ti*cpx+ti**2*ex, (1-ti)**2*sy+2*(1-ti)*ti*cpy+ti**2*ey);
      }
      const lg = ctx.createLinearGradient(sx,sy,ex,ey);
      lg.addColorStop(0,'rgba(25,230,107,0.95)'); lg.addColorStop(1,'rgba(0,207,255,0.95)');
      ctx.strokeStyle = lg; ctx.lineWidth = 2.5; ctx.setLineDash([]); ctx.stroke();
      // Fill
      ctx.beginPath(); ctx.moveTo(sx,sy);
      for (let i=0; i<=80*t; i++) {
        const ti = i/80;
        ctx.lineTo((1-ti)**2*sx+2*(1-ti)*ti*cpx+ti**2*ex, (1-ti)**2*sy+2*(1-ti)*ti*cpy+ti**2*ey);
      }
      ctx.lineTo((1-t)**2*sx+2*(1-t)*t*cpx+t**2*ex, sy); ctx.closePath();
      const fg = ctx.createLinearGradient(0,ey,0,sy);
      fg.addColorStop(0,'rgba(25,230,107,0.12)'); fg.addColorStop(1,'rgba(25,230,107,0)');
      ctx.fillStyle = fg; ctx.fill();
      // Plane
      const ptx = (1-t)**2*sx+2*(1-t)*t*cpx+t**2*ex;
      const pty = (1-t)**2*sy+2*(1-t)*t*cpy+t**2*ey;
      const pp  = Math.max(0, t-0.01);
      const ang = Math.atan2(
        pty-((1-pp)**2*sy+2*(1-pp)*pp*cpy+pp**2*ey),
        ptx-((1-pp)**2*sx+2*(1-pp)*pp*cpx+pp**2*ex)
      );
      drawPlane(ctx, ptx, pty, ang);
      // Multiplier text
      const mc = multColor(m);
      ctx.textAlign='center'; ctx.font='900 64px Inter,system-ui';
      ctx.shadowColor=mc+'88'; ctx.shadowBlur=28;
      ctx.fillStyle=mc; ctx.fillText(fmtX(m), W/2, H/2+28);
      ctx.shadowBlur=0;
      // Live cashout button update
      if (betRef.current !== null && cashRef.current === null) {
        const liveWin = Math.floor((betRef.current * m)*100)/100;
        const btn = document.getElementById('cashout-text');
        if (btn && !btn.textContent?.includes('Cashing')) {
          btn.textContent = `💸 CASH OUT — ${fmtBr(liveWin)}`;
        }
      }
      rafRef.current = requestAnimationFrame(frame);
    }

    rafRef.current = requestAnimationFrame(frame);
    return () => { alive = false; cancelAnimationFrame(rafRef.current); };
  }, [screen]);

  // ── Canvas resize ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (screen !== 'game') return;
    const resize = () => {
      const c = canvasRef.current; if (!c) return;
      const p = c.parentElement; if (!p) return;
      c.width = p.clientWidth; c.height = p.clientHeight;
    };
    resize(); window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [screen]);

  // ── State transitions ─────────────────────────────────────────────────────
  function goWait(countdown: number) {
    phaseRef.current = 'waiting'; mult.current = 1.00;
    waitStartTs.current = Date.now(); waitTotal.current = countdown;
    betRef.current = null; cashRef.current = null;
    setPhase('waiting'); setActiveBet(null); setCashedAt(null); setMsg('');
    // Start fake players for next round
    startFakePlayers();
  }

  function goFly() {
    phaseRef.current = 'flying'; mult.current = 1.00; startTs.current = Date.now();
    setPhase('flying');
    // Begin fake cashouts
    setFakePlayers(prev => {
      startFakeCashouts(prev);
      return prev;
    });
  }

  function goCrash(point: number) {
    const lostBet = betRef.current !== null && cashRef.current === null;
    phaseRef.current = 'crashed'; crashed.current = point; mult.current = point;
    setPhase('crashed');
    finishFakePlayers(point);
    if (lostBet) {
      const amt = betRef.current!;
      betRef.current = null; setActiveBet(null);
      setMsg(`💸 Lost ${fmtBr(amt)}`);
    }
    betRef.current = null;
  }

  // ── Practice loop ─────────────────────────────────────────────────────────
  function startPractice() {
    const r = Math.random();
    const crashPt = Math.max(1.01, Math.min(Math.floor(0.99/(1-r)*100)/100, 250));
    crashed.current = crashPt;
    goWait(6);
    setTimeout(() => {
      goFly();
      const checker = setInterval(() => {
        if (mult.current >= crashPt) {
          clearInterval(checker);
          const lostBet = betRef.current !== null && cashRef.current === null;
          goCrash(crashPt);
          if (lostBet) setMsg(`💸 Lost ${fmtBr(betRef.current ?? 0)}`);
          setHistory(p => [{ id: Date.now().toString(), m: crashPt }, ...p.slice(0, 19)]);
          setTimeout(() => startPractice(), 3000);
        }
      }, 100);
    }, 6000);
  }

  // ── Real SSE ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (screen !== 'game' || mode !== 'real') return;
    if (esRef.current) esRef.current.close();
    const es = new EventSource(`${API}/api/v1/games/aviator/stream`);
    esRef.current = es;
    es.onmessage = (ev) => {
      try {
        const raw = ev.data?.trim();
        if (!raw || raw.startsWith(':')) return;
        const d = JSON.parse(raw);
        switch (d.event) {
          case 'init':
            if (d.history) setHistory(d.history.map((h: {id:string;crash_at:number}) => ({ id: h.id, m: h.crash_at })));
            if (d.status === 'waiting') {
              if (phaseRef.current !== 'waiting') goWait(d.countdown ?? 6);
            } else if (d.status === 'flying') {
              if (phaseRef.current !== 'flying') goFly();
            } else if (d.status === 'crashed') {
              if (phaseRef.current !== 'crashed') { crashed.current = d.crash_at ?? 1; phaseRef.current='crashed'; mult.current=d.crash_at??1; setPhase('crashed'); finishFakePlayers(d.crash_at??1); }
            }
            break;
          case 'waiting':
            if (phaseRef.current !== 'waiting') goWait(d.countdown ?? 6);
            break;
          case 'flying':
            if (phaseRef.current !== 'flying') goFly();
            break;
          case 'crashed':
            goCrash(d.crash_at ?? 1);
            setHistory(p => [{ id: Date.now().toString(), m: d.crash_at }, ...p.slice(0, 19)]);
            break;
        }
      } catch (e) { console.error('[avi]', e); }
    };
    return () => { es.close(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen, mode]);

  // ── Place bet ─────────────────────────────────────────────────────────────
  async function doPlaceBet(amount: number) {
    if (!amount || amount <= 0 || activeBet !== null || loading) return;
    if (mode === 'practice') {
      if (amount > balance) { setMsg('Insufficient balance'); return; }
      setBalance(b => b - amount);
      betRef.current = amount; setActiveBet(amount); setMsg(''); return;
    }
    const u = user;
    if (!u) { router.push('/login?callback=/games/aviator'); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/v1/games/aviator/bet`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-User-ID': u.id },
        body: JSON.stringify({ amount }),
      });
      const text = await res.text();
      if (!res.ok) { setMsg('❌ ' + text); setLoading(false); return; }
      betRef.current = amount; setActiveBet(amount); setBalance(b => b - amount); setMsg('');
    } catch { setMsg('❌ Network error'); }
    setLoading(false);
  }

  // ── Cash out ──────────────────────────────────────────────────────────────
  async function doCashOut() {
    const bet = betRef.current;
    if (!bet || phaseRef.current !== 'flying' || cashRef.current !== null || loading) return;
    if (mode === 'practice') {
      const m = mult.current;
      cashRef.current = m; setCashedAt(m);
      const win = Math.floor(bet * m * 100) / 100;
      setBalance(b => b + win); betRef.current = null; setActiveBet(null);
      setMsg(`🎉 Won ${fmtBr(win)} @ ${fmtX(m)}`); return;
    }
    const u = user; if (!u) return;
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/v1/games/aviator/cashout`, {
        method: 'POST', headers: { 'X-User-ID': u.id },
      });
      const text = await res.text();
      if (!res.ok) { setMsg('❌ ' + text); setLoading(false); return; }
      const data = JSON.parse(text);
      const m = data.multiplier ?? mult.current;
      const win = data.win_amount ?? 0;
      cashRef.current = m; setCashedAt(m);
      setBalance(b => b + win); betRef.current = null; setActiveBet(null);
      setMsg(`🎉 Won ${fmtBr(win)} @ ${fmtX(m)}`);
      if (u) { const up = {...u, balance: balance+win}; localStorage.setItem('miraclbet_user', JSON.stringify(up)); setUser(up); }
    } catch { setMsg('❌ Network error'); }
    setLoading(false);
  }

  // ── Queue bet ─────────────────────────────────────────────────────────────
  function queueBet() {
    const amt = parseFloat(betAmt || '0');
    if (!amt || amt <= 0) { setMsg('Enter a valid amount'); return; }
    if (amt > balance) { setMsg('Insufficient balance'); return; }
    setQueuedBet(amt);
    setMsg(`⏳ Queued ${fmtBr(amt)} for next round`);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MODE SELECT
  // ═══════════════════════════════════════════════════════════════════════════
  if (screen === 'select') {
    return (
      <div style={{ minHeight:'100vh', background:'linear-gradient(145deg,#040d1a 0%,#091a35 100%)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'24px 20px', fontFamily:'Inter,system-ui,sans-serif' }}>
        <div style={{ position:'fixed', inset:0, overflow:'hidden', pointerEvents:'none' }}>
          {Array.from({length:55}).map((_,i) => (
            <div key={i} style={{ position:'absolute', left:`${(i*137.5)%100}%`, top:`${(i*91.3)%100}%`, width:(i%3)+1, height:(i%3)+1, borderRadius:'50%', background:'#fff', opacity:.25+(i%5)*.06 }}/>
          ))}
        </div>
        <div style={{ position:'relative', zIndex:1, display:'flex', flexDirection:'column', alignItems:'center', width:'100%', maxWidth:340 }}>
          <div style={{ fontSize:72, marginBottom:12 }}>✈️</div>
          <h1 style={{ fontSize:38, fontWeight:900, color:'#fff', margin:'0 0 8px', letterSpacing:-1 }}>Aviator</h1>
          <p style={{ color:'#6b7280', fontSize:13, margin:'0 0 36px', textAlign:'center', lineHeight:1.7, maxWidth:260 }}>
            Watch the multiplier climb. Cash out before the plane flies away!
          </p>
          <button onClick={() => { setScreen('game'); setMode('practice'); setBalance(10000); setHistory([]); setTimeout(startPractice, 200); }}
            style={{ width:'100%', padding:'18px 22px', borderRadius:16, border:'2px solid rgba(25,230,107,.35)', background:'rgba(25,230,107,.07)', color:'#19e66b', fontSize:15, fontWeight:800, cursor:'pointer', display:'flex', alignItems:'center', gap:14, marginBottom:12 }}>
            <span style={{ fontSize:26 }}>🎮</span>
            <div style={{ textAlign:'left' }}>
              <div>Practice Mode</div>
              <div style={{ fontSize:11, opacity:.6, fontWeight:500, marginTop:2 }}>10,000 Br virtual chips — Free</div>
            </div>
          </button>
          <button onClick={() => { if (!user) { router.push('/login?callback=/games/aviator'); return; } loadUser().then(() => { setScreen('game'); setMode('real'); setHistory([]); }); }}
            style={{ width:'100%', padding:'18px 22px', borderRadius:16, border:'none', background:'linear-gradient(135deg,#ff6b35 0%,#dc2626 100%)', color:'#fff', fontSize:15, fontWeight:800, cursor:'pointer', display:'flex', alignItems:'center', gap:14, boxShadow:'0 8px 28px rgba(255,80,0,.38)' }}>
            <span style={{ fontSize:26 }}>💰</span>
            <div style={{ textAlign:'left' }}>
              <div>Play Real Money</div>
              <div style={{ fontSize:11, opacity:.8, fontWeight:500, marginTop:2 }}>{user ? `Balance: ${fmtBr(user.balance ?? 0)}` : 'Tap to login first'}</div>
            </div>
          </button>
          <button onClick={() => router.push('/')} style={{ marginTop:28, background:'none', border:'none', color:'#4b5563', fontSize:13, cursor:'pointer' }}>← Back to Home</button>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // GAME SCREEN
  // ═══════════════════════════════════════════════════════════════════════════
  const betAmt_n  = parseFloat(betAmt || '0');
  const isWaiting = phase === 'waiting';
  const isFlying  = phase === 'flying';
  const betActive = activeBet !== null;
  const cashedOut = cashedAt !== null;

  // Fake players table derived data
  const cashedOutPlayers = fakePlayers.filter(p => p.cashedOut && p.win && p.win > 0);
  const pendingPlayers   = fakePlayers.filter(p => !p.cashedOut);
  const totalBets        = fakePlayers.length;
  const totalCashedOut   = cashedOutPlayers.length;
  const totalWin         = cashedOutPlayers.reduce((s, p) => s + (p.win ?? 0), 0);

  // Build display list: sorted cashed-out (descending win) first, then pending
  const sortedDisplay = [
    ...cashedOutPlayers.sort((a,b) => (b.win??0)-(a.win??0)),
    ...pendingPlayers,
  ];

  // Top bets tab
  const topPlayers = [...fakePlayers].sort((a,b) => b.bet - a.bet).slice(0, 20);

  return (
    <div style={{ minHeight:'100vh', background:'#07101f', display:'flex', flexDirection:'column', fontFamily:'Inter,system-ui,sans-serif' }}>

      {/* ── Top bar ── */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 14px', background:'#060e1c', borderBottom:'1px solid rgba(255,255,255,0.06)', position:'sticky', top:0, zIndex:10 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <button onClick={() => { setScreen('select'); cancelAnimationFrame(rafRef.current); if (esRef.current) esRef.current.close(); if (fakeIntervalRef.current) clearInterval(fakeIntervalRef.current); }}
            style={{ background:'none', border:'none', color:'#6b7280', cursor:'pointer', fontSize:20, lineHeight:1, padding:4 }}>←</button>
          <span style={{ color:'#ff6b35', fontSize:17, fontWeight:900 }}>✈️ Aviator</span>
          <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:20, background: mode==='real' ? 'rgba(220,38,38,.18)' : 'rgba(25,230,107,.14)', color: mode==='real' ? '#f87171' : '#19e66b', border:`1px solid ${mode==='real' ? 'rgba(220,38,38,.35)' : 'rgba(25,230,107,.3)'}` }}>
            {mode.toUpperCase()}
          </span>
        </div>
        <div style={{ textAlign:'right' }}>
          <div style={{ fontSize:9, color:'#4b5563', fontWeight:700, letterSpacing:1 }}>BALANCE</div>
          <div style={{ fontSize:16, fontWeight:900, color:'#19e66b' }}>{fmtBr(balance)}</div>
        </div>
      </div>

      {/* ── History pills ── */}
      <div style={{ display:'flex', gap:5, padding:'6px 12px', overflowX:'auto', background:'#060e1c', borderBottom:'1px solid rgba(255,255,255,0.04)', minHeight:32 }}>
        {history.length === 0
          ? <span style={{ color:'#374151', fontSize:11, lineHeight:'20px' }}>No rounds yet</span>
          : history.slice(0,16).map(h => {
              const c = histColor(h.m);
              return <span key={h.id} style={{ flexShrink:0, padding:'2px 9px', borderRadius:20, fontSize:11, fontWeight:800, whiteSpace:'nowrap', background:c.bg, color:c.text, border:`1px solid ${c.border}` }}>{fmtX(h.m)}</span>;
            })}
      </div>

      {/* ── Canvas ── */}
      <div style={{ position:'relative', flex:1, minHeight:240, maxHeight:300, overflow:'hidden' }}>
        <canvas ref={canvasRef} style={{ display:'block', width:'100%', height:'100%' }} />
      </div>

      {/* ── Message bar ── */}
      {msg && (
        <div style={{ padding:'7px 16px', textAlign:'center', fontSize:13, fontWeight:700, color: msg.includes('Won')?'#19e66b': msg.includes('Queued')?'#fbbf24':'#f87171', background: msg.includes('Won')?'rgba(25,230,107,.08)': msg.includes('Queued')?'rgba(251,191,36,.08)':'rgba(239,68,68,.08)', borderTop:'1px solid rgba(255,255,255,.04)' }}>
          {msg}
        </div>
      )}

      {/* ── Bet Panel ── */}
      <div style={{ padding:'10px 12px 14px', background:'#060e1c', borderTop:'1px solid rgba(255,255,255,.06)' }}>
        <div style={{ display:'flex', alignItems:'center', background:'#0d1f38', borderRadius:12, padding:'10px 14px', marginBottom:8, border:'1px solid rgba(255,255,255,.07)' }}>
          <input type="number" value={betAmt} onChange={e => setBetAmt(e.target.value)} disabled={betActive || loading}
            style={{ flex:1, background:'none', border:'none', outline:'none', color:'#fff', fontSize:22, fontWeight:800, fontFamily:'inherit', minWidth:0 }}
            placeholder="0" min="1" />
          <span style={{ color:'#374151', fontWeight:600, fontSize:13, marginLeft:8 }}>Br</span>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:6, marginBottom:10 }}>
          {[50,100,200,500,1000].map(v => (
            <button key={v} onClick={() => setBetAmt(String((betAmt_n||0)+v))} disabled={betActive||loading}
              style={{ padding:'7px 2px', borderRadius:9, border:'1px solid rgba(255,255,255,.07)', background:'#0d1f38', color:'#9ca3af', fontSize:11, fontWeight:700, cursor:'pointer' }}>+{v}</button>
          ))}
        </div>

        {/* Action buttons */}
        {isWaiting && !betActive && (
          <button onClick={() => doPlaceBet(betAmt_n)} disabled={loading || betAmt_n <= 0 || betAmt_n > balance}
            style={{ width:'100%', padding:'15px', borderRadius:14, border:'none', background: betAmt_n > balance ? '#374151' : 'linear-gradient(135deg,#ff6b35,#dc2626)', color:'#fff', fontSize:16, fontWeight:900, cursor: betAmt_n > balance ? 'not-allowed':'pointer', boxShadow: betAmt_n > balance ? 'none':'0 4px 20px rgba(255,80,0,.38)', opacity: loading?.7:1 }}>
            {loading ? '⏳ Placing...' : betAmt_n > balance ? '❌ Insufficient Balance' : `🎯 Place Bet — ${fmtBr(betAmt_n)}`}
          </button>
        )}
        {isWaiting && betActive && (
          <div style={{ width:'100%', padding:'15px', borderRadius:14, background:'rgba(25,230,107,.08)', color:'#19e66b', fontSize:14, fontWeight:800, textAlign:'center', border:'1px solid rgba(25,230,107,.25)' }}>
            ✅ {fmtBr(activeBet!)} Placed — Waiting for round…
          </div>
        )}
        {isFlying && betActive && !cashedOut && (
          <button onClick={doCashOut} disabled={loading}
            style={{ width:'100%', padding:'15px', borderRadius:14, border:'none', background:'linear-gradient(135deg,#19e66b,#059669)', color:'#000', fontSize:16, fontWeight:900, cursor:'pointer', boxShadow:'0 4px 24px rgba(25,230,107,.45)', opacity: loading?.7:1 }}>
            <span id="cashout-text">{loading ? '⏳ Cashing out...' : `💸 CASH OUT — ${fmtBr(Math.floor((activeBet! * mult.current)*100)/100)}`}</span>
          </button>
        )}
        {isFlying && cashedOut && (
          <div style={{ width:'100%', padding:'15px', borderRadius:14, background:'rgba(25,230,107,.07)', color:'#19e66b', fontSize:13, fontWeight:700, textAlign:'center', border:'1px solid rgba(25,230,107,.2)' }}>
            ✅ Cashed out @ {fmtX(cashedAt!)} — Round still going…
          </div>
        )}
        {isFlying && !betActive && (
          <button onClick={queueBet} disabled={!!queuedBet}
            style={{ width:'100%', padding:'15px', borderRadius:14, border:'none', background: queuedBet ? '#1e3a5f':'linear-gradient(135deg,#2563eb,#1d4ed8)', color:'#fff', fontSize:15, fontWeight:800, cursor: queuedBet?'default':'pointer', boxShadow: queuedBet?'none':'0 4px 18px rgba(37,99,235,.38)' }}>
            {queuedBet ? `⏳ Queued ${fmtBr(queuedBet)} for next round` : `🎯 Bet Next Round — ${fmtBr(betAmt_n)}`}
          </button>
        )}
        {phase === 'crashed' && !queuedBet && (
          <button onClick={queueBet}
            style={{ width:'100%', padding:'15px', borderRadius:14, border:'none', background:'linear-gradient(135deg,#ff6b35,#dc2626)', color:'#fff', fontSize:15, fontWeight:800, cursor:'pointer', boxShadow:'0 4px 18px rgba(255,80,0,.35)' }}>
            🎯 Bet Next Round — {fmtBr(betAmt_n)}
          </button>
        )}
        {phase === 'crashed' && !!queuedBet && (
          <button onClick={() => { setQueuedBet(null); setMsg(''); }}
            style={{ width:'100%', padding:'15px', borderRadius:14, border:'1px solid rgba(239,68,68,.4)', background:'rgba(239,68,68,.08)', color:'#f87171', fontSize:13, fontWeight:700, cursor:'pointer', textAlign:'center' }}>
            ⏳ {fmtBr(queuedBet)} queued — Tap to cancel
          </button>
        )}
      </div>

      {/* ════════════════════════════════════════════════════════════════
          LIVE BETS TABLE  (Spribe-style)
      ════════════════════════════════════════════════════════════════ */}
      <div style={{ background:'#060e1c', borderTop:'1px solid rgba(255,255,255,.06)', paddingBottom:80 }}>
        {/* Tab bar */}
        <div style={{ display:'flex', borderBottom:'1px solid rgba(255,255,255,.06)' }}>
          {(['all','prev','top'] as const).map(tab => (
            <button key={tab} onClick={() => setBetTab(tab)}
              style={{ flex:1, padding:'11px 4px', background:'none', border:'none', color: betTab===tab ? '#ff6b35':'#6b7280', fontSize:13, fontWeight: betTab===tab ? 800:500, cursor:'pointer', borderBottom: betTab===tab ? '2px solid #ff6b35':'2px solid transparent' }}>
              {tab === 'all' ? 'All Bets' : tab === 'prev' ? 'Previous' : 'Top Bets'}
            </button>
          ))}
        </div>

        {/* Summary row */}
        {betTab !== 'top' && fakePlayers.length > 0 && (
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 14px', background:'rgba(255,107,53,.05)', borderBottom:'1px solid rgba(255,255,255,.04)' }}>
            <div>
              <span style={{ color:'#ff6b35', fontWeight:800, fontSize:13 }}>{totalCashedOut}/{totalBets}</span>
              <span style={{ color:'#6b7280', fontSize:11, marginLeft:5 }}>Bets</span>
              {/* Green progress bar */}
              <div style={{ marginTop:3, width:120, height:3, background:'rgba(255,255,255,.08)', borderRadius:2 }}>
                <div style={{ height:3, borderRadius:2, background:'#19e66b', width:`${totalBets > 0 ? (totalCashedOut/totalBets)*100 : 0}%`, transition:'width .3s' }}/>
              </div>
            </div>
            <div style={{ textAlign:'right' }}>
              <div style={{ color:'#19e66b', fontWeight:800, fontSize:14 }}>{fmtBr(totalWin)}</div>
              <div style={{ color:'#6b7280', fontSize:10 }}>Total Win</div>
            </div>
          </div>
        )}

        {/* Column headers */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 80px 64px 80px', padding:'6px 14px', borderBottom:'1px solid rgba(255,255,255,.04)' }}>
          <span style={{ color:'#4b5563', fontSize:10, fontWeight:700 }}>PLAYER</span>
          <span style={{ color:'#4b5563', fontSize:10, fontWeight:700, textAlign:'right' }}>BET Br</span>
          <span style={{ color:'#4b5563', fontSize:10, fontWeight:700, textAlign:'center' }}>X</span>
          <span style={{ color:'#4b5563', fontSize:10, fontWeight:700, textAlign:'right' }}>WIN Br</span>
        </div>

        {/* Rows */}
        <div style={{ maxHeight:320, overflowY:'auto' }}>
          {(betTab === 'top' ? topPlayers : betTab === 'prev' ? [] : sortedDisplay).map((p, i) => {
            const hasCashedOut = p.cashedOut && p.win && p.win > 0;
            const isLost = p.cashedOut && (!p.win || p.win <= 0);
            const mc = hasCashedOut && p.multiplier ? multColor(p.multiplier) : undefined;
            return (
              <div key={p.id+i} style={{ display:'grid', gridTemplateColumns:'1fr 80px 64px 80px', padding:'9px 14px', borderBottom:'1px solid rgba(255,255,255,.025)', background: hasCashedOut ? 'rgba(25,230,107,.025)' : 'transparent', alignItems:'center' }}>
                {/* Avatar + phone */}
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <div style={{ width:28, height:28, borderRadius:'50%', background:`hsl(${parseInt(p.id)*67%360},55%,45%)`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:800, color:'#fff', flexShrink:0 }}>
                    {p.phone[0]}
                  </div>
                  <span style={{ color:'#d1d5db', fontSize:12, fontWeight:600 }}>{p.phone}</span>
                </div>
                {/* Bet */}
                <span style={{ color:'#9ca3af', fontSize:12, textAlign:'right' }}>{p.bet.toLocaleString()}</span>
                {/* Multiplier badge */}
                <div style={{ textAlign:'center' }}>
                  {hasCashedOut && p.multiplier ? (
                    <span style={{ fontSize:11, fontWeight:800, color: mc, background: mc ? mc+'20':'transparent', padding:'2px 6px', borderRadius:8, border:`1px solid ${mc}40` }}>
                      {fmtX(p.multiplier)}
                    </span>
                  ) : isLost ? (
                    <span style={{ fontSize:10, color:'#4b5563' }}>—</span>
                  ) : (
                    <span style={{ fontSize:11, color:'#374151' }}>…</span>
                  )}
                </div>
                {/* Win */}
                <span style={{ color: hasCashedOut ? '#19e66b' : '#4b5563', fontSize:12, fontWeight: hasCashedOut ? 700:400, textAlign:'right' }}>
                  {hasCashedOut ? p.win!.toLocaleString('en',{minimumFractionDigits:2,maximumFractionDigits:2}) : '—'}
                </span>
              </div>
            );
          })}
          {(betTab === 'prev') && (
            <div style={{ padding:'24px', textAlign:'center', color:'#374151', fontSize:12 }}>
              Previous round results will appear here
            </div>
          )}
          {fakePlayers.length === 0 && betTab !== 'prev' && (
            <div style={{ padding:'24px', textAlign:'center', color:'#374151', fontSize:12 }}>
              Waiting for next round to start…
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
