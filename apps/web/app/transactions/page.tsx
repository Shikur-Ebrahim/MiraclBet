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

const STATUS_MAP: Record<string, { bg: string; text: string; border: string; label: string }> = {
  pending:  { bg: '#FFFBEB', text: '#D97706', border: '#FDE68A', label: 'Pending' },
  accepted: { bg: '#F0FDF4', text: '#059669', border: '#A7F3D0', label: 'Completed' },
  rejected: { bg: '#FEF2F2', text: '#DC2626', border: '#FECACA', label: 'Rejected' },
};

function ArrowUpIcon({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 24 24" style={{ width: '20px', height: '20px' }} fill="none" stroke={color} strokeWidth="2.5">
      <path d="M12 19V5M5 12l7-7 7 7" />
    </svg>
  );
}

function ArrowDownIcon({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 24 24" style={{ width: '20px', height: '20px' }} fill="none" stroke={color} strokeWidth="2.5">
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
      key = d.toDateString() === yesterday.toDateString()
        ? 'Yesterday'
        : d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
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

  const totalDeposited = txns.filter(t => t.type === 'deposit' && t.status === 'accepted').reduce((s, t) => s + t.amount, 0);
  const totalWithdrawn = txns.filter(t => t.type === 'withdrawal' && t.status === 'accepted').reduce((s, t) => s + t.amount, 0);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!mounted) return;
    const userStr = localStorage.getItem('miraclbet_user');
    if (!userStr) { router.push('/login?redirect=/transactions'); return; }
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

  const spinStyle = `@keyframes spin{to{transform:rotate(360deg)}}`;

  if (!mounted || loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#F8FAFC', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
        <style>{spinStyle}</style>
        <div style={{ width: '40px', height: '40px', border: '3px solid #E2E8F0', borderTop: '3px solid #F59E0B', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <div style={{ color: '#94A3B8', fontSize: '14px', fontWeight: 500 }}>Loading transactions...</div>
      </div>
    );
  }

  const groups = groupByDate(filtered);
  const groupKeys = Object.keys(groups);

  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC', paddingBottom: '90px' }}>
      <style>{spinStyle}</style>

      {/* ── HEADER ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 20px', background: '#FFFFFF', borderBottom: '1px solid #E2E8F0', position: 'sticky', top: '56px', zIndex: 10, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
        <button onClick={() => router.push('/')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B', padding: '4px', display: 'flex' }}>
          <svg viewBox="0 0 24 24" style={{ width: '22px', height: '22px' }} fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 18l-6-6 6-6" /></svg>
        </button>
        <div>
          <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 900, color: '#0F172A' }}>Transaction History</h1>
          <p style={{ margin: 0, fontSize: '12px', color: '#94A3B8', fontWeight: 500 }}>All your deposits & withdrawals</p>
        </div>
      </div>

      {/* ── SUMMARY CARDS ── */}
      <div style={{ padding: '20px 16px 0', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        {/* Total Deposited */}
        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '18px', padding: '18px 16px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', borderTop: '4px solid #10B981' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: '#D1FAE5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ArrowDownIcon color="#059669" />
            </div>
            <span style={{ fontSize: '11px', color: '#059669', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Deposited</span>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 900, color: '#0F172A', lineHeight: 1 }}>{totalDeposited.toFixed(2)}</div>
          <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: '4px', fontWeight: 500 }}>Br total received</div>
        </div>

        {/* Total Withdrawn */}
        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '18px', padding: '18px 16px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', borderTop: '4px solid #F59E0B' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ArrowUpIcon color="#D97706" />
            </div>
            <span style={{ fontSize: '11px', color: '#D97706', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Withdrawn</span>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 900, color: '#0F172A', lineHeight: 1 }}>{totalWithdrawn.toFixed(2)}</div>
          <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: '4px', fontWeight: 500 }}>Br total sent out</div>
        </div>
      </div>

      {/* ── FILTER TABS ── */}
      <div style={{ padding: '16px 16px 0', display: 'flex', gap: '8px' }}>
        {(['all', 'deposit', 'withdrawal'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{
            flex: 1, padding: '10px 4px', borderRadius: '12px', fontSize: '13px', fontWeight: 700,
            background: activeTab === tab ? '#0F172A' : '#FFFFFF',
            color: activeTab === tab ? '#FFFFFF' : '#64748B',
            border: `1.5px solid ${activeTab === tab ? '#0F172A' : '#E2E8F0'}`,
            cursor: 'pointer',
            boxShadow: activeTab === tab ? '0 2px 8px rgba(15,23,42,0.2)' : '0 1px 3px rgba(0,0,0,0.04)',
          }}>
            {tab === 'all' ? 'All' : tab === 'deposit' ? 'Deposits' : 'Withdrawals'}
          </button>
        ))}
      </div>

      {/* ── TRANSACTION LIST ── */}
      <div style={{ padding: '16px' }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '64px 24px', background: '#FFFFFF', borderRadius: '20px', border: '2px dashed #E2E8F0', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            <div style={{ fontSize: '52px', marginBottom: '16px' }}>📋</div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#334155', marginBottom: '8px' }}>No transactions yet</div>
            <div style={{ fontSize: '14px', color: '#94A3B8' }}>Your deposits and withdrawals will appear here</div>
          </div>
        ) : (
          groupKeys.map(dateKey => (
            <div key={dateKey}>
              {/* Date divider */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '20px 0 12px' }}>
                <div style={{ flex: 1, height: '1px', background: '#E2E8F0' }} />
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.08em', background: '#F8FAFC', padding: '0 8px' }}>{dateKey}</span>
                <div style={{ flex: 1, height: '1px', background: '#E2E8F0' }} />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {groups[dateKey].map(txn => {
                  const isDeposit = txn.type === 'deposit';
                  const statusStyle = STATUS_MAP[txn.status] ?? STATUS_MAP.pending;
                  const isExpanded = expandedId === txn.id;

                  return (
                    <div key={txn.id}
                      onClick={() => setExpandedId(isExpanded ? null : txn.id)}
                      style={{
                        background: '#FFFFFF',
                        borderRadius: '16px',
                        overflow: 'hidden',
                        border: `1px solid ${isExpanded ? (isDeposit ? '#A7F3D0' : '#FDE68A') : '#E2E8F0'}`,
                        cursor: 'pointer',
                        boxShadow: isExpanded ? (isDeposit ? '0 2px 12px rgba(16,185,129,0.1)' : '0 2px 12px rgba(245,158,11,0.1)') : '0 1px 4px rgba(0,0,0,0.04)',
                        transition: 'all 0.2s',
                      }}>

                      {/* Left accent bar */}
                      <div style={{ display: 'flex' }}>
                        <div style={{ width: '4px', background: isDeposit ? '#10B981' : '#F59E0B', flexShrink: 0 }} />

                        <div style={{ flex: 1 }}>
                          {/* Main row */}
                          <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                            {/* Icon */}
                            <div style={{
                              width: '46px', height: '46px', borderRadius: '14px', flexShrink: 0,
                              background: isDeposit ? '#D1FAE5' : '#FEF3C7',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                              {isDeposit ? <ArrowDownIcon color="#059669" /> : <ArrowUpIcon color="#D97706" />}
                            </div>

                            {/* Text */}
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', marginBottom: '3px' }}>
                                {isDeposit ? 'Deposit' : 'Withdrawal'}
                              </div>
                              <div style={{ fontSize: '12px', color: '#94A3B8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {txn.provider_name} · {formatDate(txn.created_at)}
                              </div>
                            </div>

                            {/* Amount + Status */}
                            <div style={{ textAlign: 'right', flexShrink: 0 }}>
                              <div style={{ fontSize: '17px', fontWeight: 900, color: isDeposit ? '#059669' : '#D97706', marginBottom: '5px' }}>
                                {isDeposit ? '+' : '-'}{Number(txn.amount).toFixed(2)} Br
                              </div>
                              <div style={{ display: 'inline-block', padding: '3px 9px', borderRadius: '20px', fontSize: '11px', fontWeight: 700, background: statusStyle.bg, color: statusStyle.text, border: `1px solid ${statusStyle.border}` }}>
                                {statusStyle.label}
                              </div>
                            </div>
                          </div>

                          {/* Expanded details */}
                          {isExpanded && (
                            <div style={{ padding: '0 16px 14px', borderTop: '1px solid #F1F5F9' }}>
                              <div style={{ height: '12px' }} />
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <span style={{ fontSize: '12px', color: '#94A3B8', fontWeight: 600 }}>Type</span>
                                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A', textTransform: 'capitalize' }}>{txn.type}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <span style={{ fontSize: '12px', color: '#94A3B8', fontWeight: 600 }}>Provider</span>
                                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>{txn.provider_name}</span>
                                </div>
                                {txn.account_name && (
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '12px', color: '#94A3B8', fontWeight: 600 }}>Account Name</span>
                                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>{txn.account_name}</span>
                                  </div>
                                )}
                                {txn.account_number && (
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '12px', color: '#94A3B8', fontWeight: 600 }}>Account Number</span>
                                    <span style={{ fontSize: '13px', fontWeight: 800, color: '#2563EB' }}>{txn.account_number}</span>
                                  </div>
                                )}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <span style={{ fontSize: '12px', color: '#94A3B8', fontWeight: 600 }}>Status</span>
                                  <span style={{ fontSize: '13px', fontWeight: 700, color: statusStyle.text }}>{statusStyle.label}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <span style={{ fontSize: '12px', color: '#94A3B8', fontWeight: 600 }}>Date & Time</span>
                                  <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 500 }}>{new Date(txn.created_at).toLocaleString()}</span>
                                </div>
                                {txn.screenshot_url && (
                                  <div style={{ marginTop: '6px' }}>
                                    <div style={{ fontSize: '12px', color: '#94A3B8', fontWeight: 600, marginBottom: '8px' }}>Payment Proof</div>
                                    <img src={txn.screenshot_url} alt="Receipt" style={{ width: '100%', maxHeight: '180px', objectFit: 'cover', borderRadius: '12px', border: '1px solid #E2E8F0' }} />
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
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
