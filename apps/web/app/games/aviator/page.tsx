'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.miraclbet.com:8443';
const GROWTH = 0.005; // matches backend: 0.5% per 100ms
const TICK   = 100;

function fmtX(n: number)  { return n.toFixed(2) + 'x'; }
function fmtBr(n: number) { return n.toLocaleString('en', { minimumFractionDigits: 2 }) + ' Br'; }
function multColor(m: number) {
  if (m < 1.5) return '#ff3a3a';
  if (m < 2.0) return '#ff8c00';
  if (m < 5.0) return '#19e66b';
  return '#00cfff';
}
function histColor(m: number) {
  if (m < 2) return { bg: 'rgba(255,58,58,0.12)', text: '#ff3a3a', border: 'rgba(255,58,58,0.3)' };
  if (m < 5) return { bg: 'rgba(255,140,0,0.12)', text: '#ff8c00', border: 'rgba(255,140,0,0.3)' };
  return { bg: 'rgba(25,230,107,0.12)', text: '#19e66b', border: 'rgba(25,230,107,0.3)' };
}

// ---------- tiny vanilla helper: update a DOM node by ID directly ----------
function setEl(id: string, text: string, color?: string) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = text;
  if (color) (el as HTMLElement).style.color = color;
}

export default function AviatorPage() {
  const router = useRouter();
  const [screen, setScreen] = useState<'select'|'game'>('select');
  const [mode,   setMode]   = useState<'practice'|'real'>('practice');
  const [phase,  setPhase]  = useState<'waiting'|'flying'|'crashed'>('waiting');
  const [balance,    setBalance]    = useState(10000);
  const [betAmt,     setBetAmt]     = useState('100');
  const [activeBet,  setActiveBet]  = useState<number|null>(null);
  const [cashedAt,   setCashedAt]   = useState<number|null>(null);
  const [history,    setHistory]    = useState<{id:string;m:number}[]>([]);
  const [msg,        setMsg]        = useState('');
  const [user,       setUser]       = useState<{id:string;balance:number}|null>(null);

  // game refs — never trigger re-renders
  const mult     = useRef(1.00);
  const crashed  = useRef(1.00);
  const cd       = useRef(5);
  const betRef   = useRef<number|null>(null);
  const cashRef  = useRef<number|null>(null);
  const phaseRef = useRef<'waiting'|'flying'|'crashed'>('waiting');
  const tickRef  = useRef<ReturnType<typeof setInterval>|null>(null);
  const esRef    = useRef<EventSource|null>(null);

  // canvas
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef    = useRef(0);
  const startTs   = useRef(0);
  const stars     = useRef<{x:number;y:number;r:number;a:number}[]>([]);

  // ── load user ──────────────────────────────────────────────────────────
  useEffect(() => {
    stars.current = Array.from({length:70},()=>({ x:Math.random(), y:Math.random(), r:Math.random()*1.4+0.3, a:Math.random()*0.6+0.3 }));
    const u = localStorage.getItem('miraclbet_user');
    if (u) try { setUser(JSON.parse(u)); } catch{/**/}
  }, []);

  // ── canvas RAF ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (screen !== 'game') return;
    let alive = true;

    function drawPlane(ctx: CanvasRenderingContext2D, x: number, y: number, angle: number) {
      ctx.save(); ctx.translate(x,y); ctx.rotate(angle);
      ctx.fillStyle = '#ff6b35';
      ctx.beginPath(); ctx.moveTo(26,0); ctx.lineTo(-8,-7); ctx.lineTo(-16,0); ctx.lineTo(-8,7); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#ff8c60';
      ctx.beginPath(); ctx.moveTo(2,-1); ctx.lineTo(-11,-16); ctx.lineTo(-16,-3); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(2,1); ctx.lineTo(-11,16); ctx.lineTo(-16,3); ctx.closePath(); ctx.fill();
      const g = ctx.createRadialGradient(-18,0,0,-18,0,14);
      g.addColorStop(0,'rgba(255,170,40,0.9)'); g.addColorStop(1,'rgba(255,90,0,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(-18,0,14,0,Math.PI*2); ctx.fill();
      ctx.restore();
    }

    function frame() {
      if (!alive) return;
      const cvs = canvasRef.current; if (!cvs) { rafRef.current = requestAnimationFrame(frame); return; }
      const ctx = cvs.getContext('2d'); if (!ctx) { rafRef.current = requestAnimationFrame(frame); return; }
      const W = cvs.width, H = cvs.height;
      const ph = phaseRef.current;
      const pL = 28, pB = 22;
      const gW = W - pL - 8, gH = H - pB - 8;

      ctx.clearRect(0,0,W,H);

      // stars
      stars.current.forEach(s => {
        ctx.beginPath(); ctx.arc(s.x*W, s.y*H, s.r, 0, Math.PI*2);
        ctx.fillStyle = `rgba(255,255,255,${s.a})`; ctx.fill();
      });

      // axes
      ctx.strokeStyle = 'rgba(255,255,255,0.05)'; ctx.lineWidth = 1;
      for (let i=1;i<5;i++) {
        ctx.beginPath(); ctx.moveTo(pL, H-pB-gH*i/4); ctx.lineTo(W-8, H-pB-gH*i/4); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(pL+gW*i/4, H-pB); ctx.lineTo(pL+gW*i/4, 10); ctx.stroke();
      }
      ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(pL,10); ctx.lineTo(pL,H-pB); ctx.lineTo(W-8,H-pB); ctx.stroke();

      // ── WAITING ──────────────────────────────────────────────────────
      if (ph === 'waiting') {
        drawPlane(ctx, pL+8, H-pB-8, 0);
        ctx.textAlign = 'center'; ctx.font = '700 11px Inter,sans-serif';
        ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fillText('WAITING FOR NEXT ROUND', W/2, H/2-42);
        ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.font = '600 12px Inter,sans-serif'; ctx.fillText('Starting in', W/2, H/2-18);
        ctx.fillStyle = '#ffffff'; ctx.font = `900 80px Inter,sans-serif`;
        ctx.shadowColor = 'rgba(255,255,255,0.2)'; ctx.shadowBlur = 24;
        ctx.fillText(String(Math.max(0,cd.current)), W/2, H/2+32);
        ctx.shadowBlur = 0;
        rafRef.current = requestAnimationFrame(frame); return;
      }

      // ── CRASHED ──────────────────────────────────────────────────────
      if (ph === 'crashed') {
        ctx.fillStyle = 'rgba(255,40,40,0.06)'; ctx.fillRect(0,0,W,H);
        ctx.textAlign = 'center'; ctx.fillStyle = '#ff3a3a'; ctx.font = '700 12px Inter,sans-serif';
        ctx.letterSpacing = '3px'; ctx.fillText('FLEW AWAY!', W/2, H/2-28);
        ctx.font = `900 66px Inter,sans-serif`;
        ctx.shadowColor = 'rgba(255,58,58,0.55)'; ctx.shadowBlur = 30;
        ctx.fillText(fmtX(crashed.current), W/2, H/2+26);
        ctx.shadowBlur = 0;
        rafRef.current = requestAnimationFrame(frame); return;
      }

      // ── FLYING ───────────────────────────────────────────────────────
      const elapsed = (Date.now() - startTs.current) / 1000;
      const t = Math.min(elapsed / 60, 0.97);
      const m = mult.current;
      const sx = pL+8, sy = H-pB-8, ex = W-16, ey = 28;
      const cpx = pL+gW*0.22, cpy = H-pB-gH*0.68;

      // curve
      ctx.beginPath(); ctx.moveTo(sx,sy);
      for (let i=0;i<=60*t;i++) {
        const ti=i/60;
        ctx.lineTo((1-ti)**2*sx+2*(1-ti)*ti*cpx+ti**2*ex, (1-ti)**2*sy+2*(1-ti)*ti*cpy+ti**2*ey);
      }
      const cg = ctx.createLinearGradient(sx,sy,ex,ey);
      cg.addColorStop(0,'rgba(25,230,107,0.9)'); cg.addColorStop(1,'rgba(0,207,255,0.9)');
      ctx.strokeStyle=cg; ctx.lineWidth=2.5; ctx.setLineDash([]); ctx.stroke();

      // fill
      ctx.beginPath(); ctx.moveTo(sx,sy);
      for (let i=0;i<=60*t;i++) {
        const ti=i/60;
        ctx.lineTo((1-ti)**2*sx+2*(1-ti)*ti*cpx+ti**2*ex, (1-ti)**2*sy+2*(1-ti)*ti*cpy+ti**2*ey);
      }
      ctx.lineTo((1-t)**2*sx+2*(1-t)*t*cpx+t**2*ex, sy); ctx.closePath();
      const fg = ctx.createLinearGradient(0,ey,0,sy);
      fg.addColorStop(0,'rgba(25,230,107,0.14)'); fg.addColorStop(1,'rgba(25,230,107,0)');
      ctx.fillStyle=fg; ctx.fill();

      // plane tip
      const px=(1-t)**2*sx+2*(1-t)*t*cpx+t**2*ex;
      const py=(1-t)**2*sy+2*(1-t)*t*cpy+t**2*ey;
      const pp=Math.max(0,t-0.01);
      const ang=Math.atan2(py-((1-pp)**2*sy+2*(1-pp)*pp*cpy+pp**2*ey), px-((1-pp)**2*sx+2*(1-pp)*pp*cpx+pp**2*ex));
      drawPlane(ctx,px,py,ang);

      // multiplier text on canvas
      const mc = multColor(m);
      ctx.textAlign='center'; ctx.font=`900 66px Inter,sans-serif`;
      ctx.shadowColor=mc+'77'; ctx.shadowBlur=28;
      ctx.fillStyle=mc; ctx.fillText(fmtX(m), W/2, H/2+24);
      ctx.shadowBlur=0;

      // also update HTML element directly (belt + suspenders)
      setEl('avi-mult', fmtX(m), mc);

      rafRef.current = requestAnimationFrame(frame);
    }

    rafRef.current = requestAnimationFrame(frame);
    return () => { alive=false; cancelAnimationFrame(rafRef.current); };
  }, [screen]);

  // ── canvas resize ──────────────────────────────────────────────────────
  useEffect(() => {
    if (screen !== 'game') return;
    const resize = () => {
      const c = canvasRef.current; if (!c) return;
      const p = c.parentElement; if (!p) return;
      c.width = p.clientWidth; c.height = p.clientHeight;
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [screen]);

  // ── helpers ────────────────────────────────────────────────────────────
  function stopTick() { if (tickRef.current) { clearInterval(tickRef.current); tickRef.current=null; } }

  function goWait(countdown: number) {
    stopTick();
    phaseRef.current='waiting'; mult.current=1.00; cd.current=countdown;
    betRef.current=null; cashRef.current=null;
    setPhase('waiting'); setActiveBet(null); setCashedAt(null); setMsg('');
    // tick the countdown down every second
    tickRef.current = setInterval(()=>{
      cd.current = Math.max(0, cd.current-1);
    }, 1000);
  }

  function goFly() {
    stopTick();
    phaseRef.current='flying'; mult.current=1.00; startTs.current=Date.now();
    setPhase('flying');
    // tick multiplier every 100ms
    tickRef.current = setInterval(()=>{
      mult.current = Math.round((mult.current + mult.current*GROWTH)*100)/100;
    }, TICK);
  }

  function goCrash(point: number, lostBet: boolean) {
    stopTick();
    phaseRef.current='crashed'; crashed.current=point; mult.current=point;
    setPhase('crashed');
    if (lostBet) {
      const amt = betRef.current!;
      betRef.current=null;
      setActiveBet(null);
      setMsg(`💸 Lost ${fmtBr(amt)}`);
    }
  }

  // ── PRACTICE loop ──────────────────────────────────────────────────────
  function startPractice() {
    const crashPt = (()=>{ const r=Math.random(); return Math.max(1.01,Math.min(Math.floor(0.99/(1-r)*100)/100,200)); })();
    crashed.current = crashPt;
    goWait(5);
    setTimeout(()=>{
      goFly();
      const checker = setInterval(()=>{
        if (mult.current >= crashPt) {
          clearInterval(checker);
          const lost = betRef.current!==null && cashRef.current===null;
          goCrash(crashPt, lost);
          setHistory(p=>[{id:Date.now().toString(),m:crashPt},...p.slice(0,19)]);
          setTimeout(()=>startPractice(), 4000);
        }
      }, TICK);
    }, 5000);
  }

  // ── REAL: SSE ──────────────────────────────────────────────────────────
  useEffect(()=>{
    if (screen!=='game' || mode!=='real') return;
    if (esRef.current) esRef.current.close();
    const es = new EventSource(`${API}/api/v1/games/aviator/stream`);
    esRef.current = es;

    es.onmessage=(ev)=>{
      try {
        if (!ev.data?.trim()) return;
        const d = JSON.parse(ev.data);
        switch(d.event) {
          case 'init':
            if (d.history) setHistory(d.history.map((h:{id:string;crash_at:number})=>({id:h.id,m:h.crash_at})));
            if (d.status==='waiting') goWait(d.countdown??5);
            else if (d.status==='flying') goFly();
            else if (d.status==='crashed') { crashed.current=d.crash_at; goCrash(d.crash_at,false); }
            break;
          case 'waiting':
            if (phaseRef.current!=='waiting') goWait(d.countdown??5);
            else { cd.current = d.countdown??cd.current; stopTick(); }
            break;
          case 'flying':
            if (phaseRef.current!=='flying') goFly();
            break;
          case 'crashed': {
            const lost = betRef.current!==null && cashRef.current===null;
            goCrash(d.crash_at, lost);
            setHistory(p=>[{id:Date.now().toString(),m:d.crash_at},...p.slice(0,19)]);
            break;
          }
        }
      } catch(e) { console.error('[avi]',e); }
    };
    return ()=>{ es.close(); stopTick(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen, mode]);

  // ── bet ────────────────────────────────────────────────────────────────
  async function placeBet() {
    const a = parseFloat(betAmt); if (!a||a<=0||a>balance||phase!=='waiting'||activeBet!==null) return;
    if (mode==='real') {
      const r = await fetch(`${API}/api/v1/games/aviator/bet`,{method:'POST',headers:{'Content-Type':'application/json','X-User-ID':user?.id??''},body:JSON.stringify({amount:a})});
      if (!r.ok) { setMsg(await r.text()); return; }
    }
    setBalance(b=>b-a); betRef.current=a; setActiveBet(a); setMsg('');
  }

  async function cashOut() {
    const bet=betRef.current; if (phase!=='flying'||!bet||cashRef.current!==null) return;
    if (mode==='real') {
      const r = await fetch(`${API}/api/v1/games/aviator/cashout`,{method:'POST',headers:{'X-User-ID':user?.id??''}});
      if (!r.ok) { setMsg('Cashout failed'); return; }
      const data=await r.json();
      cashRef.current=data.multiplier; setCashedAt(data.multiplier);
      setBalance(b=>b+data.win_amount); betRef.current=null; setActiveBet(null);
      setMsg(`🎉 Won ${fmtBr(data.win_amount)} @ ${fmtX(data.multiplier)}`); return;
    }
    const m=mult.current; cashRef.current=m; setCashedAt(m);
    const win=Math.floor(bet*m*100)/100; setBalance(b=>b+win);
    betRef.current=null; setActiveBet(null);
    setMsg(`🎉 Won ${fmtBr(win)} @ ${fmtX(m)}`);
  }

  // ═══════════════════════════════════════════════════════════════════════
  // MODE SELECT
  // ═══════════════════════════════════════════════════════════════════════
  if (screen==='select') return (
    <div style={{minHeight:'100vh',background:'linear-gradient(160deg,#060d1a 0%,#0d1f3c 100%)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'24px 20px'}}>
      {/* stars bg */}
      <div style={{position:'fixed',inset:0,overflow:'hidden',pointerEvents:'none'}}>
        {Array.from({length:50}).map((_,i)=>(
          <div key={i} style={{position:'absolute',left:`${(i*137)%100}%`,top:`${(i*91)%100}%`,width:(i%3)+1,height:(i%3)+1,borderRadius:'50%',background:'#fff',opacity:.3+(i%6)*.07}}/>
        ))}
      </div>

      <div style={{position:'relative',marginBottom:24,width:130,height:130,borderRadius:24,overflow:'hidden',boxShadow:'0 0 60px rgba(255,107,53,.45)',border:'2px solid rgba(255,107,53,.4)'}}>
        <Image src="/games/aviator.png" alt="Aviator" fill style={{objectFit:'cover'}} unoptimized/>
      </div>

      <h1 style={{fontSize:40,fontWeight:900,color:'#fff',margin:'0 0 6px',letterSpacing:-1}}>✈️ Aviator</h1>
      <p style={{color:'#6b7280',fontSize:14,margin:'0 0 40px',maxWidth:300,textAlign:'center',lineHeight:1.7}}>
        The multiplier rises as the plane climbs. Cash out before it flies away!
      </p>

      <div style={{display:'flex',flexDirection:'column',gap:12,width:'100%',maxWidth:320}}>
        <button
          onClick={()=>{ setScreen('game'); setMode('practice'); setBalance(10000); setHistory([]); setTimeout(startPractice,300); }}
          style={{padding:'18px 22px',borderRadius:16,border:'2px solid rgba(25,230,107,.3)',background:'rgba(25,230,107,.07)',color:'#19e66b',fontSize:16,fontWeight:800,cursor:'pointer',display:'flex',alignItems:'center',gap:12,textAlign:'left'}}>
          <span style={{fontSize:24}}>🎮</span>
          <div><div>Practice Mode</div><div style={{fontSize:12,opacity:.65,fontWeight:500,marginTop:2}}>10,000 Br virtual chips • No login needed</div></div>
        </button>
        <button
          onClick={()=>{ if(!user){router.push('/login?callback=/games/aviator');return;} setScreen('game'); setMode('real'); setBalance(user.balance||0); setHistory([]); }}
          style={{padding:'18px 22px',borderRadius:16,border:'none',background:'linear-gradient(135deg,#ff6b35,#e03000)',color:'#fff',fontSize:16,fontWeight:800,cursor:'pointer',display:'flex',alignItems:'center',gap:12,boxShadow:'0 8px 28px rgba(255,107,53,.38)',textAlign:'left'}}>
          <span style={{fontSize:24}}>💰</span>
          <div><div>Play Real Money</div><div style={{fontSize:12,opacity:.8,fontWeight:500,marginTop:2}}>{user?`Balance: ${fmtBr(user.balance??0)}`:'Tap to log in'}</div></div>
        </button>
      </div>

      <button onClick={()=>router.push('/')} style={{marginTop:32,background:'none',border:'none',color:'#4b5563',fontSize:13,cursor:'pointer'}}>← Back</button>
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════
  // GAME SCREEN
  // ═══════════════════════════════════════════════════════════════════════
  const isWait   = phase==='waiting';
  const isFly    = phase==='flying';
  const isCrash  = phase==='crashed';
  const betAmt_n = parseFloat(betAmt||'0');

  return (
    <div style={{minHeight:'100vh',background:'#07101f',display:'flex',flexDirection:'column',fontFamily:'Inter,sans-serif'}}>

      {/* ── Top bar ── */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 14px',background:'#070f1e',borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <button onClick={()=>{ setScreen('select'); stopTick(); cancelAnimationFrame(rafRef.current); if(esRef.current)esRef.current.close(); }}
            style={{background:'none',border:'none',color:'#6b7280',cursor:'pointer',fontSize:20,lineHeight:1}}>←</button>
          <span style={{color:'#ff6b35',fontSize:17,fontWeight:900}}>✈️ Aviator</span>
          <span style={{fontSize:10,fontWeight:700,padding:'2px 8px',borderRadius:20,background:mode==='real'?'rgba(255,107,53,.18)':'rgba(25,230,107,.14)',color:mode==='real'?'#ff6b35':'#19e66b',border:`1px solid ${mode==='real'?'rgba(255,107,53,.35)':'rgba(25,230,107,.3)'}`}}>
            {mode.toUpperCase()}
          </span>
        </div>
        <div style={{textAlign:'right'}}>
          <div style={{fontSize:9,color:'#4b5563',fontWeight:700,letterSpacing:1}}>BALANCE</div>
          <div style={{fontSize:15,fontWeight:900,color:'#19e66b'}}>{fmtBr(balance)}</div>
        </div>
      </div>

      {/* ── History pills ── */}
      <div style={{display:'flex',gap:6,padding:'7px 12px',overflowX:'auto',background:'#07101f',borderBottom:'1px solid rgba(255,255,255,0.04)'}}>
        {history.length===0 && <span style={{color:'#374151',fontSize:11}}>No rounds yet</span>}
        {history.slice(0,14).map(h=>{ const c=histColor(h.m); return (
          <span key={h.id} style={{flexShrink:0,padding:'3px 9px',borderRadius:20,fontSize:11,fontWeight:800,whiteSpace:'nowrap',background:c.bg,color:c.text,border:`1px solid ${c.border}`}}>
            {fmtX(h.m)}
          </span>
        );})}
      </div>

      {/* ── Canvas (draws everything) ── */}
      <div style={{position:'relative',flex:1,minHeight:250,maxHeight:320}}>
        <canvas ref={canvasRef} style={{display:'block',width:'100%',height:'100%'}}/>
        {/* Fallback HTML element for multiplier (updated via setEl) */}
        <div id="avi-mult" style={{
          display: isFly ? 'block' : 'none',
          position:'absolute', left:0, right:0, top:'50%', transform:'translateY(-40%)',
          textAlign:'center', fontSize:66, fontWeight:900, pointerEvents:'none',
          color:'#19e66b', textShadow:'0 0 30px rgba(25,230,107,.5)', lineHeight:1,
        }}>1.00x</div>
      </div>

      {/* ── Status message ── */}
      {msg && (
        <div style={{padding:'8px 14px',textAlign:'center',fontSize:13,fontWeight:700,color:msg.includes('Won')||msg.includes('🎉')?'#19e66b':'#ff3a3a',background:msg.includes('Won')||msg.includes('🎉')?'rgba(25,230,107,.08)':'rgba(255,58,58,.08)',borderTop:'1px solid rgba(255,255,255,.04)'}}>
          {msg}
        </div>
      )}

      {/* ── Bet panel ── */}
      <div style={{padding:'12px 12px 28px',background:'#070f1e',borderTop:'1px solid rgba(255,255,255,.06)'}}>

        {/* Amount input */}
        <div style={{display:'flex',alignItems:'center',background:'#0f1d35',borderRadius:12,padding:'10px 14px',marginBottom:9,border:'1px solid rgba(255,255,255,.07)'}}>
          <input type="number" value={betAmt} onChange={e=>setBetAmt(e.target.value)}
            disabled={!!activeBet||isFly}
            style={{flex:1,background:'none',border:'none',outline:'none',color:'#fff',fontSize:20,fontWeight:700,fontFamily:'inherit'}}
            placeholder="0"/>
          <span style={{color:'#4b5563',fontWeight:600,fontSize:13}}>Br</span>
        </div>

        {/* Quick amounts */}
        <div style={{display:'flex',gap:7,marginBottom:11}}>
          {[50,100,200,500,1000].map(v=>(
            <button key={v} onClick={()=>setBetAmt(String((betAmt_n||0)+v))} disabled={!!activeBet||isFly}
              style={{flex:1,padding:'7px 2px',borderRadius:9,border:'1px solid rgba(255,255,255,.07)',background:'#0f1d35',color:'#9ca3af',fontSize:11,fontWeight:700,cursor:'pointer'}}>
              +{v}
            </button>
          ))}
        </div>

        {/* Action button */}
        {isWait && !activeBet && (
          <button onClick={placeBet}
            style={{width:'100%',padding:'15px',borderRadius:13,border:'none',background:'linear-gradient(135deg,#ff6b35,#e03000)',color:'#fff',fontSize:16,fontWeight:800,cursor:'pointer',boxShadow:'0 4px 18px rgba(255,107,53,.35)'}}>
            🎯 Place Bet — {betAmt_n.toLocaleString('en')} Br
          </button>
        )}
        {isWait && !!activeBet && (
          <div style={{width:'100%',padding:'15px',borderRadius:13,background:'rgba(25,230,107,.08)',color:'#19e66b',fontSize:14,fontWeight:700,textAlign:'center',border:'1px solid rgba(25,230,107,.25)'}}>
            ✓ {fmtBr(activeBet)} placed — starting soon...
          </div>
        )}
        {isFly && !!activeBet && !cashedAt && (
          <button onClick={cashOut}
            style={{width:'100%',padding:'15px',borderRadius:13,border:'none',background:'linear-gradient(135deg,#19e66b,#00b845)',color:'#000',fontSize:16,fontWeight:900,cursor:'pointer',boxShadow:'0 4px 20px rgba(25,230,107,.42)'}}>
            💸 CASH OUT — {fmtBr(Math.floor(activeBet * mult.current * 100)/100)}
          </button>
        )}
        {isFly && (!activeBet || !!cashedAt) && (
          <div style={{width:'100%',padding:'15px',borderRadius:13,background:'#0f1d35',color:'#4b5563',fontSize:14,fontWeight:600,textAlign:'center'}}>
            {cashedAt ? `✓ Cashed out @ ${fmtX(cashedAt)}` : 'Round in progress...'}
          </div>
        )}
        {isCrash && (
          <div style={{width:'100%',padding:'15px',borderRadius:13,background:'#0f1d35',color:'#4b5563',fontSize:14,fontWeight:600,textAlign:'center'}}>
            Next round starting soon...
          </div>
        )}
      </div>
    </div>
  );
}
