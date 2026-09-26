'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

type Role = 'USER' | 'WORKER' | 'ADMIN';

type User = {
  id: string;
  phone: string;
  role: Role;
  balance: number;
  is_active: boolean;
  created_at: string;
};

type UserDetail = User & {
  total_deposits: number;
  total_withdrawals: number;
  deposit_count: number;
  withdrawal_count: number;
};

const ROLE_CONFIG: Record<Role, { bg: string; text: string; border: string; avatarBg: string; avatarText: string }> = {
  USER:   { bg: '#EFF6FF', text: '#3B82F6', border: '#BFDBFE', avatarBg: '#EFF6FF', avatarText: '#3B82F6' },
  WORKER: { bg: '#F0FDF4', text: '#16A34A', border: '#BBF7D0', avatarBg: '#F0FDF4', avatarText: '#16A34A' },
  ADMIN:  { bg: '#FEF3C7', text: '#D97706', border: '#FDE68A', avatarBg: '#FEF3C7', avatarText: '#D97706' },
};

const ALL_ROLES: Role[] = ['USER', 'WORKER', 'ADMIN'];

function shortId(id: string) { return id.slice(-6).toUpperCase(); }
function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function AdminUsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [filtered, setFiltered] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState<'ALL' | Role>('ALL');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  // Detail drawer
  const [selectedUser, setSelectedUser] = useState<UserDetail | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);

  // Action states
  const [actionLoading, setActionLoading] = useState(false);
  const [balanceInput, setBalanceInput] = useState('');
  const [balanceMode, setBalanceMode] = useState<'adjust' | 'set'>('adjust');
  const [adjustSign, setAdjustSign] = useState<'+' | '-'>('+');
  const [balanceError, setBalanceError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [editingBalance, setEditingBalance] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/v1/admin/users`);
      if (res.ok) setUsers(await res.json() || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  useEffect(() => {
    let result = users;
    if (search.trim()) {
      const q = search.trim().toUpperCase();
      result = result.filter(u => u.phone.includes(search.trim()) || shortId(u.id).includes(q));
    }
    if (filterRole !== 'ALL') result = result.filter(u => u.role === filterRole);
    if (filterStatus !== 'ALL') result = result.filter(u => filterStatus === 'ACTIVE' ? u.is_active : !u.is_active);
    setFiltered(result);
  }, [search, filterRole, filterStatus, users]);

  const openDetail = async (user: User) => {
    setDrawerOpen(true);
    setDetailLoading(true);
    setSelectedUser(null);
    setBalanceInput('');
    setBalanceError('');
    setSuccessMsg('');
    setEditingBalance(false);
    try {
      const res = await fetch(`${API}/api/v1/admin/users/${user.id}`);
      if (res.ok) setSelectedUser(await res.json());
    } catch (e) { console.error(e); }
    finally { setDetailLoading(false); }
  };

  const closeDrawer = () => { setDrawerOpen(false); setSelectedUser(null); };

  const flash = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const handleToggleStatus = async () => {
    if (!selectedUser) return;
    setActionLoading(true);
    try {
      const res = await fetch(`${API}/api/v1/admin/users/${selectedUser.id}/status`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !selectedUser.is_active }),
      });
      if (res.ok) {
        const updated = { ...selectedUser, is_active: !selectedUser.is_active };
        setSelectedUser(updated);
        setUsers(prev => prev.map(u => u.id === updated.id ? { ...u, is_active: updated.is_active } : u));
        flash(updated.is_active ? '✓ User activated' : '✓ User deactivated');
      }
    } finally { setActionLoading(false); }
  };

  const handleSetRole = async (newRole: Role) => {
    if (!selectedUser || selectedUser.role === newRole) return;
    if (!confirm(`Change role to ${newRole}?`)) return;
    setActionLoading(true);
    try {
      const res = await fetch(`${API}/api/v1/admin/users/${selectedUser.id}/role`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });
      if (res.ok) {
        const updated = { ...selectedUser, role: newRole };
        setSelectedUser(updated);
        setUsers(prev => prev.map(u => u.id === updated.id ? { ...u, role: updated.role } : u));
        flash(`✓ Role changed to ${newRole}`);
      }
    } finally { setActionLoading(false); }
  };

  const handleAdjustBalance = async () => {
    if (!selectedUser || !balanceInput) { setBalanceError('Enter an amount'); return; }
    let amount = parseFloat(balanceInput);
    if (isNaN(amount) || amount < 0) { setBalanceError('Enter a valid positive number'); return; }
    
    if (balanceMode === 'adjust' && adjustSign === '-') {
      amount = -amount;
    }
    
    setBalanceError('');
    setActionLoading(true);
    try {
      const res = await fetch(`${API}/api/v1/admin/users/${selectedUser.id}/balance`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, mode: balanceMode }),
      });
      if (res.ok) {
        const data = await res.json();
        const updated = { ...selectedUser, balance: data.balance };
        setSelectedUser(updated);
        setUsers(prev => prev.map(u => u.id === updated.id ? { ...u, balance: updated.balance } : u));
        setBalanceInput('');
        setEditingBalance(false);
        flash(`✓ Balance updated → ${data.balance.toFixed(2)} Br`);
      } else {
        setBalanceError('Failed to update balance');
      }
    } finally { setActionLoading(false); }
  };

  const activeCount = users.filter(u => u.is_active).length;
  const workerCount = users.filter(u => u.role === 'WORKER').length;
  const totalBalance = users.reduce((s, u) => s + u.balance, 0);

  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC', fontFamily: 'system-ui, -apple-system, sans-serif', paddingBottom: '40px' }}>

      {/* HEADER */}
      <div style={{
        background: '#FFF', borderBottom: '1px solid #E5E7EB', padding: '14px 16px',
        display: 'flex', alignItems: 'center', gap: '12px',
        position: 'sticky', top: 0, zIndex: 50, boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
      }}>
        <button onClick={() => router.push('/admin')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#374151', padding: '4px', lineHeight: 0 }}>
          <svg viewBox="0 0 24 24" style={{ width: '22px', height: '22px' }} fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 18l-6-6 6-6" /></svg>
        </button>
        <div style={{ flex: 1 }}>
          <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 900, color: '#111827' }}>User Management</h1>
          <div style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '1px' }}>{users.length} total users</div>
        </div>
        <button onClick={fetchUsers} style={{ background: '#F1F5F9', border: 'none', borderRadius: '8px', padding: '7px 12px', cursor: 'pointer', color: '#374151', fontSize: '13px', fontWeight: 600 }}>
          ↻ Refresh
        </button>
      </div>

      <div style={{ padding: '16px', maxWidth: '700px', margin: '0 auto' }}>

        {/* STATS */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '8px', marginBottom: '20px' }}>
          {[
            { label: 'Total', value: users.length, color: '#3B82F6', bg: '#EFF6FF' },
            { label: 'Active', value: activeCount, color: '#16A34A', bg: '#F0FDF4' },
            { label: 'Workers', value: workerCount, color: '#16A34A', bg: '#F0FDF4' },
            { label: 'Balance', value: totalBalance.toFixed(0) + ' Br', color: '#D97706', bg: '#FFFBEB', small: true },
          ].map(s => (
            <div key={s.label} style={{ background: '#FFF', border: `1px solid ${s.bg}`, borderRadius: '12px', padding: '10px 8px', textAlign: 'center' }}>
              <div style={{ fontSize: (s as any).small ? '13px' : '20px', fontWeight: 900, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: '10px', color: '#9CA3AF', fontWeight: 600, marginTop: '2px' }}>{s.label.toUpperCase()}</div>
            </div>
          ))}
        </div>

        {/* SEARCH + FILTERS */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
          <div style={{ position: 'relative' }}>
            <svg viewBox="0 0 24 24" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '16px', height: '16px', color: '#9CA3AF' }} fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by phone or ID..."
              style={{ width: '100%', padding: '10px 12px 10px 36px', borderRadius: '10px', border: '1px solid #E5E7EB', fontSize: '14px', color: '#111827', background: '#FFF', outline: 'none', boxSizing: 'border-box' }} />
          </div>

          {/* Role filter */}
          <div style={{ display: 'flex', gap: '6px' }}>
            {(['ALL', 'USER', 'WORKER', 'ADMIN'] as const).map(r => (
              <button key={r} onClick={() => setFilterRole(r)} style={{
                flex: 1, padding: '7px 4px', borderRadius: '8px', fontSize: '12px', fontWeight: 700,
                background: filterRole === r ? '#111827' : '#F1F5F9',
                color: filterRole === r ? '#FFF' : '#6B7280',
                border: 'none', cursor: 'pointer'
              }}>{r}</button>
            ))}
          </div>

          {/* Status filter */}
          <div style={{ display: 'flex', gap: '6px' }}>
            {(['ALL', 'ACTIVE', 'INACTIVE'] as const).map(s => (
              <button key={s} onClick={() => setFilterStatus(s)} style={{
                flex: 1, padding: '7px 4px', borderRadius: '8px', fontSize: '12px', fontWeight: 700,
                background: filterStatus === s ? '#16A34A' : '#F1F5F9',
                color: filterStatus === s ? '#FFF' : '#6B7280',
                border: 'none', cursor: 'pointer'
              }}>{s}</button>
            ))}
          </div>
        </div>

        {/* USER LIST */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#9CA3AF' }}>Loading users...</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px', color: '#9CA3AF', background: '#FFF', borderRadius: '12px', border: '1px dashed #E5E7EB' }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>👥</div>
            <div style={{ fontWeight: 700 }}>No users found</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {filtered.map(user => {
              const rc = ROLE_CONFIG[user.role];
              return (
                <div key={user.id} onClick={() => openDetail(user)} style={{
                  background: '#FFF', borderRadius: '14px', border: '1px solid #E5E7EB',
                  cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                  overflow: 'hidden'
                }}>
                  {/* Top Row */}
                  <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {/* Avatar */}
                    <div style={{
                      width: '44px', height: '44px', borderRadius: '13px', flexShrink: 0,
                      background: rc.avatarBg, border: `1.5px solid ${rc.border}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '17px', fontWeight: 900, color: rc.avatarText
                    }}>
                      {user.phone.slice(0, 1)}
                    </div>

                    {/* Phone + ID */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '15px', fontWeight: 800, color: '#111827' }}>+251 {user.phone}</div>
                      <div style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '2px' }}>ID: {shortId(user.id)} · {formatDate(user.created_at)}</div>
                    </div>

                    {/* Status dot */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: user.is_active ? '#16A34A' : '#DC2626' }} />
                    </div>
                    <svg viewBox="0 0 24 24" style={{ width: '15px', height: '15px', color: '#D1D5DB', flexShrink: 0 }} fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 18l6-6-6-6" /></svg>
                  </div>

                  {/* Bottom bar: balance + role */}
                  <div style={{ borderTop: '1px solid #F3F4F6', display: 'flex', alignItems: 'center', padding: '10px 16px', background: '#FAFAFA' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '11px', color: '#9CA3AF', fontWeight: 600 }}>BALANCE</div>
                      <div style={{ fontSize: '17px', fontWeight: 900, color: '#111827', marginTop: '1px' }}>
                        {user.balance.toFixed(2)} <span style={{ fontSize: '12px', color: '#9CA3AF', fontWeight: 600 }}>Br</span>
                      </div>
                    </div>
                    <span style={{
                      fontSize: '11px', fontWeight: 800, padding: '4px 10px', borderRadius: '8px',
                      background: rc.bg, color: rc.text, border: `1px solid ${rc.border}`
                    }}>{user.role}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* DETAIL BOTTOM SHEET */}
      {drawerOpen && (
        <>
          <div onClick={closeDrawer} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 100 }} />
          <div style={{
            position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 110,
            background: '#FFF', borderTopLeftRadius: '24px', borderTopRightRadius: '24px',
            maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 -8px 30px rgba(0,0,0,0.15)',
            animation: 'slideUp 0.25s ease-out'
          }}>
            <style>{`@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>
            <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 0' }}>
              <div style={{ width: '36px', height: '4px', borderRadius: '2px', background: '#E5E7EB' }} />
            </div>

            {detailLoading || !selectedUser ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#9CA3AF' }}>Loading...</div>
            ) : (
              <div style={{ padding: '16px 20px 48px' }}>

                {/* User Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px' }}>
                  {(() => { const rc = ROLE_CONFIG[selectedUser.role]; return (
                    <div style={{ width: '52px', height: '52px', borderRadius: '15px', flexShrink: 0, background: rc.avatarBg, border: `1.5px solid ${rc.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', fontWeight: 900, color: rc.avatarText }}>
                      {selectedUser.phone.slice(0, 1)}
                    </div>
                  )})()}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '17px', fontWeight: 900, color: '#111827' }}>+251 {selectedUser.phone}</div>
                    <div style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '2px' }}>
                      ID: {shortId(selectedUser.id)} · Joined {formatDate(selectedUser.created_at)}
                    </div>
                  </div>
                  <button onClick={closeDrawer} style={{ background: '#F1F5F9', border: 'none', borderRadius: '20px', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#6B7280' }}>
                    <svg viewBox="0 0 24 24" style={{ width: '16px', height: '16px' }} fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12" /></svg>
                  </button>
                </div>

                {successMsg && (
                  <div style={{ background: '#DCFCE7', border: '1px solid #BBF7D0', borderRadius: '10px', padding: '10px 14px', fontSize: '14px', color: '#16A34A', fontWeight: 700, marginBottom: '16px' }}>
                    {successMsg}
                  </div>
                )}

                {/* ── BALANCE DISPLAY CARD ── */}
                <div style={{ background: 'linear-gradient(135deg, #111827, #1E293B)', borderRadius: '16px', padding: '20px', marginBottom: '12px', position: 'relative', overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '100px', height: '100px', borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
                  <div style={{ fontSize: '12px', color: '#6B7280', fontWeight: 700, letterSpacing: '0.05em', marginBottom: '6px' }}>CURRENT BALANCE</div>
                  <div style={{ fontSize: '36px', fontWeight: 900, color: '#FFF' }}>
                    {selectedUser.balance.toFixed(2)} <span style={{ fontSize: '18px', color: '#F5A623' }}>Br</span>
                  </div>
                </div>

                {/* ── BALANCE EDIT PANEL (white, always visible) ── */}
                <div style={{ background: '#FFF', border: '1.5px solid #E5E7EB', borderRadius: '16px', padding: '16px', marginBottom: '16px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: '#111827', marginBottom: '12px' }}>✏️ Edit Balance</div>

                  {/* Mode selector */}
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                    <button onClick={() => { setBalanceMode('adjust'); setAdjustSign('+'); }} style={{
                      flex: 1, padding: '9px', borderRadius: '8px', fontSize: '13px', fontWeight: 700,
                      background: balanceMode === 'adjust' && adjustSign === '+' ? '#111827' : '#F1F5F9',
                      color: balanceMode === 'adjust' && adjustSign === '+' ? '#FFF' : '#6B7280',
                      border: 'none', cursor: 'pointer'
                    }}>
                      + Add
                    </button>
                    <button onClick={() => { setBalanceMode('adjust'); setAdjustSign('-'); }} style={{
                      flex: 1, padding: '9px', borderRadius: '8px', fontSize: '13px', fontWeight: 700,
                      background: balanceMode === 'adjust' && adjustSign === '-' ? '#111827' : '#F1F5F9',
                      color: balanceMode === 'adjust' && adjustSign === '-' ? '#FFF' : '#6B7280',
                      border: 'none', cursor: 'pointer'
                    }}>
                      − Subtract
                    </button>
                    <button onClick={() => setBalanceMode('set')} style={{
                      flex: 1, padding: '9px', borderRadius: '8px', fontSize: '13px', fontWeight: 700,
                      background: balanceMode === 'set' ? '#111827' : '#F1F5F9',
                      color: balanceMode === 'set' ? '#FFF' : '#6B7280',
                      border: 'none', cursor: 'pointer'
                    }}>
                      = Set Exact
                    </button>
                  </div>

                  <div style={{ fontSize: '12px', color: '#9CA3AF', marginBottom: '10px' }}>
                    {balanceMode === 'adjust' && adjustSign === '+' && 'Amount will be added to current balance.'}
                    {balanceMode === 'adjust' && adjustSign === '-' && 'Amount will be deducted from current balance.'}
                    {balanceMode === 'set' && 'Sets the exact balance to the value you enter below.'}
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="number"
                      value={balanceInput}
                      onChange={e => { setBalanceInput(e.target.value); setBalanceError(''); }}
                      placeholder="e.g. 500"
                      style={{
                        flex: 1, padding: '12px 14px', borderRadius: '10px',
                        border: `1.5px solid ${balanceError ? '#FECACA' : '#D1D5DB'}`,
                        fontSize: '16px', fontWeight: 700, color: '#111827',
                        background: '#FFF', outline: 'none', boxSizing: 'border-box' as const
                      }}
                    />
                    <button
                      disabled={actionLoading || !balanceInput}
                      onClick={handleAdjustBalance}
                      style={{
                        padding: '12px 20px', borderRadius: '10px', fontSize: '14px', fontWeight: 800,
                        background: actionLoading || !balanceInput ? '#E5E7EB' : '#111827',
                        color: actionLoading || !balanceInput ? '#9CA3AF' : '#FFF',
                        border: 'none', cursor: actionLoading || !balanceInput ? 'not-allowed' : 'pointer',
                        whiteSpace: 'nowrap' as const
                      }}>
                      {actionLoading ? '...' : 'Apply'}
                    </button>
                  </div>
                  {balanceError && (
                    <div style={{ fontSize: '12px', color: '#DC2626', marginTop: '8px', fontWeight: 600 }}>{balanceError}</div>
                  )}
                </div>

                {/* Stats row */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
                  {[
                    { label: 'Total Deposited', value: `${selectedUser.total_deposits.toFixed(2)} Br`, color: '#16A34A', bg: '#F0FDF4' },
                    { label: 'Total Withdrawn', value: `${selectedUser.total_withdrawals.toFixed(2)} Br`, color: '#D97706', bg: '#FFFBEB' },
                    { label: 'Deposit Count', value: `${selectedUser.deposit_count} transactions`, color: '#3B82F6', bg: '#EFF6FF' },
                    { label: 'Withdrawal Count', value: `${selectedUser.withdrawal_count} transactions`, color: '#8B5CF6', bg: '#F5F3FF' },
                  ].map(s => (
                    <div key={s.label} style={{ background: s.bg, borderRadius: '12px', padding: '12px', border: '1px solid #E5E7EB' }}>
                      <div style={{ fontSize: '11px', color: '#9CA3AF', fontWeight: 600, marginBottom: '4px' }}>{s.label.toUpperCase()}</div>
                      <div style={{ fontSize: '14px', fontWeight: 900, color: s.color }}>{s.value}</div>
                    </div>
                  ))}
                </div>

                {/* ROLE SELECTOR */}
                <div style={{ background: '#F8FAFC', borderRadius: '14px', padding: '14px', border: '1px solid #E5E7EB', marginBottom: '12px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#374151', marginBottom: '10px' }}>User Role</div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {ALL_ROLES.map(role => {
                      const rc = ROLE_CONFIG[role];
                      const isSelected = selectedUser.role === role;
                      return (
                        <button key={role} disabled={actionLoading} onClick={() => handleSetRole(role)} style={{
                          flex: 1, padding: '10px 6px', borderRadius: '10px', fontSize: '12px', fontWeight: 800,
                          background: isSelected ? rc.bg : '#F1F5F9',
                          color: isSelected ? rc.text : '#9CA3AF',
                          border: `1.5px solid ${isSelected ? rc.border : 'transparent'}`,
                          cursor: actionLoading ? 'not-allowed' : 'pointer',
                          transition: 'all 0.15s'
                        }}>
                          {role}
                          {isSelected && <div style={{ fontSize: '16px', marginTop: '2px' }}>✓</div>}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* STATUS TOGGLE */}
                <div style={{ background: '#F8FAFC', borderRadius: '14px', padding: '14px', border: '1px solid #E5E7EB' }}>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#374151', marginBottom: '10px' }}>Account Status</div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: selectedUser.is_active ? '#16A34A' : '#DC2626' }}>
                        {selectedUser.is_active ? '● Active' : '● Inactive'}
                      </div>
                      <div style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '2px' }}>
                        {selectedUser.is_active ? 'User can log in & transact' : 'Account is blocked'}
                      </div>
                    </div>
                    <button disabled={actionLoading} onClick={handleToggleStatus} style={{
                      padding: '10px 20px', borderRadius: '10px', fontSize: '13px', fontWeight: 700,
                      background: selectedUser.is_active ? '#FEF2F2' : '#DCFCE7',
                      color: selectedUser.is_active ? '#DC2626' : '#16A34A',
                      border: `1px solid ${selectedUser.is_active ? '#FECACA' : '#BBF7D0'}`,
                      cursor: actionLoading ? 'not-allowed' : 'pointer', opacity: actionLoading ? 0.6 : 1
                    }}>
                      {selectedUser.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
