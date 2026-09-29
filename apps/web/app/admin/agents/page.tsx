'use client';

import React, { useEffect, useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

type AgentUser = {
  id: string;
  phone: string;
  role: string;
};

export default function AgentsPage() {
  const [agents, setAgents] = useState<AgentUser[]>([]);
  const [loading, setLoading] = useState(true);

  const [phone, setPhone] = useState('');
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState('');
  const [addSuccess, setAddSuccess] = useState('');

  const [removingId, setRemovingId] = useState<string | null>(null);

  useEffect(() => { fetchAgents(); }, []);

  const fetchAgents = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/v1/admin/users`);
      if (res.ok) {
        const data: AgentUser[] = await res.json();
        setAgents(data.filter(u => u.role === 'AGENT'));
      }
    } finally {
      setLoading(false);
    }
  };

  const addAgent = async () => {
    if (!phone.trim()) return;
    setAdding(true);
    setAddError('');
    setAddSuccess('');
    try {
      const res = await fetch(`${API}/api/v1/admin/users/assign-role`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phone.trim(), role: 'AGENT' }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAddError(data || 'User not found. Check the phone number.');
        return;
      }
      setAddSuccess('Agent assigned successfully!');
      setPhone('');
      await fetchAgents();
    } catch {
      setAddError('Network error. Please try again.');
    } finally {
      setAdding(false);
    }
  };

  const removeAgent = async (agent: AgentUser) => {
    if (!confirm(`Remove agent role from ${agent.phone}?`)) return;
    setRemovingId(agent.id);
    try {
      const res = await fetch(`${API}/api/v1/admin/users/assign-role`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: agent.phone, role: 'USER' }),
      });
      if (res.ok) await fetchAgents();
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Header */}
      <div style={{
        background: '#fff', borderBottom: '1px solid #E5E7EB',
        padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px',
        position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 1px 4px rgba(0,0,0,0.06)'
      }}>
        <button onClick={() => window.history.back()} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex' }}>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#374151" strokeWidth="2.5"><polyline points="15 18 9 12 15 6" /></svg>
        </button>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 800, color: '#111827', margin: 0, lineHeight: 1 }}>Agents</h1>
          <p style={{ fontSize: 11, color: '#9CA3AF', margin: '3px 0 0' }}>Assign POS cashier access to users</p>
        </div>
      </div>

      <div style={{ padding: '20px 16px', maxWidth: 560, margin: '0 auto' }}>

        {/* Add by Phone */}
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #E5E7EB', padding: 20, marginBottom: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <div style={{ background: '#F3E8FF', borderRadius: 10, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🏪</div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 14, color: '#111827' }}>Add New Agent</div>
              <div style={{ fontSize: 11, color: '#9CA3AF' }}>Enter the user's phone number</div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <input
              value={phone}
              onChange={e => { setPhone(e.target.value); setAddError(''); setAddSuccess(''); }}
              onKeyDown={e => e.key === 'Enter' && addAgent()}
              placeholder="e.g. 912345678"
              inputMode="tel"
              style={{
                flex: 1, padding: '12px 14px', border: `1.5px solid ${addError ? '#FCA5A5' : '#D1D5DB'}`,
                borderRadius: 10, fontSize: 15, fontWeight: 600, outline: 'none',
                background: '#FAFAFA',
              }}
            />
            <button
              onClick={addAgent}
              disabled={adding || !phone.trim()}
              style={{
                background: adding ? '#E5E7EB' : '#9333EA',
                color: adding ? '#9CA3AF' : '#fff',
                border: 'none', borderRadius: 10, padding: '0 20px',
                fontWeight: 800, fontSize: 14, cursor: (adding || !phone.trim()) ? 'not-allowed' : 'pointer',
                minWidth: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}
            >
              {adding ? (
                <>
                  <svg style={{ animation: 'spin 1s linear infinite', width: 16, height: 16 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                  </svg>
                  Wait...
                </>
              ) : 'Assign'}
            </button>
          </div>

          {addError && (
            <div style={{ marginTop: 10, padding: '10px 12px', background: '#FEF2F2', borderRadius: 8, border: '1px solid #FECACA', color: '#DC2626', fontSize: 13, fontWeight: 600 }}>
              ❌ {addError}
            </div>
          )}
          {addSuccess && (
            <div style={{ marginTop: 10, padding: '10px 12px', background: '#F0FDF4', borderRadius: 8, border: '1px solid #A7F3D0', color: '#059669', fontSize: 13, fontWeight: 600 }}>
              ✅ {addSuccess}
            </div>
          )}
        </div>

        {/* Agent List */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ fontSize: 14, fontWeight: 800, color: '#111827', margin: 0 }}>
              Active Agents {!loading && <span style={{ color: '#9333EA' }}>({agents.length})</span>}
            </h3>
            <button onClick={fetchAgents} style={{ background: 'none', border: '1px solid #E5E7EB', borderRadius: 8, padding: '5px 10px', fontSize: 12, color: '#6B7280', cursor: 'pointer', fontWeight: 600 }}>
              ↻ Refresh
            </button>
          </div>

          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[1, 2, 3].map(i => (
                <div key={i} style={{ height: 70, background: '#F3F4F6', borderRadius: 12, animation: 'pulse 1.5s ease-in-out infinite' }} />
              ))}
            </div>
          ) : agents.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '50px 20px', background: '#fff', borderRadius: 14, border: '1.5px dashed #D1D5DB' }}>
              <div style={{ fontSize: 40, marginBottom: 10 }}>🏪</div>
              <p style={{ color: '#374151', fontWeight: 700, fontSize: 15, margin: '0 0 4px' }}>No agents yet</p>
              <p style={{ color: '#9CA3AF', fontSize: 13, margin: 0 }}>Enter a phone number above to assign an agent</p>
            </div>
          ) : (
            agents.map(agent => (
              <div key={agent.id} style={{
                background: '#fff', padding: '14px 16px', borderRadius: 12,
                border: '1px solid #E5E7EB', marginBottom: 10,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ background: '#F3E8FF', borderRadius: 10, width: 42, height: 42, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: '#9333EA', fontSize: 14 }}>
                    {agent.phone.slice(-2).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 15, color: '#111827' }}>{agent.phone}</div>
                    <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 1 }}>
                      <span style={{ background: '#F3E8FF', color: '#9333EA', padding: '1px 7px', borderRadius: 999, fontWeight: 700, fontSize: 10 }}>AGENT</span>
                      <span style={{ marginLeft: 6, fontFamily: 'monospace' }}>{agent.id.slice(-6).toUpperCase()}</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => removeAgent(agent)}
                  disabled={removingId === agent.id}
                  style={{
                    background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA',
                    padding: '7px 14px', borderRadius: 8, fontWeight: 700, fontSize: 12,
                    cursor: removingId === agent.id ? 'not-allowed' : 'pointer',
                    opacity: removingId === agent.id ? 0.6 : 1,
                  }}
                >
                  {removingId === agent.id ? '...' : 'Remove'}
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
      ` }} />
    </div>
  );
}
