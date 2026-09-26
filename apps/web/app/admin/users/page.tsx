'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

type User = {
  id: string;
  phone: string;
  role: 'USER' | 'ADMIN';
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

function shortId(id: string) {
  return id.slice(-6).toUpperCase();
}

function formatPhone(phone: string) {
  return '+251 ' + phone;
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function AdminUsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [filtered, setFiltered] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState<'ALL' | 'USER' | 'ADMIN'>('ALL');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  // Detail drawer
  const [selectedUser, setSelectedUser] = useState<UserDetail | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);

  // Action states
  const [actionLoading, setActionLoading] = useState(false);
  const [balanceInput, setBalanceInput] = useState('');
  const [balanceMode, setBalanceMode] = useState<'adjust' | 'set'>('adjust');
  const [balanceError, setBalanceError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/v1/admin/users`);
      if (res.ok) {
        const data = await res.json();
        setUsers(data || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  // Filtering
  useEffect(() => {
    let result = users;
    if (search.trim()) {
      result = result.filter(u => u.phone.includes(search.trim()) || shortId(u.id).includes(search.trim().toUpperCase()));
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
    try {
      const res = await fetch(`${API}/api/v1/admin/users/${user.id}`);
      if (res.ok) setSelectedUser(await res.json());
    } catch (e) { console.error(e); }
    finally { setDetailLoading(false); }
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setSelectedUser(null);
  };

  const flash = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const handleToggleStatus = async () => {
    if (!selectedUser) return;
    setActionLoading(true);
    try {
      const res = await fetch(`${API}/api/v1/admin/users/${selectedUser.id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !selectedUser.is_active }),
      });
      if (res.ok) {
        const updated = { ...selectedUser, is_active: !selectedUser.is_active };
        setSelectedUser(updated);
        setUsers(prev => prev.map(u => u.id === updated.id ? { ...u, is_active: updated.is_active } : u));
        flash(updated.is_active ? 'User activated ✓' : 'User deactivated ✓');
      }
    } catch (e) { console.error(e); }
    finally { setActionLoading(false); }
  };

  const handleToggleRole = async () => {
    if (!selectedUser) return;
    const newRole = selectedUser.role === 'ADMIN' ? 'USER' : 'ADMIN';
    if (!confirm(`Change role to ${newRole}?`)) return;
    setActionLoading(true);
    try {
      const res = await fetch(`${API}/api/v1/admin/users/${selectedUser.id}/role`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });
      if (res.ok) {
        const updated = { ...selectedUser, role: newRole as 'USER' | 'ADMIN' };
        setSelectedUser(updated);
        setUsers(prev => prev.map(u => u.id === updated.id ? { ...u, role: updated.role } : u));
        flash(`Role changed to ${newRole} ✓`);
      }
    } catch (e) { console.error(e); }
    finally { setActionLoading(false); }
  };

  const handleAdjustBalance = async () => {
    if (!selectedUser || !balanceInput) { setBalanceError('Enter an amount'); return; }
    const amount = parseFloat(balanceInput);
    if (isNaN(amount)) { setBalanceError('Invalid number'); return; }
    setBalanceError('');
    setActionLoading(true);
    try {
      const res = await fetch(`${API}/api/v1/admin/users/${selectedUser.id}/balance`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, mode: balanceMode }),
      });
      if (res.ok) {
        const data = await res.json();
        const updated = { ...selectedUser, balance: data.balance };
        setSelectedUser(updated);
        setUsers(prev => prev.map(u => u.id === updated.id ? { ...u, balance: updated.balance } : u));
        setBalanceInput('');
        flash(`Balance updated → ${data.balance.toFixed(2)} Br ✓`);
      } else {
        setBalanceError('Failed to update balance');
      }
    } catch (e) { console.error(e); }
    finally { setActionLoading(false); }
  };

  const activeCount = users.filter(u => u.is_active).length;
  const adminCount = users.filter(u => u.role === 'ADMIN').length;
  const totalBalance = users.reduce((s, u) => s + u.balance, 0);

  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC', fontFamily: 'system-ui, -apple-system, sans-serif', paddingBottom: '40px' }}>

      {/* ── HEADER ── */}
      <div style={{
        background: '#FFF', borderBottom: '1px solid #E5E7EB',
        padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px',
        position: 'sticky', top: 0, zIndex: 50,
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
      }}>
        <button onClick={() => router.push('/admin')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#374151', padding: '4px', lineHeight: 0 }}>
          <svg viewBox="0 0 24 24" style={{ width: '22px', height: '22px' }} fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <div>
          <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 900, color: '#111827' }}>User Management</h1>
          <div style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '1px' }}>{users.length} total users</div>
        </div>
        <button
          onClick={fetchUsers}
          style={{ marginLeft: 'auto', background: '#F1F5F9', border: 'none', borderRadius: '8px', padding: '7px 12px', cursor: 'pointer', color: '#374151', fontSize: '13px', fontWeight: 600 }}>
          Refresh
        </button>
      </div>

      <div style={{ padding: '16px', maxWidth: '700px', margin: '0 auto' }}>

        {/* ── STATS ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '20px' }}>
          {[
            { label: 'Total Users', value: users.length, color: '#3B82F6', bg: '#EFF6FF' },
            { label: 'Active',       value: activeCount, color: '#16A34A', bg: '#DCFCE7' },
            { label: 'Platform Bal', value: totalBalance.toFixed(0) + ' Br', color: '#F5A623', bg: '#FFFBEB', small: true },
          ].map(s => (
            <div key={s.label} style={{ background: '#FFF', border: `1px solid ${s.bg}`, borderRadius: '12px', padding: '12px', textAlign: 'center' }}>
              <div style={{ fontSize: s.small ? '14px' : '22px', fontWeight: 900, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: '11px', color: '#9CA3AF', fontWeight: 600, marginTop: '2px' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* ── SEARCH + FILTERS ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
          <div style={{ position: 'relative' }}>
            <svg viewBox="0 0 24 24" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '16px', height: '16px', color: '#9CA3AF' }} fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
            </svg>
            <input
              type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by phone or user ID..."
              style={{ width: '100%', padding: '10px 12px 10px 36px', borderRadius: '10px', border: '1px solid #E5E7EB', fontSize: '14px', color: '#111827', background: '#FFF', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {(['ALL', 'USER', 'ADMIN'] as const).map(r => (
              <button key={r} onClick={() => setFilterRole(r)} style={{
                flex: 1, padding: '7px 4px', borderRadius: '8px', fontSize: '12px', fontWeight: 700,
                background: filterRole === r ? '#3B82F6' : '#F1F5F9', color: filterRole === r ? '#FFF' : '#6B7280',
                border: 'none', cursor: 'pointer'
              }}>{r}</button>
            ))}
            <div style={{ width: '1px', background: '#E5E7EB', margin: '0 2px' }} />
            {(['ALL', 'ACTIVE', 'INACTIVE'] as const).map(s => (
              <button key={s} onClick={() => setFilterStatus(s)} style={{
                flex: 1, padding: '7px 4px', borderRadius: '8px', fontSize: '12px', fontWeight: 700,
                background: filterStatus === s ? '#16A34A' : '#F1F5F9', color: filterStatus === s ? '#FFF' : '#6B7280',
                border: 'none', cursor: 'pointer'
              }}>{s}</button>
            ))}
          </div>
        </div>

        {/* ── USER LIST ── */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#9CA3AF' }}>Loading users...</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px', color: '#9CA3AF', background: '#FFF', borderRadius: '12px', border: '1px dashed #E5E7EB' }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>👥</div>
            <div style={{ fontWeight: 700 }}>No users found</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {filtered.map(user => (
              <div
                key={user.id}
                onClick={() => openDetail(user)}
                style={{
                  background: '#FFF', borderRadius: '14px', border: '1px solid #E5E7EB',
                  padding: '14px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '14px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)', transition: 'box-shadow 0.2s',
                }}
              >
                {/* Avatar */}
                <div style={{
                  width: '46px', height: '46px', borderRadius: '14px', flexShrink: 0,
                  background: user.role === 'ADMIN' ? '#FEF3C7' : '#EFF6FF',
                  border: `1.5px solid ${user.role === 'ADMIN' ? '#F59E0B' : '#BFDBFE'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '18px', fontWeight: 900,
                  color: user.role === 'ADMIN' ? '#D97706' : '#3B82F6'
                }}>
                  {user.phone.slice(0, 1)}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
                    <span style={{ fontSize: '15px', fontWeight: 800, color: '#111827' }}>{formatPhone(user.phone)}</span>
                    {user.role === 'ADMIN' && (
                      <span style={{ fontSize: '10px', fontWeight: 700, background: '#FEF3C7', color: '#D97706', padding: '1px 6px', borderRadius: '6px' }}>ADMIN</span>
                    )}
                  </div>
                  <div style={{ fontSize: '12px', color: '#9CA3AF' }}>ID: {shortId(user.id)} · {formatDate(user.created_at)}</div>
                </div>

                {/* Balance + Status */}
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: '15px', fontWeight: 900, color: '#111827' }}>{user.balance.toFixed(2)} Br</div>
                  <div style={{
                    display: 'inline-block', marginTop: '4px', padding: '2px 8px', borderRadius: '20px',
                    fontSize: '11px', fontWeight: 700,
                    background: user.is_active ? '#DCFCE7' : '#FEF2F2',
                    color: user.is_active ? '#16A34A' : '#DC2626'
                  }}>
                    {user.is_active ? 'Active' : 'Inactive'}
                  </div>
                </div>

                <svg viewBox="0 0 24 24" style={{ width: '16px', height: '16px', color: '#D1D5DB', flexShrink: 0 }} fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── DETAIL DRAWER ── */}
      {drawerOpen && (
        <>
          {/* Backdrop */}
          <div onClick={closeDrawer} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 100 }} />

          {/* Sheet */}
          <div style={{
            position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 110,
            background: '#FFF', borderTopLeftRadius: '24px', borderTopRightRadius: '24px',
            maxHeight: '88vh', overflowY: 'auto',
            boxShadow: '0 -8px 30px rgba(0,0,0,0.15)',
            animation: 'slideUp 0.25s ease-out'
          }}>
            <style>{`@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>

            {/* Handle */}
            <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 0' }}>
              <div style={{ width: '36px', height: '4px', borderRadius: '2px', background: '#E5E7EB' }} />
            </div>

            {detailLoading || !selectedUser ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#9CA3AF' }}>Loading...</div>
            ) : (
              <div style={{ padding: '16px 20px 40px' }}>

                {/* User Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px' }}>
                  <div style={{
                    width: '56px', height: '56px', borderRadius: '16px', flexShrink: 0,
                    background: selectedUser.role === 'ADMIN' ? '#FEF3C7' : '#EFF6FF',
                    border: `1.5px solid ${selectedUser.role === 'ADMIN' ? '#F59E0B' : '#BFDBFE'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '24px', fontWeight: 900, color: selectedUser.role === 'ADMIN' ? '#D97706' : '#3B82F6'
                  }}>
                    {selectedUser.phone.slice(0, 1)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '18px', fontWeight: 900, color: '#111827' }}>{formatPhone(selectedUser.phone)}</div>
                    <div style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '2px' }}>
                      ID: {shortId(selectedUser.id)} · Joined {formatDate(selectedUser.created_at)}
                    </div>
                  </div>
                  <button onClick={closeDrawer} style={{ background: '#F1F5F9', border: 'none', borderRadius: '20px', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#6B7280' }}>
                    <svg viewBox="0 0 24 24" style={{ width: '16px', height: '16px' }} fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12" /></svg>
                  </button>
                </div>

                {/* Success Message */}
                {successMsg && (
                  <div style={{ background: '#DCFCE7', border: '1px solid #BBF7D0', borderRadius: '10px', padding: '10px 14px', fontSize: '14px', color: '#16A34A', fontWeight: 700, marginBottom: '16px' }}>
                    {successMsg}
                  </div>
                )}

                {/* Stats Row */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
                  {[
                    { label: 'Balance', value: `${selectedUser.balance.toFixed(2)} Br`, color: '#111827', bg: '#F8FAFC' },
                    { label: 'Total Deposited', value: `${selectedUser.total_deposits.toFixed(2)} Br`, color: '#16A34A', bg: '#DCFCE7' },
                    { label: 'Total Withdrawn', value: `${selectedUser.total_withdrawals.toFixed(2)} Br`, color: '#F5A623', bg: '#FFFBEB' },
                    { label: 'Deposits / Withdrawals', value: `${selectedUser.deposit_count} / ${selectedUser.withdrawal_count}`, color: '#6B7280', bg: '#F1F5F9' },
                  ].map(s => (
                    <div key={s.label} style={{ background: s.bg, borderRadius: '12px', padding: '12px', border: '1px solid #E5E7EB' }}>
                      <div style={{ fontSize: '11px', color: '#9CA3AF', fontWeight: 600, marginBottom: '4px' }}>{s.label.toUpperCase()}</div>
                      <div style={{ fontSize: '15px', fontWeight: 900, color: s.color }}>{s.value}</div>
                    </div>
                  ))}
                </div>

                {/* ── ACTIONS ── */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

                  {/* Toggle Active */}
                  <div style={{ background: '#F8FAFC', borderRadius: '14px', padding: '14px', border: '1px solid #E5E7EB' }}>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#374151', marginBottom: '10px' }}>Account Status</div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: selectedUser.is_active ? '#16A34A' : '#DC2626' }}>
                          {selectedUser.is_active ? '✓ Active' : '✗ Inactive'}
                        </div>
                        <div style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '2px' }}>
                          {selectedUser.is_active ? 'User can log in and transact' : 'User account is blocked'}
                        </div>
                      </div>
                      <button
                        disabled={actionLoading}
                        onClick={handleToggleStatus}
                        style={{
                          padding: '9px 18px', borderRadius: '9px', fontSize: '13px', fontWeight: 700,
                          background: selectedUser.is_active ? '#FEF2F2' : '#DCFCE7',
                          color: selectedUser.is_active ? '#DC2626' : '#16A34A',
                          border: `1px solid ${selectedUser.is_active ? '#FECACA' : '#BBF7D0'}`,
                          cursor: actionLoading ? 'not-allowed' : 'pointer', opacity: actionLoading ? 0.6 : 1
                        }}>
                        {selectedUser.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>
                  </div>

                  {/* Toggle Role */}
                  <div style={{ background: '#F8FAFC', borderRadius: '14px', padding: '14px', border: '1px solid #E5E7EB' }}>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#374151', marginBottom: '10px' }}>User Role</div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <span style={{
                            fontSize: '13px', fontWeight: 700, padding: '3px 10px', borderRadius: '8px',
                            background: selectedUser.role === 'ADMIN' ? '#FEF3C7' : '#EFF6FF',
                            color: selectedUser.role === 'ADMIN' ? '#D97706' : '#3B82F6'
                          }}>{selectedUser.role}</span>
                        </div>
                        <div style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '4px' }}>
                          {selectedUser.role === 'ADMIN' ? 'Has full admin access' : 'Regular user account'}
                        </div>
                      </div>
                      <button
                        disabled={actionLoading}
                        onClick={handleToggleRole}
                        style={{
                          padding: '9px 18px', borderRadius: '9px', fontSize: '13px', fontWeight: 700,
                          background: selectedUser.role === 'ADMIN' ? '#EFF6FF' : '#FEF3C7',
                          color: selectedUser.role === 'ADMIN' ? '#3B82F6' : '#D97706',
                          border: `1px solid ${selectedUser.role === 'ADMIN' ? '#BFDBFE' : '#FDE68A'}`,
                          cursor: actionLoading ? 'not-allowed' : 'pointer', opacity: actionLoading ? 0.6 : 1
                        }}>
                        {selectedUser.role === 'ADMIN' ? 'Set as USER' : 'Set as ADMIN'}
                      </button>
                    </div>
                  </div>

                  {/* Balance Adjustment */}
                  <div style={{ background: '#F8FAFC', borderRadius: '14px', padding: '14px', border: '1px solid #E5E7EB' }}>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#374151', marginBottom: '12px' }}>Adjust Balance</div>

                    {/* Mode selector */}
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                      {(['adjust', 'set'] as const).map(m => (
                        <button key={m} onClick={() => setBalanceMode(m)} style={{
                          flex: 1, padding: '8px', borderRadius: '8px', fontSize: '13px', fontWeight: 700,
                          background: balanceMode === m ? '#111827' : '#E5E7EB',
                          color: balanceMode === m ? '#FFF' : '#6B7280',
                          border: 'none', cursor: 'pointer'
                        }}>
                          {m === 'adjust' ? '+ / − Adjust' : '= Set Exact'}
                        </button>
                      ))}
                    </div>

                    <div style={{ fontSize: '12px', color: '#9CA3AF', marginBottom: '8px' }}>
                      {balanceMode === 'adjust' ? 'Use positive to add, negative to subtract (e.g. -100)' : 'Set exact balance value'}
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      <div style={{ position: 'relative', flex: 1 }}>
                        <input
                          type="number" value={balanceInput} onChange={e => setBalanceInput(e.target.value)}
                          placeholder={balanceMode === 'adjust' ? '+500 or -100' : '10000.00'}
                          style={{ width: '100%', padding: '11px 14px', borderRadius: '10px', border: `1px solid ${balanceError ? '#FECACA' : '#D1D5DB'}`, fontSize: '15px', fontWeight: 700, color: '#111827', outline: 'none', background: '#FFF', boxSizing: 'border-box' }}
                        />
                      </div>
                      <button
                        disabled={actionLoading || !balanceInput}
                        onClick={handleAdjustBalance}
                        style={{
                          padding: '11px 18px', borderRadius: '10px', fontSize: '14px', fontWeight: 800,
                          background: actionLoading || !balanceInput ? '#E5E7EB' : '#111827',
                          color: actionLoading || !balanceInput ? '#9CA3AF' : '#FFF',
                          border: 'none', cursor: actionLoading || !balanceInput ? 'not-allowed' : 'pointer'
                        }}>
                        Apply
                      </button>
                    </div>
                    {balanceError && <div style={{ fontSize: '12px', color: '#DC2626', marginTop: '6px' }}>{balanceError}</div>}
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
