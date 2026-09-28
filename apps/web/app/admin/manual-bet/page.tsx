'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Trash2, Copy, Check, Zap } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://api.miraclbet.com:8443';

type Leg = {
  matchName: string;
  homeLogo: string;
  awayLogo: string;
  marketName: string;
  selectionName: string;
  odds: string;
  kickoffAt: string;
};

const EMPTY_LEG: Leg = {
  matchName: '', homeLogo: '', awayLogo: '',
  marketName: 'Match Winner', selectionName: 'Home Win',
  odds: '1.90', kickoffAt: '',
};

export default function AdminManualBetPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [legs, setLegs] = useState<Leg[]>([{ ...EMPTY_LEG }]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem('miraclbet_user');
    if (!saved) { router.push('/login'); return; }
    const u = JSON.parse(saved);
    if (u.role !== 'ADMIN') { router.push('/'); }
  }, [router]);

  if (!mounted) return null;

  const updateLeg = (i: number, field: keyof Leg, value: string) => {
    setLegs(prev => prev.map((l, idx) => idx === i ? { ...l, [field]: value } : l));
  };

  const addLeg = () => {
    if (legs.length >= 3) return;
    setLegs(prev => [...prev, { ...EMPTY_LEG }]);
  };

  const removeLeg = (i: number) => {
    if (legs.length <= 1) return;
    setLegs(prev => prev.filter((_, idx) => idx !== i));
  };

  const totalOdds = legs.reduce((acc, l) => acc * (parseFloat(l.odds) || 1), 1);

  const generate = async () => {
    setError('');
    for (let i = 0; i < legs.length; i++) {
      const l = legs[i];
      if (!l.matchName.trim()) { setError(`Match ${i+1}: Enter match name`); return; }
      if (!l.selectionName.trim()) { setError(`Match ${i+1}: Enter selection`); return; }
      if (!parseFloat(l.odds) || parseFloat(l.odds) <= 1) { setError(`Match ${i+1}: Odds must be > 1.00`); return; }
      if (!l.kickoffAt) { setError(`Match ${i+1}: Set kickoff time`); return; }
    }

    setLoading(true);
    try {
      const selections = legs.map((l, i) => ({
        fixtureId: `manual-${Date.now()}-${i}`,
        matchName: l.matchName.trim(),
        marketName: l.marketName.trim() || 'Match Winner',
        selectionId: `manual-sel-${i}`,
        selectionName: l.selectionName.trim(),
        odds: parseFloat(l.odds),
        homeLogo: l.homeLogo.trim(),
        awayLogo: l.awayLogo.trim(),
        kickoffAt: new Date(l.kickoffAt).toISOString(),
      }));

      const res = await fetch(`${API}/api/v1/admin/bets/manual`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selections, total_odds: totalOdds }),
      });
      const data = await res.json();
      if (!res.ok || !data.code) throw new Error(data.error || 'Failed to generate code');
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

  const reset = () => {
    setLegs([{ ...EMPTY_LEG }]);
    setGeneratedCode('');
    setError('');
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

  return (
    <div style={{ minHeight: '100vh', background: '#0A0E1A', padding: '20px 16px' }}>
      <div style={{ maxWidth: 540, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <button onClick={() => router.push('/admin')} style={{ background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer', padding: 0 }}>
            <ArrowLeft size={22} />
          </button>
          <div>
            <h1 style={{ color: '#fff', fontWeight: 900, fontSize: 20, margin: 0 }}>Create Admin Ticket</h1>
            <p style={{ color: '#9CA3AF', fontSize: 12, margin: 0 }}>All bets on this code win automatically when matches finish</p>
          </div>
        </div>

        <div style={{ background: 'rgba(25,230,107,0.08)', border: '1px solid rgba(25,230,107,0.3)', borderRadius: 10, padding: '10px 14px', marginBottom: 20, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
          <Zap size={16} style={{ color: '#19E66B', flexShrink: 0, marginTop: 2 }} />
          <div style={{ fontSize: 12, color: '#9CA3AF' }}>
            <span style={{ color: '#19E66B', fontWeight: 700 }}>Auto-Win Ticket: </span>
            When a user places a bet using this code, the system automatically marks it as <strong style={{ color: '#fff' }}>WON</strong> 105 minutes after the last kickoff time and credits their balance.
          </div>
        </div>

        {legs.map((leg, i) => (
          <div key={i} style={{ background: '#111827', borderRadius: 14, border: '1px solid #1E293B', padding: 16, marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ color: '#19E66B', fontWeight: 800, fontSize: 13 }}>MATCH {i + 1}</span>
              {legs.length > 1 && (
                <button onClick={() => removeLeg(i)} style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', cursor: 'pointer', padding: '4px 8px', borderRadius: 6, fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Trash2 size={12} /> Remove
                </button>
              )}
            </div>

            <div style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 700, display: 'block', marginBottom: 4 }}>MATCH NAME (Home vs Away)</label>
              <input
                value={leg.matchName}
                onChange={e => updateLeg(i, 'matchName', e.target.value)}
                placeholder="e.g. Arsenal vs Chelsea"
                style={{ width: '100%', background: '#0A0E1A', border: '1px solid #1E293B', borderRadius: 8, padding: '9px 12px', color: '#fff', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
              <div>
                <label style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 700, display: 'block', marginBottom: 4 }}>HOME LOGO URL (optional)</label>
                <input
                  value={leg.homeLogo}
                  onChange={e => updateLeg(i, 'homeLogo', e.target.value)}
                  placeholder="https://..."
                  style={{ width: '100%', background: '#0A0E1A', border: '1px solid #1E293B', borderRadius: 8, padding: '9px 12px', color: '#fff', fontSize: 11, outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 700, display: 'block', marginBottom: 4 }}>AWAY LOGO URL (optional)</label>
                <input
                  value={leg.awayLogo}
                  onChange={e => updateLeg(i, 'awayLogo', e.target.value)}
                  placeholder="https://..."
                  style={{ width: '100%', background: '#0A0E1A', border: '1px solid #1E293B', borderRadius: 8, padding: '9px 12px', color: '#fff', fontSize: 11, outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            <div style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 700, display: 'block', marginBottom: 4 }}>KICKOFF DATE & TIME</label>
              <input
                type="datetime-local"
                value={leg.kickoffAt}
                onChange={e => updateLeg(i, 'kickoffAt', e.target.value)}
                style={{ width: '100%', background: '#0A0E1A', border: '1px solid #1E293B', borderRadius: 8, padding: '9px 12px', color: '#fff', fontSize: 13, outline: 'none', boxSizing: 'border-box', colorScheme: 'dark' }}
              />
              {leg.kickoffAt && (
                <p style={{ fontSize: 11, color: '#F5A623', marginTop: 4, margin: '4px 0 0' }}>
                  ⏱ Auto-settles: {new Date(new Date(leg.kickoffAt).getTime() + 105 * 60000).toLocaleString()}
                </p>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
              <div>
                <label style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 700, display: 'block', marginBottom: 4 }}>MARKET</label>
                <select
                  value={leg.marketName}
                  onChange={e => { updateLeg(i, 'marketName', e.target.value); updateLeg(i, 'selectionName', (SELECTIONS[e.target.value] || [''])[0]); }}
                  style={{ width: '100%', background: '#0A0E1A', border: '1px solid #1E293B', borderRadius: 8, padding: '9px 12px', color: '#fff', fontSize: 12, outline: 'none', boxSizing: 'border-box' }}
                >
                  {MARKETS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 700, display: 'block', marginBottom: 4 }}>SELECTION (WINNER)</label>
                <select
                  value={leg.selectionName}
                  onChange={e => updateLeg(i, 'selectionName', e.target.value)}
                  style={{ width: '100%', background: '#0A0E1A', border: '1px solid #1E293B', borderRadius: 8, padding: '9px 12px', color: '#fff', fontSize: 12, outline: 'none', boxSizing: 'border-box' }}
                >
                  {(SELECTIONS[leg.marketName] || [leg.selectionName]).map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 700, display: 'block', marginBottom: 4 }}>ODDS</label>
              <input
                type="number"
                value={leg.odds}
                onChange={e => updateLeg(i, 'odds', e.target.value)}
                min="1.01" step="0.01"
                style={{ width: '100%', background: '#0A0E1A', border: '1px solid #1E293B', borderRadius: 8, padding: '9px 12px', color: '#19E66B', fontSize: 16, fontWeight: 800, outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
          </div>
        ))}

        {legs.length < 3 && (
          <button
            onClick={addLeg}
            style={{ width: '100%', padding: '11px', background: 'transparent', border: '1px dashed #374151', borderRadius: 10, color: '#6B7280', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 16 }}
          >
            <Plus size={15} /> Add Another Match ({legs.length}/3)
          </button>
        )}

        <div style={{ background: '#111827', borderRadius: 10, padding: '12px 16px', marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #1E293B' }}>
          <span style={{ color: '#9CA3AF', fontSize: 13, fontWeight: 600 }}>Total Odds</span>
          <span style={{ color: '#19E66B', fontSize: 20, fontWeight: 900 }}>{totalOdds.toFixed(2)}</span>
        </div>

        {error && (
          <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '10px 14px', marginBottom: 14, color: '#f87171', fontSize: 13 }}>{error}</div>
        )}

        {generatedCode ? (
          <div style={{ background: 'linear-gradient(135deg, #0D2219, #092016)', borderRadius: 14, border: '1px solid #19E66B55', padding: 20, textAlign: 'center', marginBottom: 12 }}>
            <p style={{ color: '#9CA3AF', fontSize: 11, fontWeight: 700, letterSpacing: 2, marginBottom: 8 }}>✅ ADMIN TICKET CODE</p>
            <div style={{ color: '#19E66B', fontSize: 32, fontWeight: 900, letterSpacing: 8, fontFamily: 'monospace', marginBottom: 12 }}>{generatedCode}</div>
            <p style={{ color: '#6B7280', fontSize: 11, marginBottom: 16 }}>Share this code with users. When they place a bet using it, they will automatically WIN after the match ends.</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={copyCode} style={{ flex: 1, padding: '11px', background: copied ? '#19E66B' : 'rgba(25,230,107,0.15)', border: '1px solid rgba(25,230,107,0.4)', borderRadius: 8, color: copied ? '#000' : '#19E66B', fontWeight: 800, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                {copied ? <><Check size={14} /> Copied!</> : <><Copy size={14} /> Copy Code</>}
              </button>
              <button onClick={reset} style={{ flex: 1, padding: '11px', background: '#1E293B', border: '1px solid #374151', borderRadius: 8, color: '#fff', fontWeight: 800, fontSize: 13, cursor: 'pointer' }}>
                New Ticket
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={generate}
            disabled={loading}
            style={{ width: '100%', padding: 16, background: loading ? '#1E293B' : 'linear-gradient(135deg, #19E66B, #0D8A3C)', border: 'none', borderRadius: 12, color: loading ? '#9CA3AF' : '#000', fontWeight: 900, fontSize: 16, cursor: loading ? 'not-allowed' : 'pointer', boxShadow: loading ? 'none' : '0 4px 20px rgba(25,230,107,0.3)' }}
          >
            {loading ? 'Generating...' : '⚡ Generate Admin Ticket Code'}
          </button>
        )}
      </div>
    </div>
  );
}
