'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Search, Save, Check } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://api.miraclbet.com:8443';

export default function AdminTeamsPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [savedTeams, setSavedTeams] = useState<any[]>([]);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem('miraclbet_user');
    if (!saved) { router.push('/login'); return; }
    const u = JSON.parse(saved);
    if (u.role !== 'ADMIN') { router.push('/'); }
    loadSaved();
  }, [router]);

  const loadSaved = async () => {
    try {
      const res = await fetch(`${API}/api/v1/admin/teams`);
      const data = await res.json();
      setSavedTeams(data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!search.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/v1/admin/teams/api-search?search=` + encodeURIComponent(search));
      const data = await res.json();
      setResults(data.response || []);
    } catch (e) {
      alert('Search failed');
    } finally {
      setLoading(false);
    }
  };

  const saveTeam = async (team: any) => {
    try {
      const payload = {
        api_id: team.team.id,
        name: team.team.name,
        logo: team.team.logo,
        country: team.team.country,
        country_flag: team.team.logo, // api-sports doesn't always give flag here, fallback to logo or empty
      };
      const res = await fetch(`${API}/api/v1/admin/teams`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        loadSaved();
      } else {
        alert('Failed to save team');
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (!mounted) return null;

  return (
    <div style={{ minHeight: '100vh', background: '#0A0E1A', padding: '20px 16px' }}>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <button onClick={() => router.push('/admin')} style={{ background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer', padding: 0 }}>
            <ArrowLeft size={22} />
          </button>
          <div>
            <h1 style={{ color: '#fff', fontWeight: 900, fontSize: 20, margin: 0 }}>Saved Teams Database</h1>
            <p style={{ color: '#9CA3AF', fontSize: 12, margin: 0 }}>Search Football API and save teams for Manual Bets</p>
          </div>
        </div>

        {/* Search */}
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search team name (e.g., Manchester)..."
            style={{ flex: 1, background: '#111827', border: '1px solid #1E293B', borderRadius: 8, padding: '10px 14px', color: '#fff', fontSize: 14, outline: 'none' }}
          />
          <button type="submit" disabled={loading} style={{ background: '#3B82F6', border: 'none', borderRadius: 8, padding: '0 20px', color: '#fff', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Search size={16} /> {loading ? '...' : 'Search API'}
          </button>
        </form>

        {/* API Results */}
        {results.length > 0 && (
          <div style={{ background: '#111827', borderRadius: 12, padding: 16, marginBottom: 30, border: '1px solid #1E293B' }}>
            <h2 style={{ color: '#fff', fontSize: 14, fontWeight: 800, marginBottom: 12 }}>API Results</h2>
            <div style={{ display: 'grid', gap: 10 }}>
              {results.slice(0, 10).map((r: any) => {
                const isSaved = savedTeams.some(s => s.api_id === r.team.id);
                return (
                  <div key={r.team.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#0A0E1A', padding: '10px 14px', borderRadius: 8, border: '1px solid #1E293B' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <img src={r.team.logo} alt="" style={{ width: 30, height: 30, objectFit: 'contain' }} />
                      <div>
                        <div style={{ color: '#fff', fontSize: 14, fontWeight: 700 }}>{r.team.name}</div>
                        <div style={{ color: '#9CA3AF', fontSize: 11 }}>{r.team.country}</div>
                      </div>
                    </div>
                    {isSaved ? (
                      <div style={{ color: '#10B981', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Check size={14} /> Saved
                      </div>
                    ) : (
                      <button onClick={() => saveTeam(r)} style={{ background: '#10B981', border: 'none', borderRadius: 6, padding: '6px 12px', color: '#000', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Save size={14} /> Save
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Saved Teams List */}
        <h2 style={{ color: '#fff', fontSize: 16, fontWeight: 800, marginBottom: 12 }}>Currently Saved Teams ({savedTeams.length})</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
          {savedTeams.map(t => (
            <div key={t.api_id} style={{ background: '#111827', padding: 12, borderRadius: 8, border: '1px solid #1E293B', display: 'flex', alignItems: 'center', gap: 10 }}>
              <img src={t.logo} alt="" style={{ width: 30, height: 30, objectFit: 'contain' }} />
              <div>
                <div style={{ color: '#fff', fontSize: 13, fontWeight: 700 }}>{t.name}</div>
                <div style={{ color: '#9CA3AF', fontSize: 11 }}>{t.country}</div>
              </div>
            </div>
          ))}
          {savedTeams.length === 0 && <div style={{ color: '#9CA3AF', fontSize: 13 }}>No teams saved yet.</div>}
        </div>

      </div>
    </div>
  );
}
