'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, Plus, Trash2, Copy, Check, Zap, ChevronDown,
  Search, Ticket, Clock, RefreshCw, PlusCircle, ListFilter,
} from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://api.miraclbet.com:8443';

type Team = { api_id: number; name: string; logo: string; country: string; country_flag: string };
type Leg = {
  matchName: string; homeLogo: string; awayLogo: string;
  marketName: string; selectionName: string; odds: string; kickoffAt: string;
};
type TicketSelection = {
  matchName?: string; homeLogo?: string; awayLogo?: string;
  marketName?: string; selectionName?: string; odds?: number; kickoffAt?: string;
};
type ManualTicket = {
  code: string;
  selections: TicketSelection[];
  total_odds: number;
  created_at: string;
};

const EMPTY_LEG = (): Leg => ({
  matchName: '', homeLogo: '', awayLogo: '',
  marketName: 'Match Winner', selectionName: 'Home Win',
  odds: '1.90', kickoffAt: '',
});

const MARKETS = ['Match Winner', 'Both Teams to Score', 'Over 2.5 Goals', 'Under 2.5 Goals', 'Draw No Bet', 'Correct Score'];
const SELECTIONS: Record<string, string[]> = {
  'Match Winner': ['Home Win', 'Draw', 'Away Win'],
  'Both Teams to Score': ['Yes', 'No'],
  'Over 2.5 Goals': ['Over 2.5'],
  'Under 2.5 Goals': ['Under 2.5'],
  'Draw No Bet': ['Home', 'Away'],
  'Correct Score': ['1-0', '2-0', '2-1', '3-0', '3-1', '0-0', '1-1', '0-1', '0-2'],
};

/* ─── Team Picker ───────────────────────────────────────── */
function TeamPicker({ label, value, teams, onChange }: {
  label: string; value: string; teams: Team[]; onChange: (t: Team) => void;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const selected = teams.find(t => t.logo === value) ?? null;

  const filtered = q.trim()
    ? teams.filter(t => t.name.toLowerCase().includes(q.toLowerCase()) || t.country.toLowerCase().includes(q.toLowerCase()))
    : teams;

  const grouped: Record<string, Team[]> = {};
  filtered.forEach(t => { (grouped[t.country] ??= []).push(t); });

  useEffect(() => {
    const fn = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <label style={{ fontSize: 11, color: '#4B5563', fontWeight: 700, display: 'block', marginBottom: 6, letterSpacing: 0.5 }}>{label}</label>
      <button type="button" onClick={() => { setOpen(o => !o); setQ(''); }}
        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, background: '#fff', border: `1.5px solid ${open ? '#059669' : value ? '#059669' : '#D1D5DB'}`, borderRadius: 10, padding: '10px 12px', cursor: 'pointer', boxShadow: open ? '0 0 0 3px rgba(5,150,105,0.1)' : 'none', transition: 'all 0.15s' }}>
        {selected ? (
          <>
            <img src={selected.logo} width={28} height={28} alt="" style={{ objectFit: 'contain', flexShrink: 0 }} />
            <div style={{ flex: 1, textAlign: 'left' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>{selected.name}</div>
              <div style={{ fontSize: 11, color: '#6B7280', display: 'flex', alignItems: 'center', gap: 4 }}>
                <img src={selected.country_flag} width={14} height={10} alt="" style={{ objectFit: 'cover', borderRadius: 1 }} />
                {selected.country}
              </div>
            </div>
          </>
        ) : (
          <span style={{ flex: 1, fontSize: 13, color: '#9CA3AF', textAlign: 'left' }}>Select team...</span>
        )}
        <ChevronDown size={16} style={{ color: '#6B7280', transform: open ? 'rotate(180deg)' : 'none', transition: '0.2s', flexShrink: 0 }} />
      </button>

      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, zIndex: 999, background: '#fff', border: '1.5px solid #E5E7EB', borderRadius: 12, boxShadow: '0 12px 40px rgba(0,0,0,0.14)', maxHeight: 300, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '10px 12px', borderBottom: '1px solid #F3F4F6', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Search size={14} style={{ color: '#9CA3AF', flexShrink: 0 }} />
            <input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="Search team or country..."
              style={{ flex: 1, border: 'none', outline: 'none', fontSize: 13, color: '#111827', background: 'transparent' }} />
          </div>
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {Object.keys(grouped).length === 0 && <div style={{ padding: 16, textAlign: 'center', color: '#9CA3AF', fontSize: 13 }}>No teams found</div>}
            {Object.entries(grouped).map(([country, cteams]) => (
              <div key={country}>
                <div style={{ padding: '6px 12px 4px', fontSize: 10, fontWeight: 800, color: '#9CA3AF', letterSpacing: 1, background: '#F9FAFB', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <img src={cteams[0].country_flag} width={14} height={10} alt="" style={{ objectFit: 'cover' }} />
                  {country.toUpperCase()}
                </div>
                {cteams.map(t => (
                  <button key={t.api_id} type="button" onClick={() => { onChange(t); setOpen(false); }}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', border: 'none', background: value === t.logo ? '#F0FDF4' : 'transparent', cursor: 'pointer', textAlign: 'left', borderLeft: value === t.logo ? '3px solid #059669' : '3px solid transparent' }}>
                    <img src={t.logo} width={26} height={26} alt="" style={{ objectFit: 'contain', flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{t.name}</div>
                      <div style={{ fontSize: 11, color: '#9CA3AF' }}>{t.country}</div>
                    </div>
                    {value === t.logo && <Check size={14} style={{ color: '#059669', marginLeft: 'auto' }} />}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Select Picker (Mobile First Dropdown) ─────────────── */
function SelectPicker({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fn = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <label style={{ fontSize: 11, color: '#4B5563', fontWeight: 700, display: 'block', marginBottom: 6, letterSpacing: 0.5 }}>{label}</label>
      <button type="button" onClick={() => setOpen(o => !o)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fff', border: `1.5px solid ${open ? '#059669' : '#D1D5DB'}`, borderRadius: 10, padding: '10px 12px', cursor: 'pointer', boxShadow: open ? '0 0 0 3px rgba(5,150,105,0.1)' : 'none', transition: 'all 0.15s' }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{value || 'Select...'}</span>
        <ChevronDown size={16} style={{ color: '#6B7280', transform: open ? 'rotate(180deg)' : 'none', transition: '0.2s', flexShrink: 0 }} />
      </button>

      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, zIndex: 999, background: '#fff', border: '1.5px solid #E5E7EB', borderRadius: 12, boxShadow: '0 12px 40px rgba(0,0,0,0.14)', maxHeight: 250, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          {options.map(opt => (
            <button key={opt} type="button" onClick={() => { onChange(opt); setOpen(false); }}
              style={{ width: '100%', padding: '12px 14px', border: 'none', borderBottom: '1px solid #F3F4F6', background: value === opt ? '#F0FDF4' : 'transparent', cursor: 'pointer', textAlign: 'left', fontSize: 13, fontWeight: value === opt ? 700 : 500, color: value === opt ? '#065F46' : '#374151', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              {opt}
              {value === opt && <Check size={14} style={{ color: '#059669' }} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Ticket Card ───────────────────────────────────────── */
function TicketCard({ ticket }: { ticket: ManualTicket }) {
  const [copied, setCopied] = useState(false);
  const [, setTick] = useState(0); // forces re-render every second

  // Re-render every second so statuses update live
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const copy = () => {
    navigator.clipboard.writeText(ticket.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const now = Date.now();
  const MATCH_DURATION_MS = 105 * 60 * 1000; // 105 min including extra time

  // Per-leg status
  const legStatuses = ticket.selections.map(s => {
    if (!s.kickoffAt) return 'PENDING';
    const ko = new Date(s.kickoffAt).getTime();
    const ends = ko + MATCH_DURATION_MS;
    if (now >= ends) return 'WON';
    if (now >= ko)   return 'LIVE';
    return 'PENDING';
  });

  // Overall ticket status
  const allWon     = legStatuses.every(st => st === 'WON');
  const anyLive    = legStatuses.some(st => st === 'LIVE');
  const allPending = legStatuses.every(st => st === 'PENDING');

  const ticketStatus = allWon ? 'WON' : anyLive ? 'LIVE' : allPending ? 'PENDING' : 'IN PROGRESS';
  const statusColor  = allWon ? '#059669' : anyLive ? '#EF4444' : '#D97706';
  const statusBg     = allWon ? '#F0FDF4' : anyLive ? '#FEF2F2' : '#FFFBEB';
  const statusBorder = allWon ? '#A7F3D0' : anyLive ? '#FECACA' : '#FDE68A';
  const statusIcon   = allWon ? '✅' : anyLive ? '⚡' : '⏳';

  // Progress count
  const wonCount  = legStatuses.filter(st => st === 'WON').length;
  const liveCount = legStatuses.filter(st => st === 'LIVE').length;
  const total     = legStatuses.length;

  const LEG_CFG = {
    WON:     { bg: '#F0FDF4', border: '#A7F3D0', color: '#059669', icon: '✅', label: 'WON' },
    LIVE:    { bg: '#FEF2F2', border: '#FECACA', color: '#EF4444', icon: '⚡ LIVE', label: 'LIVE' },
    PENDING: { bg: '#F9FAFB', border: '#E5E7EB', color: '#9CA3AF', icon: '⏳', label: 'PENDING' },
  };

  return (
    <div style={{ background: '#fff', borderRadius: 14, border: '1.5px solid #E5E7EB', marginBottom: 14, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>

      {/* Ticket header */}
      <div style={{ padding: '12px 14px', background: '#F9FAFB', borderBottom: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Ticket size={15} style={{ color: '#6B7280' }} />
          <span style={{ fontFamily: 'monospace', fontSize: 16, fontWeight: 900, color: '#047857', letterSpacing: 2 }}>{ticket.code}</span>
          {/* Progress pill */}
          <span style={{ fontSize: 11, fontWeight: 800, color: '#6B7280', background: '#F3F4F6', padding: '2px 8px', borderRadius: 20 }}>
            {wonCount}/{total} done
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 800, padding: '4px 12px', borderRadius: 20, background: statusBg, color: statusColor, border: `1.5px solid ${statusBorder}`, display: 'flex', alignItems: 'center', gap: 5 }}>
            {statusIcon} {ticketStatus}
          </span>
          <button onClick={copy} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', background: copied ? '#059669' : '#111827', border: 'none', borderRadius: 8, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
            {copied ? <><Check size={12} /> Copied!</> : <><Copy size={12} /> Copy</>}
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ height: 4, background: '#F3F4F6', position: 'relative' }}>
        <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${(wonCount / Math.max(total, 1)) * 100}%`, background: allWon ? '#059669' : '#F5A623', transition: 'width 1s ease', borderRadius: '0 4px 4px 0' }} />
      </div>

      {/* Legs */}
      <div style={{ padding: '10px 14px' }}>
        {ticket.selections.map((s, si) => {
          const st = legStatuses[si];
          const cfg = LEG_CFG[st as keyof typeof LEG_CFG] || LEG_CFG.PENDING;
          const ko = s.kickoffAt ? new Date(s.kickoffAt) : null;
          const ends = ko ? new Date(ko.getTime() + MATCH_DURATION_MS) : null;

          return (
            <div key={si} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 10px', borderRadius: 10, marginBottom: si < ticket.selections.length - 1 ? 6 : 0,
              background: cfg.bg, border: `1px solid ${cfg.border}`,
              transition: 'background 0.5s, border 0.5s',
            }}>
              {/* Leg number */}
              <span style={{ fontSize: 11, background: cfg.color, color: '#fff', padding: '2px 8px', borderRadius: 5, fontWeight: 800, flexShrink: 0, minWidth: 22, textAlign: 'center' }}>{si + 1}</span>

              {/* Home logo */}
              {s.homeLogo && <img src={s.homeLogo} width={22} height={22} alt="" style={{ objectFit: 'contain', flexShrink: 0 }} />}

              {/* Match info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.matchName || 'Match'}</div>
                <div style={{ fontSize: 11, color: '#6B7280' }}>{s.selectionName} · {s.marketName}</div>
                {ko && (
                  <div style={{ fontSize: 10, color: cfg.color, fontWeight: 700, marginTop: 2 }}>
                    {st === 'PENDING' ? `Kicks off: ${ko.toLocaleString()}` : st === 'LIVE' ? `⚡ Live — ends ~${ends?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : `Finished: ${ends?.toLocaleString()}`}
                  </div>
                )}
              </div>

              {/* Away logo */}
              {s.awayLogo && <img src={s.awayLogo} width={22} height={22} alt="" style={{ objectFit: 'contain', flexShrink: 0 }} />}

              {/* Odds + status */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2, flexShrink: 0 }}>
                <span style={{ fontSize: 13, fontWeight: 900, color: '#047857' }}>{s.odds?.toFixed(2)}</span>
                <span style={{ fontSize: 10, fontWeight: 800, color: cfg.color }}>{cfg.icon}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div style={{ padding: '8px 14px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #F3F4F6' }}>
        <div style={{ fontSize: 12, color: '#9CA3AF', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Clock size={12} />
          {allWon ? '🎉 All matches settled — Ticket WON!' : liveCount > 0 ? `${liveCount} match${liveCount > 1 ? 'es' : ''} live now` : `${wonCount} of ${total} matches done`}
        </div>
        <span style={{ fontSize: 14, fontWeight: 900, color: '#047857' }}>{ticket.total_odds.toFixed(2)}x</span>
      </div>
    </div>
  );
}

/* ─── Main Page ─────────────────────────────────────────── */
export default function AdminManualBetPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [view, setView] = useState<'create' | 'list'>('create');
  // always exactly 3 legs
  const [legs, setLegs] = useState<Leg[]>([EMPTY_LEG(), EMPTY_LEG(), EMPTY_LEG()]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');
  const [codeCopied, setCodeCopied] = useState(false);
  const [savedTeams, setSavedTeams] = useState<Team[]>([]);
  const [tickets, setTickets] = useState<ManualTicket[]>([]);
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [userRole, setUserRole] = useState('ADMIN');

  const fetchTickets = useCallback(async () => {
    setTicketsLoading(true);
    try {
      const res = await fetch(`${API}/api/v1/admin/bets/manual/list`);
      const data = await res.json();
      setTickets(Array.isArray(data) ? data : []);
    } catch { setTickets([]); } finally { setTicketsLoading(false); }
  }, []);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem('miraclbet_user');
    if (!saved) { router.push('/login'); return; }
    const u = JSON.parse(saved);
    if (u.role !== 'ADMIN' && !(u.role === 'WORKER' && (u.privileges || []).includes('manual-bet'))) { router.push('/worker'); return; }
    setUserRole(u.role || 'ADMIN');
    fetch(`${API}/api/v1/admin/teams`).then(r => r.json()).then(d => setSavedTeams(d || []));
    fetchTickets();
  }, [router, fetchTickets]);

  if (!mounted) return null;

  const updateLeg = (i: number, field: keyof Leg, value: string) =>
    setLegs(prev => prev.map((l, idx) => idx === i ? { ...l, [field]: value } : l));

  const formatOdds = (i: number) => {
    const val = parseFloat(legs[i].odds);
    if (!isNaN(val)) {
      updateLeg(i, 'odds', val.toFixed(2));
    }
  };

  const pickHome = (i: number, t: Team) => {
    setError('');
    if (t.logo === legs[i].awayLogo) {
      setError(`Match ${i+1}: Home team cannot be the same as Away team.`);
      return;
    }
    const awayName = legs[i].matchName.split(' vs ')[1] || '?';
    updateLeg(i, 'matchName', `${t.name} vs ${awayName}`);
    updateLeg(i, 'homeLogo', t.logo);
  };
  
  const pickAway = (i: number, t: Team) => {
    setError('');
    if (t.logo === legs[i].homeLogo) {
      setError(`Match ${i+1}: Away team cannot be the same as Home team.`);
      return;
    }
    const homeName = legs[i].matchName.split(' vs ')[0] || '?';
    updateLeg(i, 'matchName', `${homeName} vs ${t.name}`);
    updateLeg(i, 'awayLogo', t.logo);
  };

  const totalOdds = legs.reduce((acc, l) => acc * (parseFloat(l.odds) || 1), 1);

  const generate = async () => {
    setError('');

    const matchPairs = new Set<string>();

    for (let i = 0; i < 3; i++) {
      const l = legs[i];
      if (!l.homeLogo || !l.awayLogo) { setError(`Match ${i + 1}: Select both Home and Away teams`); return; }
      if (l.homeLogo === l.awayLogo) { setError(`Match ${i + 1}: Home and away teams cannot be the same.`); return; }
      if (!parseFloat(l.odds) || parseFloat(l.odds) <= 1) { setError(`Match ${i + 1}: Odds must be greater than 1.00`); return; }
      if (!l.kickoffAt) { setError(`Match ${i + 1}: Set kickoff date & time`); return; }
      if (!l.selectionName) { setError(`Match ${i + 1}: Choose an outcome`); return; }

      // Check for duplicate matches
      const pairId = [l.homeLogo, l.awayLogo].sort().join('-');
      if (matchPairs.has(pairId)) {
        setError(`You cannot have the exact same match multiple times in one ticket.`);
        return;
      }
      matchPairs.add(pairId);
    }

    setLoading(true);
    try {
      const selections = legs.map((l, i) => ({
        fixtureId: `manual-${Date.now()}-${i}`,
        matchName: l.matchName.trim(),
        marketName: l.marketName || 'Match Winner',
        selectionId: `manual-sel-${i}`,
        selectionName: l.selectionName,
        odds: parseFloat(parseFloat(l.odds).toFixed(2)),
        homeLogo: l.homeLogo,
        awayLogo: l.awayLogo,
        kickoffAt: new Date(l.kickoffAt).toISOString(),
      }));
      const res = await fetch(`${API}/api/v1/admin/bets/manual`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selections, total_odds: totalOdds }),
      });
      const data = await res.json();
      if (!res.ok || !data.code) throw new Error(data.error || 'Failed to generate');
      setGeneratedCode(data.code);
      fetchTickets();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Server error');
    } finally { setLoading(false); }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(generatedCode);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  };

  const reset = () => {
    setLegs([EMPTY_LEG(), EMPTY_LEG(), EMPTY_LEG()]);
    setGeneratedCode('');
    setError('');
  };

  /* ── CREATE VIEW ── */
  const createView = (
    <div>
      <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: 10, padding: '10px 14px', marginBottom: 18, display: 'flex', gap: 8, alignItems: 'center' }}>
        <Zap size={15} style={{ color: '#059669', flexShrink: 0 }} />
        <p style={{ fontSize: 12, color: '#065F46', margin: 0 }}>
          <strong>Auto-Win Ticket:</strong> All 3 matches required. Users who bet with this code win automatically 105 min after last kickoff.
        </p>
      </div>

      {legs.map((leg, i) => (
        <div key={i} style={{ background: '#fff', borderRadius: 14, border: '1px solid #E5E7EB', padding: 16, marginBottom: 14, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <div style={{ background: '#059669', color: '#fff', borderRadius: 6, padding: '3px 10px', fontSize: 12, fontWeight: 800 }}>MATCH {i + 1}</div>
            <span style={{ fontSize: 11, color: '#9CA3AF' }}>Required</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 12 }}>
            <TeamPicker label="🏠 HOME TEAM" value={leg.homeLogo} teams={savedTeams} onChange={t => pickHome(i, t)} />
            <TeamPicker label="✈️ AWAY TEAM" value={leg.awayLogo} teams={savedTeams} onChange={t => pickAway(i, t)} />
          </div>

          {(leg.homeLogo || leg.awayLogo) && (
            <div style={{ background: '#F0FDF4', border: '1px solid #A7F3D0', borderRadius: 10, padding: '10px 16px', marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
              {leg.homeLogo ? <img src={leg.homeLogo} width={32} height={32} alt="" style={{ objectFit: 'contain' }} /> : <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#D1FAE5' }} />}
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: '#059669', fontWeight: 800, letterSpacing: 1 }}>VS</div>
                <div style={{ fontSize: 12, color: '#065F46', fontWeight: 700 }}>{leg.matchName || '? vs ?'}</div>
              </div>
              {leg.awayLogo ? <img src={leg.awayLogo} width={32} height={32} alt="" style={{ objectFit: 'contain' }} /> : <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#D1FAE5' }} />}
            </div>
          )}

          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 11, color: '#4B5563', fontWeight: 700, display: 'block', marginBottom: 6, letterSpacing: 0.5 }}>⏰ KICKOFF DATE & TIME</label>
            <input type="datetime-local" value={leg.kickoffAt} onChange={e => updateLeg(i, 'kickoffAt', e.target.value)}
              style={{ width: '100%', background: '#fff', border: `1.5px solid ${leg.kickoffAt ? '#059669' : '#D1D5DB'}`, borderRadius: 10, padding: '10px 12px', color: '#111827', fontSize: 14, outline: 'none', boxSizing: 'border-box', colorScheme: 'light' }} />
            {leg.kickoffAt && (
              <p style={{ fontSize: 11, color: '#D97706', marginTop: 4 }}>
                ⚡ Auto-settles: {new Date(new Date(leg.kickoffAt).getTime() + 105 * 60000).toLocaleString()}
              </p>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 12 }}>
            <SelectPicker 
              label="MARKET" 
              value={leg.marketName} 
              options={MARKETS} 
              onChange={v => { updateLeg(i, 'marketName', v); updateLeg(i, 'selectionName', SELECTIONS[v][0]); }} 
            />
            <SelectPicker 
              label="OUTCOME" 
              value={leg.selectionName} 
              options={SELECTIONS[leg.marketName] || []} 
              onChange={v => updateLeg(i, 'selectionName', v)} 
            />
          </div>

          <div>
            <label style={{ fontSize: 11, color: '#4B5563', fontWeight: 700, display: 'block', marginBottom: 6, letterSpacing: 0.5 }}>ODDS</label>
            <input type="text" inputMode="decimal" value={leg.odds} onChange={e => updateLeg(i, 'odds', e.target.value)} onBlur={() => formatOdds(i)} min="1.01" step="0.01"
              style={{ width: '100%', background: '#F0FDF4', border: `1.5px solid ${parseFloat(leg.odds) > 1 ? '#A7F3D0' : '#D1D5DB'}`, borderRadius: 10, padding: '12px 14px', color: '#047857', fontSize: 22, fontWeight: 900, outline: 'none', boxSizing: 'border-box', textAlign: 'center' }} />
          </div>
        </div>
      ))}

      {/* Progress indicator */}
      <div style={{ background: '#fff', borderRadius: 10, padding: '12px 16px', marginBottom: 14, border: '1px solid #E5E7EB' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          {[0, 1, 2].map(i => {
            const l = legs[i];
            const ok = l.homeLogo && l.awayLogo && parseFloat(l.odds) > 1 && l.kickoffAt;
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 22, height: 22, borderRadius: '50%', background: ok ? '#059669' : '#E5E7EB', color: ok ? '#fff' : '#9CA3AF', fontSize: 11, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {ok ? <Check size={12} /> : i + 1}
                </div>
                <span style={{ fontSize: 12, color: ok ? '#059669' : '#9CA3AF', fontWeight: 700 }}>Match {i + 1}</span>
              </div>
            );
          })}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 13, color: '#4B5563', fontWeight: 700 }}>Total Odds</span>
          <span style={{ fontSize: 22, fontWeight: 900, color: '#047857' }}>{totalOdds.toFixed(2)}x</span>
        </div>
      </div>

      {error && (
        <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '10px 14px', marginBottom: 14, color: '#DC2626', fontSize: 13, fontWeight: 600 }}>⚠ {error}</div>
      )}

      {generatedCode ? (
        <div style={{ background: '#F0FDF4', borderRadius: 16, border: '1.5px solid #86EFAC', padding: '20px 16px', textAlign: 'center', marginBottom: 12 }}>
          <p style={{ color: '#065F46', fontSize: 11, fontWeight: 800, letterSpacing: 2, margin: '0 0 6px' }}>✅ ADMIN TICKET CODE GENERATED</p>
          <div style={{ color: '#047857', fontSize: 36, fontWeight: 900, letterSpacing: 8, fontFamily: 'monospace', margin: '0 0 8px' }}>{generatedCode}</div>
          <p style={{ color: '#6B7280', fontSize: 12, margin: '0 0 16px' }}>Share with users — they auto-WIN after all 3 matches end.</p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={copyCode} style={{ flex: 1, padding: '12px', background: codeCopied ? '#059669' : '#ECFDF5', border: '1.5px solid #A7F3D0', borderRadius: 10, color: codeCopied ? '#fff' : '#059669', fontWeight: 800, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              {codeCopied ? <><Check size={15} /> Copied!</> : <><Copy size={15} /> Copy Code</>}
            </button>
            <button onClick={reset} style={{ flex: 1, padding: '12px', background: '#F3F4F6', border: '1.5px solid #E5E7EB', borderRadius: 10, color: '#374151', fontWeight: 800, fontSize: 14, cursor: 'pointer' }}>
              Create Another
            </button>
          </div>
        </div>
      ) : (
        <button onClick={generate} disabled={loading}
          style={{ width: '100%', padding: 16, background: loading ? '#E5E7EB' : 'linear-gradient(135deg, #059669, #047857)', border: 'none', borderRadius: 14, color: loading ? '#9CA3AF' : '#fff', fontWeight: 900, fontSize: 16, cursor: loading ? 'not-allowed' : 'pointer', boxShadow: loading ? 'none' : '0 6px 24px rgba(5,150,105,0.3)', letterSpacing: 0.5 }}>
          {loading ? 'Generating...' : '⚡ Generate Admin Ticket Code'}
        </button>
      )}
      <div style={{ height: 32 }} />
    </div>
  );

  /* ── LIST VIEW ── */
  const listView = (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>{tickets.length} ticket{tickets.length !== 1 ? 's' : ''} created</span>
        </div>
        <button onClick={fetchTickets} style={{ background: 'none', border: '1px solid #E5E7EB', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#4B5563', fontWeight: 600 }}>
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {ticketsLoading ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: '#9CA3AF', fontSize: 14 }}>Loading tickets...</div>
      ) : tickets.length === 0 ? (
        <div style={{ background: '#fff', borderRadius: 14, border: '1.5px dashed #D1D5DB', padding: '40px 20px', textAlign: 'center' }}>
          <Ticket size={36} style={{ color: '#D1D5DB', marginBottom: 12 }} />
          <p style={{ color: '#9CA3AF', fontSize: 14, fontWeight: 600, margin: 0 }}>No tickets created yet</p>
          <p style={{ color: '#D1D5DB', fontSize: 12, margin: '4px 0 0' }}>Tap &ldquo;+ Add Ticket&rdquo; above to create your first auto-win ticket</p>
        </div>
      ) : (
        tickets.map(t => <TicketCard key={t.code} ticket={t} />)
      )}
      <div style={{ height: 32 }} />
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#F3F4F6', padding: '16px' }}>
      <div style={{ maxWidth: 560, margin: '0 auto' }}>

        {/* Top bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
          <button onClick={() => router.push(userRole === 'WORKER' ? '/worker' : '/admin')} style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 8, color: '#4B5563', cursor: 'pointer', padding: '7px 9px', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
            <ArrowLeft size={18} />
          </button>
          <div style={{ flex: 1 }}>
            <h1 style={{ color: '#111827', fontWeight: 900, fontSize: 18, margin: 0 }}>Admin Tickets</h1>
            <p style={{ color: '#6B7280', fontSize: 12, margin: 0 }}>3-match auto-win booking codes</p>
          </div>
          {/* Add Ticket button */}
          <button
            onClick={() => { setView(view === 'create' ? 'list' : 'create'); setGeneratedCode(''); setError(''); setLegs([EMPTY_LEG(), EMPTY_LEG(), EMPTY_LEG()]); }}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: view === 'create' ? '#F3F4F6' : '#059669', border: view === 'create' ? '1.5px solid #D1D5DB' : 'none', borderRadius: 10, color: view === 'create' ? '#4B5563' : '#fff', fontWeight: 800, fontSize: 13, cursor: 'pointer', flexShrink: 0, boxShadow: view === 'create' ? 'none' : '0 4px 14px rgba(5,150,105,0.3)' }}>
            {view === 'create' ? <><ListFilter size={15} /> All Tickets</> : <><PlusCircle size={15} /> Add Ticket</>}
          </button>
        </div>

        {/* Tab indicator */}
        <div style={{ display: 'flex', background: '#fff', borderRadius: 10, padding: 4, marginBottom: 18, border: '1px solid #E5E7EB' }}>
          {(['create', 'list'] as const).map(v => (
            <button key={v} onClick={() => setView(v)}
              style={{ flex: 1, padding: '8px', border: 'none', borderRadius: 8, background: view === v ? '#059669' : 'transparent', color: view === v ? '#fff' : '#6B7280', fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              {v === 'create' ? <><Plus size={14} /> Create Ticket</> : <><ListFilter size={14} /> View Tickets</>}
            </button>
          ))}
        </div>

        {view === 'create' ? createView : listView}
      </div>
    </div>
  );
}
