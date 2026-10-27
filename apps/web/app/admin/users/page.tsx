'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getAdminAuthHeaders, getAdminRoleQuery, isCurrentSuperAdmin } from '@/lib/adminAuth';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://api.miraclbet.com:8443';

type Role = 'USER' | 'WORKER' | 'AGENT' | 'ADMIN' | 'SUPER_ADMIN';

type User = {
  id: string;
  phone: string;
  role: Role;
  balance: number;
  is_active: boolean;
  created_at: string;
  promo_code?: string;
};

type UserDetail = User & {
  total_deposits: number;
  total_withdrawals: number;
  deposit_count: number;
  withdrawal_count: number;
  total_tickets?: number;
  total_staked?: number;
  won_tickets?: number;
  lost_tickets?: number;
};

type UserDeposit = {
  id: string;
  amount: number;
  provider_name: string;
  screenshot_url?: string;
  status: string;
  created_at: string;
};

type UserTicketLeg = {
  id: string;
  match_name: string;
  market_name: string;
  selection_name: string;
  odds: number;
  status: string;
  kickoff_at?: string;
};

type UserTicket = {
  id: string;
  stake: number;
  total_odds: number;
  potential_payout: number;
  status: string;
  booking_code?: string;
  created_at: string;
  legs: UserTicketLeg[];
};

const ROLE_CONFIG: Record<Role, { bg: string; text: string; border: string; avatarBg: string; avatarText: string }> = {
  USER:   { bg: '#EFF6FF', text: '#3B82F6', border: '#BFDBFE', avatarBg: '#EFF6FF', avatarText: '#3B82F6' },
  WORKER: { bg: '#F0FDF4', text: '#16A34A', border: '#BBF7D0', avatarBg: '#F0FDF4', avatarText: '#16A34A' },
  ADMIN:  { bg: '#FEF3C7', text: '#D97706', border: '#FDE68A', avatarBg: '#FEF3C7', avatarText: '#D97706' },
  SUPER_ADMIN: { bg: '#EDE9FE', text: '#7C3AED', border: '#DDD6FE', avatarBg: '#EDE9FE', avatarText: '#7C3AED' },
  AGENT:  { bg: '#F3E8FF', text: '#9333EA', border: '#E9D5FF', avatarBg: '#F3E8FF', avatarText: '#9333EA' },
};

const ALL_ROLES: Role[] = ['USER', 'WORKER', 'AGENT', 'ADMIN', 'SUPER_ADMIN'];

function shortId(id: string) { return id.slice(-6).toUpperCase(); }
function formatDate(d: string) {
  if (!d) return '';
  const dt = new Date(d);
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + ' ' +
         dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function AdminUsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [filtered, setFiltered] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState<'ALL' | Role>('ALL');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [isSuper, setIsSuper] = useState<boolean>(false);
  const [myPromoCode, setMyPromoCode] = useState<string>('');

  useEffect(() => {
    try {
      const raw = localStorage.getItem('miraclbet_user');
      if (!raw) { router.push('/login'); return; }
      const u = JSON.parse(raw);
      if (u.role !== 'ADMIN' && u.role !== 'SUPER_ADMIN') {
        router.push('/');
        return;
      }
      const superStatus = u.role === 'SUPER_ADMIN' || isCurrentSuperAdmin();
      setIsSuper(superStatus);
      if (u.promo_code) {
        setMyPromoCode(u.promo_code.trim().toUpperCase());
      }
    } catch {
      router.push('/login');
    }
  }, [router]);

  // Detail drawer & Tabs
  const [selectedUser, setSelectedUser] = useState<UserDetail | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'control' | 'deposits' | 'tickets'>('control');

  // Deposits & Tickets
  const [userDeposits, setUserDeposits] = useState<UserDeposit[]>([]);
  const [depositsLoading, setDepositsLoading] = useState(false);
  const [userTickets, setUserTickets] = useState<UserTicket[]>([]);
  const [ticketsLoading, setTicketsLoading] = useState(false);

  // Balance actions
  const [actionLoading, setActionLoading] = useState(false);
  const [balanceInput, setBalanceInput] = useState('');
  const [balanceMode, setBalanceMode] = useState<'adjust' | 'set'>('adjust');
  const [adjustSign, setAdjustSign] = useState<'+' | '-'>('+');
  const [balanceError, setBalanceError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Preview screenshot
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const rawUser = localStorage.getItem('miraclbet_user');
      const cur = rawUser ? JSON.parse(rawUser) : null;
      const curSuper = cur?.role === 'SUPER_ADMIN' || isCurrentSuperAdmin();
      const superPromo = (cur && cur.promo_code) ? cur.promo_code.trim().toUpperCase() : '';

      const url = `${API}/api/v1/admin/users?t=${Date.now()}${getAdminRoleQuery()}&promo_filter=${curSuper ? 'only' : 'none'}`;
      const res = await fetch(url, { headers: getAdminAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        const rawUsers: User[] = Array.isArray(data) ? data : [];
        const clean = curSuper
          ? (superPromo
              ? rawUsers.filter(u => u.promo_code && u.promo_code.toUpperCase() === superPromo)
              : rawUsers.filter(u => Boolean(u.promo_code && u.promo_code.trim())))
          : rawUsers.filter(u => !u.promo_code || !u.promo_code.trim());
        setUsers(clean);
      }
    } catch (e) {
      console.error('Failed to fetch users:', e);
    } finally {
      setLoading(false);
    }
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

  // Load User Data into Drawer
  const openDetail = async (user: User, initialTab: 'control' | 'deposits' | 'tickets' = 'control') => {
    setDrawerOpen(true);
    setActiveTab(initialTab);
    setDetailLoading(true);
    setSelectedUser(null);
    setUserDeposits([]);
    setUserTickets([]);
    setBalanceInput('');
    setBalanceError('');
    setSuccessMsg('');

    // 1. Fetch user summary & balance
    try {
      const res = await fetch(`${API}/api/v1/admin/users/${user.id}?t=${Date.now()}${getAdminRoleQuery()}`, {
        headers: getAdminAuthHeaders()
      });
      if (res.ok) setSelectedUser(await res.json());
    } catch (e) { console.error(e); }
    finally { setDetailLoading(false); }

    // 2. Fetch deposits
    fetchUserDeposits(user.id);

    // 3. Fetch tickets
    fetchUserTickets(user.id);
  };

  const fetchUserDeposits = async (userId: string) => {
    setDepositsLoading(true);
    try {
      const res = await fetch(`${API}/api/v1/admin/users/${userId}/deposits?t=${Date.now()}${getAdminRoleQuery()}`, {
        headers: getAdminAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        setUserDeposits(Array.isArray(data) ? data : []);
      }
    } catch (e) { console.error(e); }
    finally { setDepositsLoading(false); }
  };

  const fetchUserTickets = async (userId: string) => {
    setTicketsLoading(true);
    try {
      const res = await fetch(`${API}/api/v1/admin/users/${userId}/tickets?t=${Date.now()}${getAdminRoleQuery()}`, {
        headers: getAdminAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        setUserTickets(Array.isArray(data) ? data : []);
      }
    } catch (e) { console.error(e); }
    finally { setTicketsLoading(false); }
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
        method: 'PUT', headers: { 'Content-Type': 'application/json', ...getAdminAuthHeaders() },
        body: JSON.stringify({ is_active: !selectedUser.is_active }),
      });
      if (res.ok) {
        const updated = { ...selectedUser, is_active: !selectedUser.is_active };
        setSelectedUser(updated);
        setUsers(prev => prev.map(u => u.id === updated.id ? { ...u, is_active: updated.is_active } : u));
        flash(updated.is_active ? '✓ User activated successfully' : '✓ User deactivated');
      }
    } finally { setActionLoading(false); }
  };

  const handleSetRole = async (newRole: Role) => {
    if (!selectedUser || selectedUser.role === newRole) return;
    if (!confirm(`Change role of +251 ${selectedUser.phone} to ${newRole}?`)) return;
    setActionLoading(true);
    try {
      const res = await fetch(`${API}/api/v1/admin/users/${selectedUser.id}/role`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json', ...getAdminAuthHeaders() },
        body: JSON.stringify({ role: newRole }),
      });
      if (res.ok) {
        const updated = { ...selectedUser, role: newRole };
        setSelectedUser(updated);
        setUsers(prev => prev.map(u => u.id === updated.id ? { ...u, role: updated.role } : u));
        flash(`✓ Role updated to ${newRole}`);
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
        method: 'PUT', headers: { 'Content-Type': 'application/json', ...getAdminAuthHeaders() },
        body: JSON.stringify({ amount, mode: balanceMode }),
      });
      if (res.ok) {
        const data = await res.json();
        const updated = { ...selectedUser, balance: data.balance };
        setSelectedUser(updated);
        setUsers(prev => prev.map(u => u.id === updated.id ? { ...u, balance: updated.balance } : u));
        setBalanceInput('');
        flash(`✓ Balance updated → ${data.balance.toFixed(2)} Br`);
      } else {
        setBalanceError('Failed to update balance');
      }
    } finally { setActionLoading(false); }
  };

  const activeCount = users.filter(u => u.is_active).length;
  const totalBalance = users.reduce((s, u) => s + u.balance, 0);

  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC', fontFamily: 'system-ui, -apple-system, sans-serif', paddingBottom: '40px' }}>

      {/* HEADER */}
      <div style={{
        background: '#FFF', borderBottom: '1px solid #E5E7EB', padding: '14px 16px',
        display: 'flex', alignItems: 'center', gap: '12px',
        position: 'sticky', top: 0, zIndex: 40, boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
      }}>
        <button onClick={() => {
          const u = localStorage.getItem('miraclbet_user');
          const role = u ? JSON.parse(u).role : 'ADMIN';
          router.push(role === 'WORKER' ? '/worker' : '/admin');
        }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#374151', padding: '4px', lineHeight: 0 }}>
          <svg viewBox="0 0 24 24" style={{ width: '22px', height: '22px' }} fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 18l-6-6 6-6" /></svg>
        </button>
        <div style={{ flex: 1 }}>
          <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 900, color: '#111827', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            User Control & Management
            {isSuper ? (
              <span style={{
                fontSize: '11px', fontWeight: 800, color: '#6D28D9',
                background: '#EDE9FE', border: '1px solid #DDD6FE', padding: '2px 8px', borderRadius: '999px'
              }}>
                👑 {myPromoCode ? `Promo: ${myPromoCode}` : 'Super Admin Users'}
              </span>
            ) : (
              <span style={{
                fontSize: '11px', fontWeight: 700, color: '#475569',
                background: '#F1F5F9', border: '1px solid #CBD5E1', padding: '2px 8px', borderRadius: '999px'
              }}>
                Direct Users (No Promo)
              </span>
            )}
          </h1>
          <div style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '1px' }}>
            {users.length} {isSuper ? 'assigned promo users' : 'direct users registered'}
          </div>
        </div>
        <button onClick={fetchUsers} style={{ background: '#F1F5F9', border: 'none', borderRadius: '8px', padding: '7px 12px', cursor: 'pointer', color: '#374151', fontSize: '13px', fontWeight: 700 }}>
          ↻ Refresh
        </button>
      </div>

      <div style={{ padding: '16px', maxWidth: '720px', margin: '0 auto' }}>

        {/* OVERVIEW STATS */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '16px' }}>
          <div style={{ background: '#FFF', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '10px', textAlign: 'center' }}>
            <div style={{ fontSize: '20px', fontWeight: 900, color: '#3B82F6' }}>{users.length}</div>
            <div style={{ fontSize: '10px', color: '#9CA3AF', fontWeight: 700, marginTop: '2px' }}>TOTAL USERS</div>
          </div>
          <div style={{ background: '#FFF', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '10px', textAlign: 'center' }}>
            <div style={{ fontSize: '20px', fontWeight: 900, color: '#16A34A' }}>{activeCount}</div>
            <div style={{ fontSize: '10px', color: '#9CA3AF', fontWeight: 700, marginTop: '2px' }}>ACTIVE</div>
          </div>
          <div style={{ background: '#FFF', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '10px', textAlign: 'center' }}>
            <div style={{ fontSize: '16px', fontWeight: 900, color: '#D97706', marginTop: '2px' }}>{totalBalance.toFixed(0)} <span style={{ fontSize: '11px' }}>Br</span></div>
            <div style={{ fontSize: '10px', color: '#9CA3AF', fontWeight: 700, marginTop: '2px' }}>TOTAL BALANCE</div>
          </div>
        </div>

        {/* SEARCH BAR */}
        <div style={{ marginBottom: '12px' }}>
          <div style={{ position: 'relative' }}>
            <svg viewBox="0 0 24 24" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '16px', height: '16px', color: '#9CA3AF' }} fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by phone number or ID..."
              style={{ width: '100%', padding: '10px 12px 10px 36px', borderRadius: '10px', border: '1px solid #E5E7EB', fontSize: '14px', color: '#111827', background: '#FFF', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
        </div>

        {/* ROLE + STATUS FILTER BUTTONS */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '2px' }}>
            {( ['ALL', 'USER', 'WORKER', 'AGENT', 'ADMIN'] as const).map(r => (
              <button key={r} onClick={() => setFilterRole(r)} style={{
                flex: 1, padding: '7px 6px', borderRadius: '8px', fontSize: '11px', fontWeight: 800,
                background: filterRole === r ? '#111827' : '#FFF',
                color: filterRole === r ? '#FFF' : '#6B7280',
                border: '1px solid #E5E7EB', cursor: 'pointer', whiteSpace: 'nowrap'
              }}>{r}</button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            {( ['ALL', 'ACTIVE', 'INACTIVE'] as const).map(s => (
              <button key={s} onClick={() => setFilterStatus(s)} style={{
                flex: 1, padding: '6px 4px', borderRadius: '8px', fontSize: '11px', fontWeight: 800,
                background: filterStatus === s ? (s === 'ACTIVE' ? '#16A34A' : s === 'INACTIVE' ? '#DC2626' : '#111827') : '#FFF',
                color: filterStatus === s ? '#FFF' : '#6B7280',
                border: '1px solid #E5E7EB', cursor: 'pointer'
              }}>{s}</button>
            ))}
          </div>
        </div>

        {/* USER LIST */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#9CA3AF' }}>Loading users...</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px', color: '#9CA3AF', background: '#FFF', borderRadius: '14px', border: '1px dashed #E5E7EB' }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>👥</div>
            <div style={{ fontWeight: 800, fontSize: '15px', color: '#374151' }}>No users found</div>
            <div style={{ fontSize: '12px', marginTop: '4px' }}>
              {isSuper ? 'No users registered under this Super Admin promo code.' : 'No direct users without promo code.'}
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {filtered.map(user => {
              const rc = ROLE_CONFIG[user.role] || ROLE_CONFIG.USER;
              return (
                <div key={user.id} style={{
                  background: '#FFF', borderRadius: '14px', border: '1px solid #E5E7EB',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)', overflow: 'hidden'
                }}>
                  {/* Top user card header */}
                  <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {/* Avatar */}
                    <div style={{
                      width: '44px', height: '44px', borderRadius: '12px', flexShrink: 0,
                      background: rc.avatarBg, border: `1.5px solid ${rc.border}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '17px', fontWeight: 900, color: rc.avatarText
                    }}>
                      {user.phone.slice(0, 1)}
                    </div>

                    {/* Phone & Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '15px', fontWeight: 900, color: '#111827' }}>
                          +251 {user.phone}
                        </span>
                        <span style={{
                          fontSize: '10px', fontWeight: 800, padding: '2px 6px', borderRadius: '6px',
                          background: rc.bg, color: rc.text, border: `1px solid ${rc.border}`
                        }}>
                          {user.role}
                        </span>
                      </div>
                      <div style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        <span>ID: {shortId(user.id)}</span>
                        <span>·</span>
                        <span>{user.is_active ? '🟢 Active' : '🔴 Inactive'}</span>
                        {user.promo_code && (
                          <span style={{ fontSize: '10px', fontWeight: 800, color: '#7C3AED', background: '#F5F3FF', border: '1px solid #DDD6FE', padding: '1px 5px', borderRadius: '4px' }}>
                            🏷️ {user.promo_code}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Current Balance */}
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '11px', color: '#9CA3AF', fontWeight: 600 }}>BALANCE</div>
                      <div style={{ fontSize: '15px', fontWeight: 900, color: '#111827' }}>
                        {user.balance.toFixed(2)} <span style={{ fontSize: '11px', color: '#F5A623' }}>Br</span>
                      </div>
                    </div>
                  </div>

                  {/* Action buttons bar (mobile-optimized) */}
                  <div style={{
                    display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px',
                    padding: '8px 12px 10px', background: '#F8FAFC', borderTop: '1px solid #F1F5F9'
                  }}>
                    <button
                      onClick={() => openDetail(user, 'control')}
                      style={{
                        padding: '8px 6px', borderRadius: '8px', fontSize: '12px', fontWeight: 800,
                        background: '#111827', color: '#FFF', border: 'none', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px'
                      }}
                    >
                      ⚙️ Control
                    </button>
                    <button
                      onClick={() => openDetail(user, 'deposits')}
                      style={{
                        padding: '8px 6px', borderRadius: '8px', fontSize: '12px', fontWeight: 800,
                        background: '#F0FDF4', color: '#16A34A', border: '1px solid #BBF7D0', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px'
                      }}
                    >
                      💳 Deposits
                    </button>
                    <button
                      onClick={() => openDetail(user, 'tickets')}
                      style={{
                        padding: '8px 6px', borderRadius: '8px', fontSize: '12px', fontWeight: 800,
                        background: '#EFF6FF', color: '#2563EB', border: '1px solid #BFDBFE', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px'
                      }}
                    >
                      🎟️ Tickets
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── USER DETAIL / CONTROL DRAWER ── */}
      {drawerOpen && (
        <>
          {/* Backdrop */}
          <div
            onClick={closeDrawer}
            style={{
              position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
              zIndex: 90, backdropFilter: 'blur(3px)'
            }}
          />

          {/* Drawer Container */}
          <div style={{
            position: 'fixed', bottom: 0, left: 0, right: 0,
            maxHeight: '90vh', background: '#FFF',
            borderRadius: '20px 20px 0 0', zIndex: 100,
            display: 'flex', flexDirection: 'column',
            boxShadow: '0 -8px 24px rgba(0,0,0,0.18)',
            animation: 'slideUp 0.25s cubic-bezier(0.16,1,0.3,1)'
          }}>
            <style>{`@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>

            {/* Drag handle */}
            <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 6px', flexShrink: 0 }}>
              <div style={{ width: '40px', height: '4px', borderRadius: '2px', background: '#CBD5E1' }} />
            </div>

            {detailLoading || !selectedUser ? (
              <div style={{ padding: '60px', textAlign: 'center', color: '#9CA3AF', fontWeight: 700 }}>
                Loading user data...
              </div>
            ) : (
              <>
                {/* Drawer Header (Fixed) */}
                <div style={{ padding: '6px 16px 12px', borderBottom: '1px solid #E5E7EB', flexShrink: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '18px', fontWeight: 900, color: '#111827' }}>
                          +251 {selectedUser.phone}
                        </span>
                        <span style={{
                          fontSize: '11px', fontWeight: 800, padding: '2px 6px', borderRadius: '6px',
                          background: ROLE_CONFIG[selectedUser.role]?.bg, color: ROLE_CONFIG[selectedUser.role]?.text
                        }}>
                          {selectedUser.role}
                        </span>
                      </div>
                      <div style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '2px' }}>
                        ID: {shortId(selectedUser.id)} · Registered: {formatDate(selectedUser.created_at)}
                      </div>
                    </div>
                    <button
                      onClick={closeDrawer}
                      style={{
                        background: '#F1F5F9', border: 'none', borderRadius: '50%',
                        width: '32px', height: '32px', display: 'flex', alignItems: 'center',
                        justifyContent: 'center', cursor: 'pointer', color: '#6B7280'
                      }}
                    >
                      ✕
                    </button>
                  </div>

                  {/* Flash Message */}
                  {successMsg && (
                    <div style={{ background: '#DCFCE7', border: '1px solid #BBF7D0', borderRadius: '8px', padding: '8px 12px', fontSize: '13px', color: '#16A34A', fontWeight: 700, marginTop: '8px' }}>
                      {successMsg}
                    </div>
                  )}

                  {/* NAVIGATION TABS */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px', marginTop: '10px' }}>
                    <button
                      onClick={() => setActiveTab('control')}
                      style={{
                        padding: '9px 4px', borderRadius: '10px', fontSize: '13px', fontWeight: 800,
                        background: activeTab === 'control' ? '#111827' : '#F1F5F9',
                        color: activeTab === 'control' ? '#FFF' : '#64748B',
                        border: 'none', cursor: 'pointer', transition: 'all 0.15s'
                      }}
                    >
                      ⚙️ Overview
                    </button>
                    <button
                      onClick={() => setActiveTab('deposits')}
                      style={{
                        padding: '9px 4px', borderRadius: '10px', fontSize: '13px', fontWeight: 800,
                        background: activeTab === 'deposits' ? '#16A34A' : '#F1F5F9',
                        color: activeTab === 'deposits' ? '#FFF' : '#64748B',
                        border: 'none', cursor: 'pointer', transition: 'all 0.15s',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px'
                      }}
                    >
                      💳 Deposits ({userDeposits.length})
                    </button>
                    <button
                      onClick={() => setActiveTab('tickets')}
                      style={{
                        padding: '9px 4px', borderRadius: '10px', fontSize: '13px', fontWeight: 800,
                        background: activeTab === 'tickets' ? '#2563EB' : '#F1F5F9',
                        color: activeTab === 'tickets' ? '#FFF' : '#64748B',
                        border: 'none', cursor: 'pointer', transition: 'all 0.15s',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px'
                      }}
                    >
                      🎟️ Tickets ({userTickets.length})
                    </button>
                  </div>
                </div>

                {/* Drawer Content (Scrollable) */}
                <div style={{ overflowY: 'auto', padding: '16px', flex: 1 }}>

                  {/* ── TAB 1: CONTROL & OVERVIEW ── */}
                  {activeTab === 'control' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

                      {/* Promo Code Info */}
                      {isSuper && (
                        <div style={{
                          background: selectedUser.promo_code ? '#FEF3C7' : '#F8FAFC',
                          border: selectedUser.promo_code ? '1.5px solid #FDE68A' : '1px solid #E2E8F0',
                          borderRadius: '12px', padding: '10px 14px',
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                        }}>
                          <div>
                            <div style={{ fontSize: '10px', fontWeight: 800, color: selectedUser.promo_code ? '#92400E' : '#64748B' }}>
                              PROMO CODE (INVITER)
                            </div>
                            <div style={{ fontSize: '15px', fontWeight: 900, color: selectedUser.promo_code ? '#78350F' : '#334155', marginTop: '2px' }}>
                              {selectedUser.promo_code ? `🏷️ ${selectedUser.promo_code}` : 'Direct Registration (No Promo)'}
                            </div>
                          </div>
                          {selectedUser.promo_code && (
                            <span style={{ fontSize: '11px', fontWeight: 800, background: '#D97706', color: '#FFF', padding: '3px 8px', borderRadius: '6px' }}>
                              ✓ Super Admin
                            </span>
                          )}
                        </div>
                      )}

                      {/* Balance Card */}
                      <div style={{ background: 'linear-gradient(135deg, #0F172A, #1E293B)', borderRadius: '14px', padding: '16px', color: '#FFF' }}>
                        <div style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 700 }}>CURRENT USER BALANCE</div>
                        <div style={{ fontSize: '32px', fontWeight: 900, color: '#FFF', marginTop: '4px' }}>
                          {selectedUser.balance.toFixed(2)} <span style={{ fontSize: '16px', color: '#F5A623' }}>Br</span>
                        </div>
                      </div>

                      {/* Edit Balance Panel */}
                      <div style={{ background: '#FFF', border: '1.5px solid #E5E7EB', borderRadius: '14px', padding: '14px' }}>
                        <div style={{ fontSize: '13px', fontWeight: 800, color: '#111827', marginBottom: '8px' }}>
                          ✏️ Modify User Balance
                        </div>

                        {/* Mode selectors */}
                        <div style={{ display: 'flex', gap: '6px', marginBottom: '10px' }}>
                          <button onClick={() => { setBalanceMode('adjust'); setAdjustSign('+'); }} style={{
                            flex: 1, padding: '8px', borderRadius: '8px', fontSize: '12px', fontWeight: 800,
                            background: balanceMode === 'adjust' && adjustSign === '+' ? '#16A34A' : '#F1F5F9',
                            color: balanceMode === 'adjust' && adjustSign === '+' ? '#FFF' : '#64748B',
                            border: 'none', cursor: 'pointer'
                          }}>+ Add</button>
                          <button onClick={() => { setBalanceMode('adjust'); setAdjustSign('-'); }} style={{
                            flex: 1, padding: '8px', borderRadius: '8px', fontSize: '12px', fontWeight: 800,
                            background: balanceMode === 'adjust' && adjustSign === '-' ? '#DC2626' : '#F1F5F9',
                            color: balanceMode === 'adjust' && adjustSign === '-' ? '#FFF' : '#64748B',
                            border: 'none', cursor: 'pointer'
                          }}>− Deduct</button>
                          <button onClick={() => setBalanceMode('set')} style={{
                            flex: 1, padding: '8px', borderRadius: '8px', fontSize: '12px', fontWeight: 800,
                            background: balanceMode === 'set' ? '#111827' : '#F1F5F9',
                            color: balanceMode === 'set' ? '#FFF' : '#64748B',
                            border: 'none', cursor: 'pointer'
                          }}>= Set Exact</button>
                        </div>

                        <div style={{ display: 'flex', gap: '8px' }}>
                          <input
                            type="number"
                            value={balanceInput}
                            onChange={e => { setBalanceInput(e.target.value); setBalanceError(''); }}
                            placeholder="Amount in Br..."
                            style={{
                              flex: 1, padding: '10px 12px', borderRadius: '8px',
                              border: `1.5px solid ${balanceError ? '#FECACA' : '#D1D5DB'}`,
                              fontSize: '15px', fontWeight: 700, color: '#111827', background: '#FFF', outline: 'none'
                            }}
                          />
                          <button
                            disabled={actionLoading || !balanceInput}
                            onClick={handleAdjustBalance}
                            style={{
                              padding: '10px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 800,
                              background: actionLoading || !balanceInput ? '#CBD5E1' : '#111827',
                              color: '#FFF', border: 'none', cursor: actionLoading || !balanceInput ? 'not-allowed' : 'pointer'
                            }}
                          >
                            {actionLoading ? '...' : 'Apply'}
                          </button>
                        </div>
                        {balanceError && <div style={{ fontSize: '12px', color: '#DC2626', marginTop: '6px', fontWeight: 700 }}>{balanceError}</div>}
                      </div>

                      {/* Summary 4-Grid */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '12px', padding: '10px' }}>
                          <div style={{ fontSize: '10px', color: '#15803D', fontWeight: 700 }}>TOTAL DEPOSITED</div>
                          <div style={{ fontSize: '16px', fontWeight: 900, color: '#16A34A', marginTop: '2px' }}>
                            {selectedUser.total_deposits.toFixed(2)} Br
                          </div>
                          <div style={{ fontSize: '10px', color: '#86EFAC' }}>{selectedUser.deposit_count} deposits</div>
                        </div>

                        <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '12px', padding: '10px' }}>
                          <div style={{ fontSize: '10px', color: '#1D4ED8', fontWeight: 700 }}>TOTAL TICKETS</div>
                          <div style={{ fontSize: '16px', fontWeight: 900, color: '#2563EB', marginTop: '2px' }}>
                            {selectedUser.total_tickets ?? userTickets.length} Tickets
                          </div>
                          <div style={{ fontSize: '10px', color: '#93C5FD' }}>{(selectedUser.total_staked ?? 0).toFixed(0)} Br staked</div>
                        </div>

                        <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '12px', padding: '10px' }}>
                          <div style={{ fontSize: '10px', color: '#B45309', fontWeight: 700 }}>TOTAL WITHDRAWN</div>
                          <div style={{ fontSize: '16px', fontWeight: 900, color: '#D97706', marginTop: '2px' }}>
                            {selectedUser.total_withdrawals.toFixed(2)} Br
                          </div>
                          <div style={{ fontSize: '10px', color: '#FCD34D' }}>{selectedUser.withdrawal_count} withdrawals</div>
                        </div>

                        <div style={{ background: '#FAF5FF', border: '1px solid #E9D5FF', borderRadius: '12px', padding: '10px' }}>
                          <div style={{ fontSize: '10px', color: '#7E22CE', fontWeight: 700 }}>WON TICKETS</div>
                          <div style={{ fontSize: '16px', fontWeight: 900, color: '#9333EA', marginTop: '2px' }}>
                            {selectedUser.won_tickets ?? userTickets.filter(t => t.status === 'WON').length} Won
                          </div>
                          <div style={{ fontSize: '10px', color: '#D8B4FE' }}>
                            {selectedUser.lost_tickets ?? userTickets.filter(t => t.status === 'LOST').length} Lost
                          </div>
                        </div>
                      </div>

                      {/* Role Selector */}
                      <div style={{ background: '#F8FAFC', borderRadius: '12px', padding: '12px', border: '1px solid #E2E8F0' }}>
                        <div style={{ fontSize: '12px', fontWeight: 800, color: '#334155', marginBottom: '8px' }}>Change Role</div>
                        <div style={{ display: 'flex', gap: '6px', overflowX: 'auto' }}>
                          {ALL_ROLES.map(role => {
                            const rc = ROLE_CONFIG[role];
                            const isSelected = selectedUser.role === role;
                            return (
                              <button key={role} disabled={actionLoading} onClick={() => handleSetRole(role)} style={{
                                flex: 1, padding: '8px 4px', borderRadius: '8px', fontSize: '11px', fontWeight: 800,
                                background: isSelected ? rc.bg : '#FFF', color: isSelected ? rc.text : '#64748B',
                                border: `1.5px solid ${isSelected ? rc.border : '#CBD5E1'}`, cursor: 'pointer'
                              }}>
                                {role}
                                {isSelected && ' ✓'}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Account Status Toggle */}
                      <div style={{ background: '#F8FAFC', borderRadius: '12px', padding: '12px', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 800, color: selectedUser.is_active ? '#16A34A' : '#DC2626' }}>
                            {selectedUser.is_active ? '● Account Active' : '● Account Deactivated'}
                          </div>
                          <div style={{ fontSize: '11px', color: '#94A3B8' }}>
                            {selectedUser.is_active ? 'User can log in & bet' : 'User cannot log in'}
                          </div>
                        </div>
                        <button
                          disabled={actionLoading}
                          onClick={handleToggleStatus}
                          style={{
                            padding: '8px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 800,
                            background: selectedUser.is_active ? '#FEF2F2' : '#DCFCE7',
                            color: selectedUser.is_active ? '#DC2626' : '#16A34A',
                            border: `1px solid ${selectedUser.is_active ? '#FECACA' : '#BBF7D0'}`,
                            cursor: 'pointer'
                          }}
                        >
                          {selectedUser.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* ── TAB 2: TOTAL DEPOSIT HISTORY ── */}
                  {activeTab === 'deposits' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#F0FDF4', border: '1px solid #BBF7D0', padding: '10px 14px', borderRadius: '12px' }}>
                        <div>
                          <div style={{ fontSize: '11px', color: '#15803D', fontWeight: 700 }}>TOTAL DEPOSIT VOLUME</div>
                          <div style={{ fontSize: '20px', fontWeight: 900, color: '#16A34A' }}>
                            {selectedUser.total_deposits.toFixed(2)} Br
                          </div>
                        </div>
                        <span style={{ background: '#16A34A', color: '#FFF', padding: '4px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: 800 }}>
                          {userDeposits.length} Records
                        </span>
                      </div>

                      {depositsLoading ? (
                        <div style={{ textAlign: 'center', padding: '30px', color: '#9CA3AF' }}>Loading deposit history...</div>
                      ) : userDeposits.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '40px 16px', background: '#F8FAFC', borderRadius: '12px', border: '1px dashed #CBD5E1' }}>
                          <div style={{ fontSize: '28px', marginBottom: '8px' }}>💳</div>
                          <div style={{ fontSize: '14px', fontWeight: 800, color: '#334155' }}>No Deposits Found</div>
                          <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '2px' }}>This user has not made any deposit requests yet.</div>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {userDeposits.map((dep, idx) => {
                            const isAcc = dep.status === 'accepted';
                            const isPend = dep.status === 'pending';
                            return (
                              <div key={dep.id || idx} style={{
                                background: '#FFF', border: '1px solid #E2E8F0', borderRadius: '12px',
                                padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px'
                              }}>
                                <div style={{ minWidth: 0, flex: 1 }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span style={{ fontSize: '15px', fontWeight: 900, color: '#16A34A' }}>
                                      +{dep.amount.toFixed(2)} Br
                                    </span>
                                    <span style={{
                                      fontSize: '10px', fontWeight: 800, padding: '2px 6px', borderRadius: '4px',
                                      background: isAcc ? '#DCFCE7' : isPend ? '#FEF3C7' : '#FEE2E2',
                                      color: isAcc ? '#15803D' : isPend ? '#B45309' : '#B91C1C',
                                      textTransform: 'uppercase'
                                    }}>
                                      {dep.status}
                                    </span>
                                  </div>
                                  <div style={{ fontSize: '12px', color: '#475569', fontWeight: 700, marginTop: '2px' }}>
                                    🏦 {dep.provider_name}
                                  </div>
                                  <div style={{ fontSize: '10px', color: '#94A3B8', marginTop: '2px' }}>
                                    {formatDate(dep.created_at)} · ID: {shortId(dep.id)}
                                  </div>
                                </div>

                                {dep.screenshot_url && (
                                  <button
                                    onClick={() => setPreviewImage(dep.screenshot_url || null)}
                                    style={{
                                      background: '#F1F5F9', border: '1px solid #CBD5E1', borderRadius: '8px',
                                      padding: '6px 10px', fontSize: '11px', fontWeight: 700, color: '#334155',
                                      cursor: 'pointer', flexShrink: 0
                                    }}
                                  >
                                    📸 Receipt
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── TAB 3: TOTAL TICKETS HISTORY ── */}
                  {activeTab === 'tickets' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#EFF6FF', border: '1px solid #BFDBFE', padding: '10px 14px', borderRadius: '12px' }}>
                        <div>
                          <div style={{ fontSize: '11px', color: '#1D4ED8', fontWeight: 700 }}>TICKETS SUMMARY</div>
                          <div style={{ fontSize: '18px', fontWeight: 900, color: '#2563EB' }}>
                            {userTickets.length} Total Bets Placed
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontSize: '11px', fontWeight: 800, color: '#16A34A' }}>
                            {userTickets.filter(t => t.status === 'WON').length} Won
                          </span>
                          <span style={{ fontSize: '11px', color: '#94A3B8', margin: '0 4px' }}>·</span>
                          <span style={{ fontSize: '11px', fontWeight: 800, color: '#DC2626' }}>
                            {userTickets.filter(t => t.status === 'LOST').length} Lost
                          </span>
                        </div>
                      </div>

                      {ticketsLoading ? (
                        <div style={{ textAlign: 'center', padding: '30px', color: '#9CA3AF' }}>Loading tickets...</div>
                      ) : userTickets.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '40px 16px', background: '#F8FAFC', borderRadius: '12px', border: '1px dashed #CBD5E1' }}>
                          <div style={{ fontSize: '28px', marginBottom: '8px' }}>🎟️</div>
                          <div style={{ fontSize: '14px', fontWeight: 800, color: '#334155' }}>No Tickets Found</div>
                          <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '2px' }}>This user has not placed any bet tickets yet.</div>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          {userTickets.map((t, idx) => {
                            const isWon = t.status === 'WON';
                            const isLost = t.status === 'LOST';
                            const isPend = t.status === 'PENDING';
                            return (
                              <div key={t.id || idx} style={{
                                background: '#FFF', border: `1.5px solid ${isWon ? '#86EFAC' : isLost ? '#FECACA' : '#E2E8F0'}`,
                                borderRadius: '12px', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '8px'
                              }}>
                                {/* Ticket header */}
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                  <div>
                                    <span style={{ fontSize: '12px', fontWeight: 800, color: '#1E293B' }}>
                                      Ticket #{t.booking_code || shortId(t.id)}
                                    </span>
                                    <div style={{ fontSize: '10px', color: '#94A3B8' }}>
                                      {formatDate(t.created_at)}
                                    </div>
                                  </div>
                                  <span style={{
                                    fontSize: '11px', fontWeight: 900, padding: '3px 8px', borderRadius: '6px',
                                    background: isWon ? '#DCFCE7' : isLost ? '#FEE2E2' : '#FEF3C7',
                                    color: isWon ? '#15803D' : isLost ? '#B91C1C' : '#B45309'
                                  }}>
                                    {isWon ? '✓ WON' : isLost ? '✗ LOST' : '⏳ PENDING'}
                                  </span>
                                </div>

                                {/* Numbers row */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '4px', background: '#F8FAFC', padding: '8px', borderRadius: '8px' }}>
                                  <div>
                                    <div style={{ fontSize: '9px', color: '#94A3B8', fontWeight: 700 }}>STAKE</div>
                                    <div style={{ fontSize: '13px', fontWeight: 800, color: '#1E293B' }}>{t.stake.toFixed(0)} Br</div>
                                  </div>
                                  <div>
                                    <div style={{ fontSize: '9px', color: '#94A3B8', fontWeight: 700 }}>TOTAL ODDS</div>
                                    <div style={{ fontSize: '13px', fontWeight: 800, color: '#2563EB' }}>{t.total_odds.toFixed(2)}</div>
                                  </div>
                                  <div>
                                    <div style={{ fontSize: '9px', color: '#94A3B8', fontWeight: 700 }}>PAYOUT</div>
                                    <div style={{ fontSize: '13px', fontWeight: 900, color: isWon ? '#16A34A' : '#1E293B' }}>{t.potential_payout.toFixed(0)} Br</div>
                                  </div>
                                </div>

                                {/* Legs Breakdown */}
                                {t.legs && t.legs.length > 0 && (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '2px' }}>
                                    {t.legs.map((leg, lIdx) => {
                                      const legWon = leg.status === 'WON';
                                      const legLost = leg.status === 'LOST';
                                      return (
                                        <div key={leg.id || lIdx} style={{
                                          fontSize: '11px', padding: '6px 8px', borderRadius: '6px',
                                          background: '#FAFAFA', border: '1px solid #F1F5F9',
                                          display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                                        }}>
                                          <div style={{ minWidth: 0, flex: 1 }}>
                                            <div style={{ fontWeight: 800, color: '#1E293B' }}>{leg.match_name}</div>
                                            <div style={{ color: '#64748B', fontSize: '10px' }}>{leg.market_name} · <b>{leg.selection_name}</b> ({leg.odds.toFixed(2)})</div>
                                          </div>
                                          <span style={{
                                            fontSize: '10px', fontWeight: 800,
                                            color: legWon ? '#16A34A' : legLost ? '#DC2626' : '#D97706'
                                          }}>
                                            {legWon ? '✓ Won' : legLost ? '✗ Lost' : '⏳ Live'}
                                          </span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </>
      )}

      {/* Screenshot Preview Modal */}
      {previewImage && (
        <div onClick={() => setPreviewImage(null)} style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 200,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px'
        }}>
          <div style={{ maxWidth: '90%', maxHeight: '90%', position: 'relative' }}>
            <img src={previewImage} alt="Receipt" style={{ maxWidth: '100%', maxHeight: '85vh', borderRadius: '12px', objectFit: 'contain' }} />
            <button onClick={() => setPreviewImage(null)} style={{
              position: 'absolute', top: '-12px', right: '-12px', background: '#FFF', border: 'none',
              borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', fontWeight: 900
            }}>✕</button>
          </div>
        </div>
      )}

    </div>
  );
}
