'use client';

import React, { useEffect, useState } from 'react';

type LegAdmin = {
  id: string;
  match_name: string;
  market_name: string;
  selection_name: string;
  odds: number;
  status: string;
  kickoff_at: string;
};

type SlipAdmin = {
  id: string;
  user_id: string;
  user_phone: string;
  stake: number;
  total_odds: number;
  potential_payout: number;
  status: string;
  created_at: string;
  legs: LegAdmin[];
};

const STATUS_CFG: Record<string, { bg: string; text: string; label: string; icon: string }> = {
  PENDING:   { bg: '#F5A623', text: '#fff', label: 'Open', icon: '⏳' },
  WON:       { bg: '#19E66B', text: '#000', label: 'Won',  icon: '✅' },
  LOST:      { bg: '#EF4444', text: '#fff', label: 'Lost', icon: '❌' },
  VOID:      { bg: '#9CA3AF', text: '#fff', label: 'Void', icon: '↩' },
  REFUNDED:  { bg: '#9CA3AF', text: '#fff', label: 'Void', icon: '↩' },
};

function fmtDate(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch { return iso; }
}

function AdminBetTicket({ slip }: { slip: SlipAdmin }) {
  const [open, setOpen] = useState(false);
  const st = STATUS_CFG[slip.status] || STATUS_CFG.PENDING;
  const isAccumulator = slip.legs.length > 1;

  return (
    <div style={{
      marginBottom: 20,
      background: '#ffffff',
      borderRadius: 12,
      border: '1px solid #e5e7eb',
      boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
      overflow: 'hidden'
    }}>
      {/* ─── TICKET HEADER ─── */}
      <div 
        onClick={() => setOpen(!open)}
        style={{ 
          padding: '16px 20px', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          cursor: 'pointer',
          background: open ? '#f9fafb' : '#ffffff',
          transition: 'background 0.2s'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Status Badge */}
          <div style={{
            background: st.bg,
            color: st.text,
            padding: '6px 12px',
            borderRadius: 8,
            fontWeight: 800,
            fontSize: 13,
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}>
            <span>{st.label}</span>
          </div>

          <div>
            <div style={{ color: '#111827', fontWeight: 800, fontSize: 16 }}>
              {isAccumulator ? `${slip.legs.length}-Fold Accumulator` : 'Single Bet'}
            </div>
            <div style={{ color: '#6B7280', fontSize: 12, marginTop: 2 }}>
              {fmtDate(slip.created_at)} • User: {slip.user_phone || slip.user_id.slice(0,8)}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ color: '#9CA3AF', fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>Payout</div>
            <div style={{ color: slip.status === 'WON' ? '#19E66B' : '#F5A623', fontWeight: 900, fontSize: 16 }}>
              {slip.potential_payout.toFixed(2)}
            </div>
          </div>
          <svg 
            viewBox="0 0 24 24" 
            style={{ 
              width: 20, height: 20, color: '#9CA3AF',
              transform: open ? 'rotate(180deg)' : 'none',
              transition: 'transform 0.2s'
            }} 
            fill="none" stroke="currentColor" strokeWidth="2.5"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </div>

      {/* ─── EXPANDED TICKET BODY (Receipt Style) ─── */}
      {open && (
        <div style={{ background: '#ffffff' }}>
          {slip.legs.map((leg, i) => {
            const legSt = STATUS_CFG[leg.status] || STATUS_CFG.PENDING;
            const legWon = leg.status === 'WON';
            const legLost = leg.status === 'LOST';

            return (
              <div key={leg.id} style={{ position: 'relative' }}>
                {i > 0 && (
                  <div style={{ position: 'absolute', top: -8, left: 0, right: 0, display: 'flex', justifyContent: 'space-between', zIndex: 2 }}>
                    <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#F3F4F6', marginLeft: -8, border: '1px solid #e5e7eb' }} />
                    <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#F3F4F6', marginRight: -8, border: '1px solid #e5e7eb' }} />
                  </div>
                )}
                
                <div style={{ padding: '16px 20px', borderBottom: i < slip.legs.length - 1 ? '1px dashed #d1d5db' : 'none' }}>
                  {/* Match Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#6B7280', fontSize: 12 }}>
                      <input type="radio" readOnly checked style={{ accentColor: '#9CA3AF', width: 12, height: 12 }} />
                      Football Match
                    </div>
                    {leg.kickoff_at && (
                      <div style={{ color: '#F5A623', fontSize: 11, fontWeight: 700 }}>
                        {(() => { try { const d = new Date(leg.kickoff_at); return `${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')} ${d.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}`; } catch { return ''; } })()}
                      </div>
                    )}
                  </div>

                  {/* Match Name */}
                  <div style={{ textAlign: 'center', color: '#111827', fontWeight: 800, fontSize: 14, marginBottom: 12 }}>
                    {leg.match_name.replace(' vs ', ' VS ')}
                  </div>

                  {/* Bottom: Market, Odds, Status */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                    <div>
                      <div style={{ color: '#111827', fontWeight: 800, fontSize: 14, marginBottom: 4 }}>
                        {leg.market_name}. {leg.selection_name}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ color: '#4B5563', fontSize: 12 }}>Status:</span>
                        {legWon && <span style={{ color: '#19E66B', fontSize: 12, fontWeight: 700 }}>✅ Win</span>}
                        {legLost && <span style={{ color: '#EF4444', fontSize: 12, fontWeight: 700 }}>❌ Loss</span>}
                        {!legWon && !legLost && <span style={{ color: '#F5A623', fontSize: 12, fontWeight: 700 }}>⏳ {legSt.label}</span>}
                      </div>
                    </div>
                    <div style={{ color: '#111827', fontWeight: 900, fontSize: 18 }}>
                      {leg.odds.toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Ticket Footer */}
          <div style={{ background: '#ffffff', padding: '16px 20px', borderTop: '1px dashed #374151' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ color: '#4B5563', fontSize: 12 }}>Total Odds</span>
              <span style={{ color: '#111827', fontSize: 14, fontWeight: 800 }}>{slip.total_odds.toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ color: '#4B5563', fontSize: 12 }}>Stake</span>
              <span style={{ color: '#111827', fontSize: 14, fontWeight: 800 }}>{slip.stake.toFixed(2)} Br</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 12, borderTop: '1px solid #e5e7eb' }}>
              <span style={{ color: '#111827', fontSize: 13, fontWeight: 800 }}>Potential Payout</span>
              <span style={{ color: '#d97706', fontSize: 16, fontWeight: 900 }}>{slip.potential_payout.toFixed(2)} Br</span>
            </div>
            <div style={{ marginTop: 20, textAlign: 'center' }}>
               <div style={{ color: '#6B7280', fontSize: 10, letterSpacing: 2, fontFamily: 'monospace' }}>
                TICKET-{slip.id.slice(0, 12).toUpperCase()}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminTicketsPage() {
  const [slips, setSlips] = useState<SlipAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');

  useEffect(() => {
    fetchTickets();
  }, [statusFilter]);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/api/v1/admin/bets?status=${statusFilter}`);
      if (res.ok) {
        const data = await res.json();
        setSlips(data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
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
          <h1 style={{ fontSize: '18px', fontWeight: 800, color: '#111827', margin: 0, lineHeight: 1 }}>User Tickets</h1>
          <p style={{ fontSize: '11px', color: '#9CA3AF', margin: '4px 0 0' }}>View all bets placed by users</p>
        </div>
      </div>

      <div style={{ padding: '20px 16px', maxWidth: '600px', margin: '0 auto' }}>
        {/* Status Filters */}
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '16px', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none' }}>
          {['ALL', 'PENDING', 'WON', 'LOST', 'VOID'].map(st => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              style={{
                flexShrink: 0, padding: '8px 16px', borderRadius: '12px', fontWeight: 800, fontSize: '13px', cursor: 'pointer', border: 'none',
                background: statusFilter === st ? '#111827' : '#FFFFFF',
                color: statusFilter === st ? '#FFFFFF' : '#6B7280',
                boxShadow: statusFilter === st ? '0 4px 12px rgba(17,24,39,0.2)' : '0 1px 3px rgba(0,0,0,0.05)',
                transition: 'all 0.2s'
              }}
            >
              {st === 'ALL' ? 'All Tickets' : st}
            </button>
          ))}
        </div>

        {/* Tickets List */}
        <div>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#9CA3AF', fontSize: '14px', fontWeight: 600 }}>Loading tickets...</div>
          ) : slips.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 24px', background: '#ffffff', borderRadius: '16px', border: '1px solid #e5e7eb' }}>
              <h3 style={{ color: '#111827', fontWeight: 800, fontSize: '18px', margin: '0 0 8px' }}>No tickets found</h3>
              <p style={{ color: '#6B7280', fontSize: '13px', margin: 0 }}>No user bets match the selected filter.</p>
            </div>
          ) : (
            slips.map(slip => <AdminBetTicket key={slip.id} slip={slip} />)
          )}
        </div>
      </div>
    </div>
  );
}
