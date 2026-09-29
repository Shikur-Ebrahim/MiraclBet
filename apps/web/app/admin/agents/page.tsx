'use client';

import React, { useEffect, useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

type Role = 'USER' | 'WORKER' | 'AGENT' | 'ADMIN';

type AgentUser = {
  id: string;
  phone: string;
  role: Role;
};

export default function AgentsPage() {
  const [users, setUsers] = useState<AgentUser[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [addPhone, setAddPhone] = useState('');
  const [addError, setAddError] = useState('');

  useEffect(() => { fetchUsers(); }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/v1/admin/users`);
      if (res.ok) {
        const data = await res.json();
        setUsers(data.filter((u: AgentUser) => u.role === 'AGENT'));
      }
    } finally {
      setLoading(false);
    }
  };

  const makeAgent = async () => {
    setAddError('');
    if (!addPhone) return;
    try {
      // Find user by phone to get ID. We need all users first.
      const res = await fetch(`${API}/api/v1/admin/users`);
      if (!res.ok) return;
      const allUsers = await res.json();
      const targetUser = allUsers.find((u: any) => u.phone === addPhone);
      
      if (!targetUser) {
        setAddError('User not found with this phone number.');
        return;
      }
      
      const roleRes = await fetch(`${API}/api/v1/admin/users/${targetUser.id}/role`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'AGENT' }),
      });
      
      if (roleRes.ok) {
        setAddPhone('');
        fetchUsers();
      }
    } catch (e) {
      setAddError('Failed to add agent');
    }
  };

  const removeAgent = async (id: string) => {
    if (!confirm('Remove agent role? They will become a normal user.')) return;
    try {
      const res = await fetch(`${API}/api/v1/admin/users/${id}/role`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'USER' }),
      });
      if (res.ok) fetchUsers();
    } catch (e) { console.error(e); }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC', paddingBottom: '32px' }}>
      {/* Sticky Header */}
      <div style={{
        background: '#FFFFFF', borderBottom: '1px solid #E5E7EB',
        padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px',
        position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 1px 4px rgba(0,0,0,0.06)'
      }}>
        <div onClick={() => window.history.back()} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px' }}>
          <svg viewBox="0 0 24 24" style={{ width: 18, height: 18, color: '#6B7280' }} fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </div>
        <div>
          <h1 style={{ fontSize: '18px', fontWeight: 800, color: '#111827', margin: 0, lineHeight: 1 }}>Agent Roles</h1>
          <p style={{ fontSize: '11px', color: '#9CA3AF', margin: '4px 0 0' }}>Manage POS cashiers</p>
        </div>
      </div>

      <div style={{ padding: '20px 16px', maxWidth: '600px', margin: '0 auto' }}>
        
        {/* Add Agent Section */}
        <div style={{ background: '#FFF', padding: 16, borderRadius: 12, border: '1px solid #E5E7EB', marginBottom: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 800, color: '#111827', margin: '0 0 12px' }}>Add New Agent</h3>
          <div style={{ display: 'flex', gap: 8 }}>
            <input 
              value={addPhone} onChange={e => setAddPhone(e.target.value)} 
              placeholder="User Phone Number" 
              style={{ flex: 1, padding: '10px 12px', border: '1px solid #D1D5DB', borderRadius: 8, fontSize: 14, outline: 'none' }}
            />
            <button onClick={makeAgent} style={{ background: '#9333EA', color: '#fff', border: 'none', borderRadius: 8, padding: '0 16px', fontWeight: 700, cursor: 'pointer' }}>
              Add
            </button>
          </div>
          {addError && <p style={{ color: '#EF4444', fontSize: 12, margin: '8px 0 0' }}>{addError}</p>}
        </div>

        {/* Agent List */}
        <div>
          <h3 style={{ fontSize: 14, fontWeight: 800, color: '#111827', margin: '0 0 12px' }}>Current Agents</h3>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 20, color: '#9CA3AF' }}>Loading...</div>
          ) : users.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, background: '#fff', borderRadius: 12, border: '1px dashed #D1D5DB', color: '#6B7280' }}>
              No agents assigned
            </div>
          ) : (
            users.map(u => (
              <div key={u.id} style={{ background: '#fff', padding: 16, borderRadius: 12, border: '1px solid #E5E7EB', marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 15, color: '#111827' }}>{u.phone}</div>
                  <div style={{ fontSize: 11, color: '#9CA3AF', fontFamily: 'monospace' }}>ID: {u.id.slice(0, 8)}</div>
                </div>
                <button onClick={() => removeAgent(u.id)} style={{ background: '#FEF2F2', color: '#EF4444', border: 'none', padding: '6px 12px', borderRadius: 6, fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
                  Remove
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
