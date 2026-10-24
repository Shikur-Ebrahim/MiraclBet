'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getAdminAuthHeaders, getAdminRoleQuery, isCurrentSuperAdmin } from '@/lib/adminAuth';

type Withdrawal = {
  id: string;
  user_id: string;
  user_phone: string;
  provider_name: string;
  account_name: string;
  account_number: string;
  amount: number;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
  promo_code?: string;
};

export default function AdminWithdrawalsPage() {
  const router = useRouter();
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [isSuper, setIsSuper] = useState<boolean>(() => isCurrentSuperAdmin());
  const [promoFilter, setPromoFilter] = useState<'only' | 'all' | 'normal'>(() => {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search).get('promo_filter');
      if (p === 'normal') return 'normal';
      if (p === 'all') return 'all';
    }
    return isCurrentSuperAdmin() ? 'only' : 'normal';
  });

  useEffect(() => {
    const saved = localStorage.getItem('miraclbet_user');
    if (!saved) {
      router.push('/login');
      return;
    }
    const u = JSON.parse(saved);
    if (u.role !== 'ADMIN' && u.role !== 'SUPER_ADMIN' && u.role !== 'WORKER') {
      router.push('/');
      return;
    }
    const superAdmin = u.role === 'SUPER_ADMIN' || isCurrentSuperAdmin();
    setIsSuper(superAdmin);

    const p = new URLSearchParams(window.location.search).get('promo_filter');
    if (p === 'only' || (superAdmin && !p)) setPromoFilter('only');
    else if (p === 'normal') setPromoFilter('normal');
    else if (p === 'all') setPromoFilter('all');
  }, [router]);

  useEffect(() => {
    fetchWithdrawals();
  }, [promoFilter, isSuper]);

  const fetchWithdrawals = async () => {
    setLoading(true);
    try {
      let url = `${process.env.NEXT_PUBLIC_API_URL || 'https://api.miraclbet.com:8443'}/api/v1/admin/withdrawals?t=${Date.now()}${getAdminRoleQuery()}`;
      if (!isSuper) {
        url += '&promo_filter=none';
      } else if (promoFilter === 'only') {
        url += '&promo_filter=only';
      } else if (promoFilter === 'normal') {
        url += '&promo_filter=none';
      }
      const res = await fetch(url, {
        headers: getAdminAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setWithdrawals(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (id: string, status: 'accepted' | 'rejected') => {
    if (!confirm(`Are you sure you want to mark this withdrawal as ${status.toUpperCase()}?`)) return;
    
    setProcessingId(id);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://api.miraclbet.com:8443'}/api/v1/admin/withdrawals/${id}/status?${getAdminRoleQuery()}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAdminAuthHeaders() },
        body: JSON.stringify({ status }),
      });
      
      if (res.ok) {
        if (status === 'rejected') {
          // Hard deleted and balance refunded on backend
          setWithdrawals(prev => prev.filter(w => w.id !== id));
        } else {
          setWithdrawals(prev => prev.map(w => w.id === id ? { ...w, status } : w));
        }
      } else {
        alert('Failed to update withdrawal status');
      }
    } catch (err) {
      console.error(err);
      alert('Network error');
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return <div style={{ padding: '24px', color: '#9CA3AF' }}>Loading...</div>;
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Header */}
      <div style={{
        background: '#FFFFFF', borderBottom: '1px solid #E5E7EB',
        padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px',
        position: 'sticky', top: 0, zIndex: 100,
      }}>
        <button onClick={() => { const u = localStorage.getItem('miraclbet_user'); const role = u ? JSON.parse(u).role : 'ADMIN'; router.push(role === 'WORKER' ? '/worker' : '/admin'); }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
          <svg viewBox="0 0 24 24" style={{ width: '24px', height: '24px', color: '#111827' }} fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#111827' }}>
          Withdrawals Review {isSuper && <span style={{ fontSize: '12px', color: '#7C3AED', fontWeight: 800, background: '#F5F3FF', border: '1px solid #DDD6FE', padding: '2px 8px', borderRadius: 999, marginLeft: 6 }}>👑 Promo Mode</span>}
        </h1>
      </div>

      {/* List */}
      <div style={{ padding: '16px', maxWidth: '600px', margin: '0 auto' }}>
        {/* Super Admin Promo Filter Tabs */}
        {isSuper && (
          <div style={{
            display: 'flex', gap: '8px', marginBottom: '16px', background: '#F5F3FF',
            padding: '8px', borderRadius: '12px', border: '1px solid #DDD6FE'
          }}>
            <button
              onClick={() => setPromoFilter('only')}
              style={{
                flex: 1, padding: '7px 10px', borderRadius: '8px', border: 'none',
                fontWeight: 700, fontSize: '12px', cursor: 'pointer',
                background: promoFilter === 'only' ? '#7C3AED' : 'transparent',
                color: promoFilter === 'only' ? '#FFF' : '#6D28D9'
              }}
            >
              👑 Promo Withdrawals
            </button>
            <button
              onClick={() => setPromoFilter('all')}
              style={{
                flex: 1, padding: '7px 10px', borderRadius: '8px', border: 'none',
                fontWeight: 700, fontSize: '12px', cursor: 'pointer',
                background: promoFilter === 'all' ? '#111827' : 'transparent',
                color: promoFilter === 'all' ? '#FFF' : '#6D28D9'
              }}
            >
              All Withdrawals
            </button>
            <button
              onClick={() => setPromoFilter('normal')}
              style={{
                flex: 1, padding: '7px 10px', borderRadius: '8px', border: 'none',
                fontWeight: 700, fontSize: '12px', cursor: 'pointer',
                background: promoFilter === 'normal' ? '#111827' : 'transparent',
                color: promoFilter === 'normal' ? '#FFF' : '#6D28D9'
              }}
            >
              Normal Only
            </button>
          </div>
        )}

        {withdrawals.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: '#6B7280', background: '#FFF', borderRadius: '12px', border: '1px dashed #D1D5DB' }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>💸</div>
            <div>No withdrawal requests found.</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {withdrawals.map(wd => (
              <div key={wd.id} style={{
                background: '#FFFFFF', borderRadius: '16px', border: '1px solid #E5E7EB', padding: '16px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column'
              }}>
                {/* Top: User & Amount */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #F3F4F6', paddingBottom: '12px', marginBottom: '12px' }}>
                  <div>
                    <div style={{ fontSize: '12px', color: '#6B7280', fontWeight: 600, letterSpacing: '0.05em' }}>USER PHONE</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                      <div style={{ fontSize: '16px', fontWeight: 800, color: '#111827' }}>{wd.user_phone}</div>
                      {isSuper && wd.promo_code && (
                        <span style={{
                          background: '#FEF3C7', color: '#92400E', padding: '2px 7px',
                          borderRadius: '5px', fontSize: '11px', fontWeight: 800, border: '1px solid #FDE68A'
                        }}>
                          🏷️ Promo: {wd.promo_code}
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '2px' }}>AMOUNT</div>
                    <div style={{ fontSize: '20px', fontWeight: 900, color: '#F5A623' }}>{Number(wd.amount).toFixed(2)} Br</div>
                  </div>
                </div>

                {/* Details */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px', background: '#F8FAFC', padding: '12px', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '13px', color: '#6B7280' }}>Method</span>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#111827' }}>{wd.provider_name}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '13px', color: '#6B7280' }}>Account Name</span>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#111827' }}>{wd.account_name}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '13px', color: '#6B7280' }}>Account No.</span>
                    <span style={{ fontSize: '14px', fontWeight: 800, color: '#3B82F6', letterSpacing: '0.5px' }}>{wd.account_number}</span>
                  </div>
                  {isSuper && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '13px', color: '#7C3AED', fontWeight: 600 }}>Promo Code</span>
                      {wd.promo_code ? (
                        <span style={{ fontSize: '12px', fontWeight: 800, color: '#92400E', background: '#FEF3C7', padding: '1px 8px', borderRadius: '5px', border: '1px solid #FDE68A' }}>
                          🏷️ {wd.promo_code}
                        </span>
                      ) : (
                        <span style={{ fontSize: '12px', color: '#9CA3AF' }}>— None</span>
                      )}
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                    <span style={{ fontSize: '12px', color: '#9CA3AF' }}>Requested</span>
                    <span style={{ fontSize: '12px', color: '#9CA3AF' }}>{new Date(wd.created_at).toLocaleString()}</span>
                  </div>
                </div>

                {/* Actions or Status */}
                {wd.status === 'pending' ? (
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button 
                      disabled={processingId === wd.id}
                      onClick={() => handleStatusUpdate(wd.id, 'rejected')}
                      style={{
                        flex: 1, padding: '12px', background: '#FEF2F2', color: '#DC2626',
                        border: '1px solid #FECACA', borderRadius: '10px', fontSize: '14px', fontWeight: 700,
                        cursor: processingId === wd.id ? 'not-allowed' : 'pointer',
                        opacity: processingId === wd.id ? 0.5 : 1
                      }}
                    >
                      Reject (Refund)
                    </button>
                    <button 
                      disabled={processingId === wd.id}
                      onClick={() => handleStatusUpdate(wd.id, 'accepted')}
                      style={{
                        flex: 1, padding: '12px', background: '#16A34A', color: '#FFFFFF',
                        border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: 700,
                        cursor: processingId === wd.id ? 'not-allowed' : 'pointer',
                        opacity: processingId === wd.id ? 0.5 : 1
                      }}
                    >
                      {processingId === wd.id ? 'Processing...' : 'Accept'}
                    </button>
                  </div>
                ) : (
                  <div style={{ 
                    padding: '10px', textAlign: 'center', borderRadius: '8px', fontSize: '13px', fontWeight: 700,
                    background: wd.status === 'accepted' ? '#DCFCE7' : '#FEF2F2',
                    color: wd.status === 'accepted' ? '#16A34A' : '#DC2626'
                  }}>
                    {wd.status.toUpperCase()}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
