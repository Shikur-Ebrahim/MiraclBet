'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type Transaction = {
  id: string;
  type: 'deposit' | 'withdrawal';
  amount: number;
  status: 'pending' | 'accepted' | 'rejected';
  provider_name: string;
  account_name?: string;
  account_number?: string;
  screenshot_url?: string;
  created_at: string;
};

const STATUS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  pending:  { bg: 'rgba(245,166,35,0.12)',  text: '#F5A623', label: 'Pending' },
  accepted: { bg: 'rgba(25,230,107,0.12)',  text: '#19E66B', label: 'Completed' },
  rejected: { bg: 'rgba(239,68,68,0.12)',   text: '#F87171', label: 'Rejected' },
};

function ArrowUpIcon() {
  return (
    <svg viewBox="0 0 24 24" style={{ width: '20px', height: '20px' }} fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M12 19V5M5 12l7-7 7 7" />
    </svg>
  );
}

function ArrowDownIcon() {
  return (
    <svg viewBox="0 0 24 24" style={{ width: '20px', height: '20px' }} fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M12 5v14M19 12l-7 7-7-7" />
    </svg>
  );
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHrs = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHrs < 24) return `${diffHrs}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function groupByDate(txns: Transaction[]) {
  const groups: Record<string, Transaction[]> = {};
  for (const t of txns) {
    const d = new Date(t.created_at);
    const now = new Date();
    let key: string;
    if (d.toDateString() === now.toDateString()) {
      key = 'Today';
    } else {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      if (d.toDateString() === yesterday.toDateString()) {
        key = 'Yesterday';
      } else {
        key = d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
      }
    }
    if (!groups[key]) groups[key] = [];
    groups[key].push(t);
  }
  return groups;
}

export default function TransactionsPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [txns, setTxns] = useState<Transaction[]>([]);
  const [filtered, setFiltered] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'deposit' | 'withdrawal'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Summary stats
  const totalDeposited = txns.filter(t => t.type === 'deposit' && t.status === 'accepted').reduce((s, t) => s + t.amount, 0);
  const totalWithdrawn = txns.filter(t => t.type === 'withdrawal' && t.status === 'accepted').reduce((s, t) => s + t.amount, 0);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!mounted) return;
    const userStr = localStorage.getItem('miraclbet_user');
    if (!userStr) { router.push('/login'); return; }
    const user = JSON.parse(userStr);

    const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
    fetch(`${API}/api/v1/transactions?user_id=${user.id}`)
      .then(r => r.json())
      .then(data => {
        const list = Array.isArray(data) ? data : [];
        setTxns(list);
        setFiltered(list);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [mounted, router]);

  useEffect(() => {
    if (activeTab === 'all') setFiltered(txns);
    else setFiltered(txns.filter(t => t.type === activeTab));
  }, [activeTab, txns]);

  if (!mounted || loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid #1E293B', borderTop: '3px solid #F5A623', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <div style={{ color: '#6B7280', fontSize: '14px' }}>Loading transactions...</div>
      </div>
    );
  }

  const groups = groupByDate(filtered);
  const groupKeys = Object.keys(groups);

  return (
    <div style={{ minHeight: '100vh', paddingBottom: '90px', background: '#0A0E1A' }}>

      {/* ── HEADER ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '12px',
        padding: '16px 16px 12px', borderBottom: '1px solid #1E293B',
        position: 'sticky', top: '56px', zIndex: 10, background: '#0A0E1A'
      }}>
        <button onClick={() => router.push('/')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', padding: '4px' }}>
          <svg viewBox="0 0 24 24" style={{ width: '22px', height: '22px' }} fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 900, color: '#FFF' }}>Transaction History</h1>
      </div>

      {/* ── SUMMARY CARDS ── */}
      <div style={{ padding: '20px 16px 0', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        {/* Total Deposited */}
        <div style={{ background: 'rgba(25,230,107,0.07)', border: '1px solid rgba(25,230,107,0.18)', borderRadius: '16px', padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'rgba(25,230,107,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#19E66B' }}>
              <ArrowDownIcon />
            </div>
            <span style={{ fontSize: '12px', color: '#19E66B', fontWeight: 700 }}>DEPOSITED</span>
          </div>
          <div style={{ fontSize: '22px', fontWeight: 900, color: '#FFF' }}>{totalDeposited.toFixed(2)}</div>
          <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '2px' }}>Br total received</div>
        </div>

        {/* Total Withdrawn */}
        <div style={{ background: 'rgba(245,166,35,0.07)', border: '1px solid rgba(245,166,35,0.18)', borderRadius: '16px', padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'rgba(245,166,35,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#F5A623' }}>
              <ArrowUpIcon />
            </div>
            <span style={{ fontSize: '12px', color: '#F5A623', fontWeight: 700 }}>WITHDRAWN</span>
          </div>
          <div style={{ fontSize: '22px', fontWeight: 900, color: '#FFF' }}>{totalWithdrawn.toFixed(2)}</div>
          <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '2px' }}>Br total sent out</div>
        </div>
      </div>

      {/* ── FILTER TABS ── */}
      <div style={{ padding: '16px', display: 'flex', gap: '8px' }}>
        {(['all', 'deposit', 'withdrawal'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{
            flex: 1, padding: '9px 4px', borderRadius: '10px', fontSize: '13px', fontWeight: 700,
            background: activeTab === tab ? '#F5A623' : '#111827',
            color: activeTab === tab ? '#000' : '#6B7280',
            border: `1px solid ${activeTab === tab ? '#F5A623' : '#1E293B'}`,
            cursor: 'pointer', textTransform: 'capitalize'
          }}>
            {tab === 'all' ? 'All' : tab.charAt(0).toUpperCase() + tab.slice(1) + 's'}
          </button>
        ))}
      </div>

      {/* ── TRANSACTION LIST ── */}
      <div style={{ padding: '0 16px' }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 24px', color: '#4B5563' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
            <div style={{ fontSize: '18px', fontWeight: 700, color: '#6B7280', marginBottom: '8px' }}>No transactions yet</div>
            <div style={{ fontSize: '14px' }}>Your deposits and withdrawals will appear here</div>
          </div>
        ) : (
          groupKeys.map(dateKey => (
            <div key={dateKey}>
              {/* Date label */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '20px 0 10px' }}>
                <div style={{ flex: 1, height: '1px', background: '#1E293B' }} />
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#4B5563', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{dateKey}</span>
                <div style={{ flex: 1, height: '1px', background: '#1E293B' }} />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {groups[dateKey].map(txn => {
                  const isDeposit = txn.type === 'deposit';
                  const statusStyle = STATUS_COLORS[txn.status] ?? STATUS_COLORS.pending;
                  const isExpanded = expandedId === txn.id;

                  return (
                    <div key={txn.id}
                      onClick={() => setExpandedId(isExpanded ? null : txn.id)}
                      style={{
                        background: '#111827', borderRadius: '16px', overflow: 'hidden',
                        border: `1px solid ${isExpanded ? (isDeposit ? 'rgba(25,230,107,0.25)' : 'rgba(245,166,35,0.25)') : '#1E293B'}`,
                        cursor: 'pointer', transition: 'border-color 0.2s'
                      }}>

                      {/* Main Row */}
                      <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                        {/* Icon */}
                        <div style={{
                          width: '44px', height: '44px', borderRadius: '14px', flexShrink: 0,
                          background: isDeposit ? 'rgba(25,230,107,0.1)' : 'rgba(245,166,35,0.1)',
                          border: `1px solid ${isDeposit ? 'rgba(25,230,107,0.2)' : 'rgba(245,166,35,0.2)'}`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: isDeposit ? '#19E66B' : '#F5A623'
                        }}>
                          {isDeposit ? <ArrowDownIcon /> : <ArrowUpIcon />}
                        </div>

                        {/* Text */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '15px', fontWeight: 800, color: '#FFF', marginBottom: '3px' }}>
                            {isDeposit ? 'Deposit' : 'Withdrawal'}
                          </div>
                          <div style={{ fontSize: '12px', color: '#6B7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {txn.provider_name} · {formatDate(txn.created_at)}
                          </div>
                        </div>

                        {/* Amount + Status */}
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div style={{ fontSize: '17px', fontWeight: 900, color: isDeposit ? '#19E66B' : '#F5A623', marginBottom: '4px' }}>
                            {isDeposit ? '+' : '-'}{Number(txn.amount).toFixed(2)} Br
                          </div>
                          <div style={{ display: 'inline-block', padding: '2px 8px', borderRadius: '20px', fontSize: '11px', fontWeight: 700, background: statusStyle.bg, color: statusStyle.text }}>
                            {statusStyle.label}
                          </div>
                        </div>
                      </div>

                      {/* Expanded Details */}
                      {isExpanded && (
                        <div style={{ padding: '0 16px 14px', display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid #1E293B' }}>
                          <div style={{ height: '10px' }} />
                          
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '12px', color: '#6B7280' }}>Type</span>
                            <span style={{ fontSize: '13px', fontWeight: 700, color: '#FFF', textTransform: 'capitalize' }}>{txn.type}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '12px', color: '#6B7280' }}>Provider</span>
                            <span style={{ fontSize: '13px', fontWeight: 700, color: '#FFF' }}>{txn.provider_name}</span>
                          </div>
                          {txn.account_name && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontSize: '12px', color: '#6B7280' }}>Account Name</span>
                              <span style={{ fontSize: '13px', fontWeight: 700, color: '#FFF' }}>{txn.account_name}</span>
                            </div>
                          )}
                          {txn.account_number && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontSize: '12px', color: '#6B7280' }}>Account Number</span>
                              <span style={{ fontSize: '13px', fontWeight: 700, color: '#3B82F6' }}>{txn.account_number}</span>
                            </div>
                          )}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '12px', color: '#6B7280' }}>Status</span>
                            <span style={{ fontSize: '13px', fontWeight: 700, color: statusStyle.text }}>{statusStyle.label}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '12px', color: '#6B7280' }}>Date & Time</span>
                            <span style={{ fontSize: '12px', color: '#9CA3AF' }}>{new Date(txn.created_at).toLocaleString()}</span>
                          </div>
                          {txn.screenshot_url && (
                            <div style={{ marginTop: '8px' }}>
                              <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '6px' }}>Payment Proof</div>
                              <img src={txn.screenshot_url} alt="Receipt" style={{ width: '100%', maxHeight: '160px', objectFit: 'cover', borderRadius: '10px', border: '1px solid #1E293B' }} />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
