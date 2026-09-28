'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Trash2, Copy, Check, Zap, ChevronDown, Search } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://api.miraclbet.com:8443';

type Team = { api_id: number; name: string; logo: string; country: string; country_flag: string };
type Leg = {
  matchName: string; homeLogo: string; awayLogo: string;
  marketName: string; selectionName: string; odds: string; kickoffAt: string;
};

const EMPTY_LEG: Leg = {
  matchName: '', homeLogo: '', awayLogo: '',
  marketName: 'Match Winner', selectionName: 'Home Win',
  odds: '1.90', kickoffAt: '',
};

const MARKETS = ['Match Winner', 'Both Teams to Score', 'Over 2.5 Goals', 'Under 2.5 Goals', 'Draw No Bet', 'Correct Score'];
const SELECTIONS: Record<string, string[]> = {
  'Match Winner': ['Home Win', 'Draw', 'Away Win'],
  'Both Teams to Score': ['Yes', 'No'],
  'Over 2.5 Goals': ['Over 2.5'],
  'Under 2.5 Goals': ['Under 2.5'],
  'Draw No Bet': ['Home', 'Away'],
  'Correct Score': ['1-0', '2-0', '2-1', '3-0', '3-1', '0-0', '1-1', '0-1', '0-2'],
};

/* ── Custom Team Picker Dropdown ─────────────────────────── */
function TeamPicker({
  label, value, teams, onChange,
}: {
  label: string; value: string; teams: Team[];
  onChange: (team: Team) => void;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const selected = teams.find(t => t.logo === value) ?? null;

  const filtered = q.trim()
    ? teams.filter(t => t.name.toLowerCase().includes(q.toLowerCase()) || t.country.toLowerCase().includes(q.toLowerCase()))
    : teams;

  // group by country
  const grouped: Record<string, Team[]> = {};
  filtered.forEach(t => { (grouped[t.country] ??= []).push(t); });

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} style={{ position: 'relative', marginBottom: 0 }}>
      <label style={{ fontSize: 11, color: '#4B5563', fontWeight: 700, display: 'block', marginBottom: 6, letterSpacing: 0.5 }}>
        {label}
      </label>

      {/* Trigger button */}
      <button
        type="button"
        onClick={() => { setOpen(o => !o); setQ(''); }}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 10,
          background: '#fff', border: `1.5px solid ${open ? '#059669' : '#D1D5DB'}`,
          borderRadius: 10, padding: '10px 12px', cursor: 'pointer',
          boxShadow: open ? '0 0 0 3px rgba(5,150,105,0.12)' : 'none',
          transition: 'all 0.15s',
        }}
      >
        {selected ? (
          <>
            <img src={selected.logo} width={28} height={28} alt="" style={{ objectFit: 'contain', flexShrink: 0 }} />
            <div style={{ flex: 1, textAlign: 'left' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>{selected.name}</div>
              <div style={{ fontSize: 11, color: '#6B7280', display: 'flex', alignItems: 'center', gap: 4 }}>
                <img src={selected.country_flag} width={14} height={10} alt="" style={{ objectFit: 'cover' }} />
                {selected.country}
              </div>
            </div>
          </>
        ) : (
          <span style={{ flex: 1, fontSize: 13, color: '#9CA3AF', textAlign: 'left' }}>Select team...</span>
        )}
        <ChevronDown size={16} style={{ color: '#6B7280', transform: open ? 'rotate(180deg)' : 'none', transition: '0.2s', flexShrink: 0 }} />
      </button>

      {/* Dropdown panel */}
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, zIndex: 999,
          background: '#fff', border: '1.5px solid #E5E7EB', borderRadius: 12,
          boxShadow: '0 10px 40px rgba(0,0,0,0.12)',
          maxHeight: 320, display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}>
          {/* Search */}
          <div style={{ padding: '10px 12px', borderBottom: '1px solid #F3F4F6', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Search size={14} style={{ color: '#9CA3AF', flexShrink: 0 }} />
            <input
              autoFocus
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Search team or country..."
              style={{ flex: 1, border: 'none', outline: 'none', fontSize: 13, color: '#111827', background: 'transparent' }}
            />
          </div>

          {/* Grouped list */}
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {Object.keys(grouped).length === 0 && (
              <div style={{ padding: '16px 12px', textAlign: 'center', color: '#9CA3AF', fontSize: 13 }}>No teams found</div>
            )}
            {Object.entries(grouped).map(([country, cteams]) => (
              <div key={country}>
                {/* Country header */}
                <div style={{ padding: '6px 12px 4px', fontSize: 10, fontWeight: 800, color: '#9CA3AF', letterSpacing: 1, background: '#F9FAFB', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <img src={cteams[0].country_flag} width={14} height={10} alt="" style={{ objectFit: 'cover' }} />
                  {country.toUpperCase()}
                </div>
                {cteams.map(t => (
                  <button
                    key={t.api_id}
                    type="button"
                    onClick={() => { onChange(t); setOpen(false); }}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                      padding: '10px 14px', border: 'none', background: value === t.logo ? '#F0FDF4' : 'transparent',
                      cursor: 'pointer', textAlign: 'left', borderLeft: value === t.logo ? '3px solid #059669' : '3px solid transparent',
                    }}
                  >
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

/* ── Main Page ───────────────────────────────────────────── */
export default function AdminManualBetPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [legs, setLegs] = useState<Leg[]>([{ ...EMPTY_LEG }]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [savedTeams, setSavedTeams] = useState<Team[]>([]);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem('miraclbet_user');
    if (!saved) { router.push('/login'); return; }
    const u = JSON.parse(saved);
    if (u.role !== 'ADMIN') { router.push('/'); return; }
    fetch(`${API}/api/v1/admin/teams`).then(r => r.json()).then(d => setSavedTeams(d || []));
  }, [router]);

  if (!mounted) return null;

  const updateLeg = (i: number, field: keyof Leg, value: string) =>
    setLegs(prev => prev.map((l, idx) => idx === i ? { ...l, [field]: value } : l));

  const addLeg = () => { if (legs.length < 3) setLegs(prev => [...prev, { ...EMPTY_LEG }]); };
  const removeLeg = (i: number) => { if (legs.length > 1) setLegs(prev => prev.filter((_, idx) => idx !== i)); };
  const totalOdds = legs.reduce((acc, l) => acc * (parseFloat(l.odds) || 1), 1);

  const pickHome = (i: number, t: Team) => {
    const awayName = legs[i].matchName.split(' vs ')[1] || '';
    updateLeg(i, 'matchName', `${t.name} vs ${awayName || '?'}`);
    updateLeg(i, 'homeLogo', t.logo);
  };
  const pickAway = (i: number, t: Team) => {
    const homeName = legs[i].matchName.split(' vs ')[0] || '';
    updateLeg(i, 'matchName', `${homeName || '?'} vs ${t.name}`);
    updateLeg(i, 'awayLogo', t.logo);
  };

  const generate = async () => {
    setError('');
    for (let i = 0; i < legs.length; i++) {
      const l = legs[i];
      if (!l.homeLogo || !l.awayLogo) { setError(`Match ${i + 1}: Select both teams`); return; }
      if (!parseFloat(l.odds) || parseFloat(l.odds) <= 1) { setError(`Match ${i + 1}: Odds must be > 1.00`); return; }
      if (!l.kickoffAt) { setError(`Match ${i + 1}: Set kickoff time`); return; }
    }
    setLoading(true);
    try {
      const selections = legs.map((l, i) => ({
        fixtureId: `manual-${Date.now()}-${i}`,
        matchName: l.matchName.trim(),
        marketName: l.marketName || 'Match Winner',
        selectionId: `manual-sel-${i}`,
        selectionName: l.selectionName,
        odds: parseFloat(l.odds),
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
      if (!res.ok || !data.code) throw new Error(data.error || 'Failed');
      setGeneratedCode(data.code);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Server error');
    } finally {
      setLoading(false);
    }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(generatedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const reset = () => { setLegs([{ ...EMPTY_LEG }]); setGeneratedCode(''); setError(''); };

  return (
    <div style={{ minHeight: '100vh', background: '#F3F4F6', padding: '16px' }}>
      <div style={{ maxWidth: 560, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <button onClick={() => router.push('/admin')} style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 8, color: '#4B5563', cursor: 'pointer', padding: '6px 8px', display: 'flex', alignItems: 'center' }}>
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 style={{ color: '#111827', fontWeight: 900, fontSize: 18, margin: 0 }}>Create Admin Ticket</h1>
            <p style={{ color: '#6B7280', fontSize: 12, margin: 0 }}>Auto-win bets — settles 105min after kickoff</p>
          </div>
        </div>

        {/* Auto-win info */}
        <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: 10, padding: '10px 14px', marginBottom: 18, display: 'flex', gap: 8, alignItems: 'center' }}>
          <Zap size={15} style={{ color: '#059669', flexShrink: 0 }} />
          <p style={{ fontSize: 12, color: '#065F46', margin: 0 }}>
            <strong>Auto-Win:</strong> Users who bet with this code automatically win 105 minutes after the last match kickoff.
          </p>
        </div>

        {/* Match legs */}
        {legs.map((leg, i) => (
          <div key={i} style={{ background: '#fff', borderRadius: 14, border: '1px solid #E5E7EB', padding: '16px', marginBottom: 14, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>

            {/* Leg header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ background: '#059669', color: '#fff', borderRadius: 6, padding: '3px 10px', fontSize: 12, fontWeight: 800 }}>
                  MATCH {i + 1}
                </div>
              </div>
              {legs.length > 1 && (
                <button onClick={() => removeLeg(i)} style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600 }}>
                  <Trash2 size={13} /> Remove
                </button>
              )}
            </div>

            {/* Team pickers */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 12 }}>
              <TeamPicker
                label="🏠 HOME TEAM"
                value={leg.homeLogo}
                teams={savedTeams}
                onChange={t => pickHome(i, t)}
              />
              <TeamPicker
                label="✈️ AWAY TEAM"
                value={leg.awayLogo}
                teams={savedTeams}
                onChange={t => pickAway(i, t)}
              />
            </div>

            {/* Match preview banner */}
            {(leg.homeLogo || leg.awayLogo) && (
              <div style={{ background: 'linear-gradient(135deg, #F0FDF4, #ECFDF5)', border: '1px solid #A7F3D0', borderRadius: 10, padding: '10px 16px', marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                {leg.homeLogo
                  ? <img src={leg.homeLogo} width={32} height={32} alt="" style={{ objectFit: 'contain' }} />
                  : <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#D1FAE5' }} />}
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#059669', fontWeight: 800, letterSpacing: 1 }}>VS</div>
                  <div style={{ fontSize: 12, color: '#065F46', fontWeight: 700, maxWidth: 140, lineHeight: 1.3 }}>{leg.matchName || '? vs ?'}</div>
                </div>
                {leg.awayLogo
                  ? <img src={leg.awayLogo} width={32} height={32} alt="" style={{ objectFit: 'contain' }} />
                  : <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#D1FAE5' }} />}
              </div>
            )}

            {/* Kickoff */}
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 11, color: '#4B5563', fontWeight: 700, display: 'block', marginBottom: 6, letterSpacing: 0.5 }}>⏰ KICKOFF DATE & TIME</label>
              <input
                type="datetime-local"
                value={leg.kickoffAt}
                onChange={e => updateLeg(i, 'kickoffAt', e.target.value)}
                style={{ width: '100%', background: '#fff', border: '1.5px solid #D1D5DB', borderRadius: 10, padding: '10px 12px', color: '#111827', fontSize: 14, outline: 'none', boxSizing: 'border-box', colorScheme: 'light' }}
              />
              {leg.kickoffAt && (
                <p style={{ fontSize: 11, color: '#D97706', marginTop: 4 }}>
                  ⚡ Auto-settles: {new Date(new Date(leg.kickoffAt).getTime() + 105 * 60000).toLocaleString()}
                </p>
              )}
            </div>

            {/* Market + Selection */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
              <div>
                <label style={{ fontSize: 11, color: '#4B5563', fontWeight: 700, display: 'block', marginBottom: 6, letterSpacing: 0.5 }}>MARKET</label>
                <select
                  value={leg.marketName}
                  onChange={e => { updateLeg(i, 'marketName', e.target.value); updateLeg(i, 'selectionName', (SELECTIONS[e.target.value] || [''])[0]); }}
                  style={{ width: '100%', background: '#fff', border: '1.5px solid #D1D5DB', borderRadius: 10, padding: '10px 10px', color: '#111827', fontSize: 12, outline: 'none', boxSizing: 'border-box', fontWeight: 600 }}
                >
                  {MARKETS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, color: '#4B5563', fontWeight: 700, display: 'block', marginBottom: 6, letterSpacing: 0.5 }}>OUTCOME</label>
                <select
                  value={leg.selectionName}
                  onChange={e => updateLeg(i, 'selectionName', e.target.value)}
                  style={{ width: '100%', background: '#fff', border: '1.5px solid #D1D5DB', borderRadius: 10, padding: '10px 10px', color: '#111827', fontSize: 12, outline: 'none', boxSizing: 'border-box', fontWeight: 600 }}
                >
                  {(SELECTIONS[leg.marketName] || [leg.selectionName]).map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>

            {/* Odds */}
            <div>
              <label style={{ fontSize: 11, color: '#4B5563', fontWeight: 700, display: 'block', marginBottom: 6, letterSpacing: 0.5 }}>ODDS</label>
              <input
                type="number" value={leg.odds}
                onChange={e => updateLeg(i, 'odds', e.target.value)}
                min="1.01" step="0.01"
                style={{ width: '100%', background: '#F0FDF4', border: '1.5px solid #A7F3D0', borderRadius: 10, padding: '12px 14px', color: '#047857', fontSize: 20, fontWeight: 900, outline: 'none', boxSizing: 'border-box', textAlign: 'center' }}
              />
            </div>
          </div>
        ))}

        {/* Add match */}
        {legs.length < 3 && (
          <button
            onClick={addLeg}
            style={{ width: '100%', padding: '13px', background: '#fff', border: '1.5px dashed #D1D5DB', borderRadius: 12, color: '#6B7280', fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 14 }}
          >
            <Plus size={16} /> Add Another Match ({legs.length}/3)
          </button>
        )}

        {/* Total Odds */}
        <div style={{ background: '#fff', borderRadius: 10, padding: '14px 18px', marginBottom: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #E5E7EB', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
          <span style={{ color: '#4B5563', fontSize: 14, fontWeight: 700 }}>Total Odds</span>
          <span style={{ color: '#047857', fontSize: 24, fontWeight: 900 }}>{totalOdds.toFixed(2)}x</span>
        </div>

        {/* Error */}
        {error && (
          <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '10px 14px', marginBottom: 14, color: '#DC2626', fontSize: 13, fontWeight: 600 }}>{error}</div>
        )}

        {/* Code or Generate */}
        {generatedCode ? (
          <div style={{ background: '#F0FDF4', borderRadius: 16, border: '1.5px solid #86EFAC', padding: '20px 16px', textAlign: 'center', marginBottom: 12 }}>
            <p style={{ color: '#065F46', fontSize: 11, fontWeight: 800, letterSpacing: 2, margin: '0 0 8px' }}>✅ ADMIN TICKET CODE</p>
            <div style={{ color: '#047857', fontSize: 34, fontWeight: 900, letterSpacing: 8, fontFamily: 'monospace', margin: '0 0 10px' }}>{generatedCode}</div>
            <p style={{ color: '#6B7280', fontSize: 12, margin: '0 0 16px' }}>Share with users — they auto-WIN after match ends.</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={copyCode} style={{ flex: 1, padding: '12px', background: copied ? '#059669' : '#ECFDF5', border: '1.5px solid #A7F3D0', borderRadius: 10, color: copied ? '#fff' : '#059669', fontWeight: 800, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                {copied ? <><Check size={15} /> Copied!</> : <><Copy size={15} /> Copy Code</>}
              </button>
              <button onClick={reset} style={{ flex: 1, padding: '12px', background: '#F3F4F6', border: '1.5px solid #E5E7EB', borderRadius: 10, color: '#374151', fontWeight: 800, fontSize: 14, cursor: 'pointer' }}>
                New Ticket
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={generate} disabled={loading}
            style={{ width: '100%', padding: '16px', background: loading ? '#E5E7EB' : 'linear-gradient(135deg, #059669, #047857)', border: 'none', borderRadius: 14, color: loading ? '#9CA3AF' : '#fff', fontWeight: 900, fontSize: 16, cursor: loading ? 'not-allowed' : 'pointer', boxShadow: loading ? 'none' : '0 6px 24px rgba(5,150,105,0.3)', letterSpacing: 0.5 }}
          >
            {loading ? 'Generating...' : '⚡ Generate Admin Ticket Code'}
          </button>
        )}

        <div style={{ height: 32 }} />
      </div>
    </div>
  );
}
