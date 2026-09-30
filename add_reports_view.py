with open(r'apps\web\app\agent\page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update ActiveView type
content = content.replace(
    "type ActiveView = 'place-bet' | 'my-tickets';",
    "type ActiveView = 'place-bet' | 'my-tickets' | 'reports';"
)

# 2. Add Reports nav item to Sidebar (after My Tickets nav item)
content = content.replace(
    """    {
      id: 'my-tickets',
      label: 'My Tickets',
      icon: (
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2">
          <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
          <rect x="9" y="3" width="6" height="4" rx="1" />
          <line x1="9" y1="12" x2="15" y2="12" />
          <line x1="9" y1="16" x2="13" y2="16" />
        </svg>
      ),
    },
  ];""",
    """    {
      id: 'my-tickets',
      label: 'My Tickets',
      icon: (
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2">
          <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
          <rect x="9" y="3" width="6" height="4" rx="1" />
          <line x1="9" y1="12" x2="15" y2="12" />
          <line x1="9" y1="16" x2="13" y2="16" />
        </svg>
      ),
    },
    {
      id: 'reports',
      label: 'Reports',
      icon: (
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2">
          <line x1="18" y1="20" x2="18" y2="10" />
          <line x1="12" y1="20" x2="12" y2="4" />
          <line x1="6" y1="20" x2="6" y2="14" />
          <line x1="2" y1="20" x2="22" y2="20" />
        </svg>
      ),
    },
  ];"""
)

# 3. Update page title logic in AgentPage
content = content.replace(
    "const pageTitle = activeView === 'place-bet' ? '🖨️ Place Bet & Print' : '🎟️ My Tickets';",
    "const pageTitle = activeView === 'place-bet' ? '🖨️ Place Bet & Print' : activeView === 'my-tickets' ? '🎟️ My Tickets' : '📊 Reports';"
)

# 4. Add ReportsView render
content = content.replace(
    "          {activeView === 'place-bet' && <PlaceBetView agent={agent} onBetPlaced={() => setActiveView('my-tickets')} />}\n          {activeView === 'my-tickets' && <MyTicketsView agent={agent} />}",
    "          {activeView === 'place-bet' && <PlaceBetView agent={agent} onBetPlaced={() => setActiveView('my-tickets')} />}\n          {activeView === 'my-tickets' && <MyTicketsView agent={agent} />}\n          {activeView === 'reports' && <ReportsView agent={agent} />}"
)

# 5. Insert ReportsView component before /* ─── Main Agent Page
REPORTS_VIEW = r"""/* ─── Reports View ───────────────────────────────────────── */
type TimePeriod = 'TODAY' | 'WEEK' | 'MONTH' | 'YEAR' | 'ALL';

function ReportsView({ agent }: { agent: AgentSession }) {
  const [tickets, setTickets] = useState<AgentTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<TimePeriod>('TODAY');

  const loadTickets = useCallback(async () => {
    if (!agent.id) return;
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/v1/bets?user_id=${agent.id}`);
      if (!res.ok) return;
      const data = await res.json();
      setTickets(Array.isArray(data) ? data : []);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [agent.id]);

  useEffect(() => { loadTickets(); }, [loadTickets]);

  const now = new Date();

  const inPeriod = (t: AgentTicket) => {
    const d = new Date(t.created_at);
    if (period === 'ALL') return true;
    if (period === 'TODAY') return d.toDateString() === now.toDateString();
    if (period === 'WEEK') return d >= new Date(now.getTime() - 7 * 86400000);
    if (period === 'MONTH') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    if (period === 'YEAR') return d.getFullYear() === now.getFullYear();
    return true;
  };

  const filtered = tickets.filter(inPeriod);

  const totalTickets  = filtered.length;
  const totalStake    = filtered.reduce((s, t) => s + (t.stake || 0), 0);
  const wonTickets    = filtered.filter(t => t.status === 'WON');
  const lostTickets   = filtered.filter(t => t.status === 'LOST');
  const pendingTickets = filtered.filter(t => t.status === 'PENDING');
  const totalPayout   = wonTickets.reduce((s, t) => s + (t.potential_payout || 0), 0);
  const lostStake     = lostTickets.reduce((s, t) => s + (t.stake || 0), 0);
  const netProfit     = totalPayout - lostStake;
  const winRate       = totalTickets > 0 ? Math.round((wonTickets.length / totalTickets) * 100) : 0;
  const avgOdds       = filtered.length > 0 ? filtered.reduce((s, t) => s + (t.total_odds || 0), 0) / filtered.length : 0;

  // Build 7 or 30 day chart buckets
  const bucketCount = period === 'TODAY' ? 24 : period === 'WEEK' ? 7 : period === 'MONTH' ? 30 : period === 'YEAR' ? 12 : 7;
  const bucketLabel = (i: number) => {
    if (period === 'TODAY') return `${i}h`;
    if (period === 'WEEK') { const d = new Date(now.getTime() - (bucketCount - 1 - i) * 86400000); return ['Su','Mo','Tu','We','Th','Fr','Sa'][d.getDay()]; }
    if (period === 'MONTH') return `${i + 1}`;
    if (period === 'YEAR') return ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][i];
    return `${i + 1}`;
  };
  const buckets = Array.from({ length: bucketCount }, (_, i) => {
    const ts = filtered.filter(t => {
      const d = new Date(t.created_at);
      if (period === 'TODAY') return d.getHours() === i;
      if (period === 'WEEK') { const diff = Math.floor((now.getTime() - d.getTime()) / 86400000); return diff === (bucketCount - 1 - i); }
      if (period === 'MONTH') return d.getDate() === i + 1 && d.getMonth() === now.getMonth();
      if (period === 'YEAR') return d.getMonth() === i && d.getFullYear() === now.getFullYear();
      return false;
    });
    return { label: bucketLabel(i), stake: ts.reduce((s, t) => s + (t.stake || 0), 0), count: ts.length, won: ts.filter(t => t.status === 'WON').length };
  });
  const maxStake = Math.max(...buckets.map(b => b.stake), 1);

  const PERIOD_TABS: { key: TimePeriod; label: string }[] = [
    { key: 'TODAY', label: 'Today' },
    { key: 'WEEK',  label: 'This Week' },
    { key: 'MONTH', label: 'This Month' },
    { key: 'YEAR',  label: 'This Year' },
    { key: 'ALL',   label: 'All Time' },
  ];

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>📊</div>
        <div style={{ color: '#6B7280', fontWeight: 700 }}>Loading report data...</div>
      </div>
    </div>
  );

  return (
    <div style={{ flex: 1 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 900, color: '#111827', margin: 0 }}>Agent Reports</h2>
          <p style={{ fontSize: 13, color: '#6B7280', margin: '3px 0 0' }}>Performance overview for {agent.phone}</p>
        </div>
        <div style={{ display: 'flex', gap: 6, background: '#fff', padding: '4px', borderRadius: 10, border: '1px solid #E5E7EB', flexWrap: 'wrap' }}>
          {PERIOD_TABS.map(tab => (
            <button key={tab.key} onClick={() => setPeriod(tab.key)}
              style={{ padding: '7px 14px', borderRadius: 8, border: 'none', fontWeight: 700, fontSize: 12, cursor: 'pointer', transition: 'all 0.15s', background: period === tab.key ? '#111827' : 'transparent', color: period === tab.key ? '#fff' : '#6B7280', whiteSpace: 'nowrap' }}>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards Row 1 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 16 }}>
        {[
          { label: 'TOTAL STAKE',    value: `${totalStake.toFixed(2)} Br`, sub: `${totalTickets} tickets`,       icon: '💰', bg: '#111827', textCol: '#fff', subCol: '#9CA3AF' },
          { label: 'TOTAL PAYOUT',   value: `${totalPayout.toFixed(2)} Br`, sub: `${wonTickets.length} won`,     icon: '🏆', bg: '#059669', textCol: '#fff', subCol: '#A7F3D0' },
          { label: 'NET PROFIT',     value: `${netProfit >= 0 ? '+' : ''}${netProfit.toFixed(2)} Br`, sub: 'Payout minus lost stake', icon: netProfit >= 0 ? '📈' : '📉', bg: netProfit >= 0 ? '#F0FDF4' : '#FEF2F2', textCol: netProfit >= 0 ? '#065F46' : '#991B1B', subCol: netProfit >= 0 ? '#059669' : '#DC2626' },
          { label: 'WIN RATE',       value: `${winRate}%`, sub: `${wonTickets.length}W / ${lostTickets.length}L / ${pendingTickets.length}P`, icon: '🎯', bg: '#FFF7ED', textCol: '#C2410C', subCol: '#F97316' },
          { label: 'AVG ODDS',       value: avgOdds.toFixed(2), sub: 'per ticket',                                icon: '📐', bg: '#EFF6FF', textCol: '#1D4ED8', subCol: '#3B82F6' },
          { label: 'LOST STAKE',     value: `${lostStake.toFixed(2)} Br`, sub: `${lostTickets.length} lost`,    icon: '❌', bg: '#FEF2F2', textCol: '#991B1B', subCol: '#EF4444' },
        ].map(c => (
          <div key={c.label} style={{ background: c.bg, borderRadius: 14, padding: '16px 18px', boxShadow: '0 2px 8px rgba(0,0,0,0.07)', border: '1px solid rgba(0,0,0,0.04)' }}>
            <div style={{ fontSize: 22, marginBottom: 6 }}>{c.icon}</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: c.subCol, letterSpacing: 0.8, marginBottom: 4 }}>{c.label}</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: c.textCol, lineHeight: 1.1 }}>{c.value}</div>
            <div style={{ fontSize: 11, color: c.subCol, marginTop: 4 }}>{c.sub}</div>
          </div>
        ))}
      </div>

      {/* Bar Chart */}
      <div style={{ background: '#fff', borderRadius: 16, padding: '24px 20px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <div style={{ fontWeight: 900, fontSize: 15, color: '#111827' }}>Stake Over Time</div>
            <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>Total cash collected per {period === 'TODAY' ? 'hour' : period === 'YEAR' ? 'month' : 'day'}</div>
          </div>
          <div style={{ display: 'flex', gap: 16, fontSize: 12 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ width: 10, height: 10, borderRadius: 3, background: '#F5A623', display: 'inline-block' }} />Stake</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ width: 10, height: 10, borderRadius: 3, background: '#10B981', display: 'inline-block' }} />Won</span>
          </div>
        </div>

        {/* Chart area */}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 160, padding: '0 4px' }}>
          {buckets.map((b, i) => (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, height: '100%', justifyContent: 'flex-end' }}>
              <div style={{ fontSize: 9, color: '#9CA3AF', fontWeight: 700, marginBottom: 2, whiteSpace: 'nowrap' }}>
                {b.stake > 0 ? `${b.stake.toFixed(0)}` : ''}
              </div>
              <div style={{ width: '100%', position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', height: '100%' }}>
                {/* Won overlay */}
                {b.won > 0 && b.stake > 0 && (
                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: `${Math.round((b.won / Math.max(b.count, 1)) * (b.stake / maxStake) * 100)}%`, background: '#10B981', borderRadius: '4px 4px 0 0', opacity: 0.85 }} />
                )}
                {/* Stake bar */}
                <div style={{ width: '100%', height: `${Math.max((b.stake / maxStake) * 100, b.stake > 0 ? 3 : 0)}%`, background: b.stake > 0 ? '#F5A623' : '#F3F4F6', borderRadius: '4px 4px 0 0', minHeight: b.stake > 0 ? 4 : 2, position: 'relative', transition: 'height 0.4s ease' }} />
              </div>
              <div style={{ fontSize: 9, color: '#6B7280', fontWeight: 600, textAlign: 'center', width: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Win/Loss breakdown + Recent tickets table */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.8fr', gap: 16 }}>

        {/* Win/Loss Breakdown */}
        <div style={{ background: '#fff', borderRadius: 16, padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <div style={{ fontWeight: 900, fontSize: 15, color: '#111827', marginBottom: 16 }}>Ticket Breakdown</div>

          {/* Donut chart (CSS) */}
          <div style={{ position: 'relative', width: 120, height: 120, margin: '0 auto 20px' }}>
            <svg viewBox="0 0 36 36" style={{ transform: 'rotate(-90deg)', width: 120, height: 120 }}>
              <circle cx="18" cy="18" r="15.9" fill="none" stroke="#F3F4F6" strokeWidth="3.8" />
              {totalTickets > 0 && (
                <>
                  {/* Won arc */}
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke="#10B981" strokeWidth="3.8"
                    strokeDasharray={`${(wonTickets.length / totalTickets) * 100} 100`} strokeLinecap="round" />
                  {/* Lost arc */}
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke="#EF4444" strokeWidth="3.8"
                    strokeDasharray={`${(lostTickets.length / totalTickets) * 100} 100`}
                    strokeDashoffset={`-${(wonTickets.length / totalTickets) * 100}`} strokeLinecap="round" />
                  {/* Pending arc */}
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke="#F5A623" strokeWidth="3.8"
                    strokeDasharray={`${(pendingTickets.length / totalTickets) * 100} 100`}
                    strokeDashoffset={`-${((wonTickets.length + lostTickets.length) / totalTickets) * 100}`} strokeLinecap="round" />
                </>
              )}
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ fontSize: 22, fontWeight: 900, color: '#111827' }}>{winRate}%</div>
              <div style={{ fontSize: 10, color: '#9CA3AF', fontWeight: 700 }}>Win Rate</div>
            </div>
          </div>

          {[
            { label: 'Won',     count: wonTickets.length,     color: '#10B981', pct: totalTickets > 0 ? Math.round(wonTickets.length / totalTickets * 100) : 0 },
            { label: 'Lost',    count: lostTickets.length,    color: '#EF4444', pct: totalTickets > 0 ? Math.round(lostTickets.length / totalTickets * 100) : 0 },
            { label: 'Pending', count: pendingTickets.length, color: '#F5A623', pct: totalTickets > 0 ? Math.round(pendingTickets.length / totalTickets * 100) : 0 },
          ].map(row => (
            <div key={row.label} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: row.color, flexShrink: 0 }} />
              <div style={{ flex: 1, fontSize: 13, fontWeight: 700, color: '#374151' }}>{row.label}</div>
              <div style={{ fontSize: 13, fontWeight: 900, color: '#111827' }}>{row.count}</div>
              <div style={{ fontSize: 11, color: '#9CA3AF', width: 36, textAlign: 'right' }}>{row.pct}%</div>
            </div>
          ))}
        </div>

        {/* Recent Tickets Summary Table */}
        <div style={{ background: '#fff', borderRadius: 16, padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
          <div style={{ fontWeight: 900, fontSize: 15, color: '#111827', marginBottom: 16 }}>Recent Tickets</div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #F3F4F6' }}>
                  {['Ticket', 'Date', 'Odds', 'Stake', 'Payout', 'Status'].map(h => (
                    <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontSize: 11, fontWeight: 800, color: '#6B7280', letterSpacing: 0.5, whiteSpace: 'nowrap' }}>{h.toUpperCase()}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, 12).map(t => {
                  const cfg = { WON: { bg: '#F0FDF4', col: '#059669', label: 'Won' }, LOST: { bg: '#FEF2F2', col: '#DC2626', label: 'Lost' }, PENDING: { bg: '#FFFBEB', col: '#D97706', label: 'Pending' } }[t.status] || { bg: '#F9FAFB', col: '#6B7280', label: t.status };
                  return (
                    <tr key={t.id} style={{ borderBottom: '1px solid #F9FAFB' }}>
                      <td style={{ padding: '9px 10px', fontFamily: 'monospace', fontWeight: 700, fontSize: 12, color: '#1D4ED8' }}>
                        TICKET-{t.id.substring(0, 6).toUpperCase()}
                      </td>
                      <td style={{ padding: '9px 10px', color: '#6B7280', whiteSpace: 'nowrap', fontSize: 12 }}>
                        {new Date(t.created_at).toLocaleDateString()}
                      </td>
                      <td style={{ padding: '9px 10px', fontWeight: 800 }}>{(t.total_odds || 0).toFixed(2)}</td>
                      <td style={{ padding: '9px 10px', fontWeight: 700 }}>{(t.stake || 0).toFixed(2)} Br</td>
                      <td style={{ padding: '9px 10px', fontWeight: 700, color: '#059669' }}>{(t.potential_payout || 0).toFixed(2)} Br</td>
                      <td style={{ padding: '9px 10px' }}>
                        <span style={{ background: cfg.bg, color: cfg.col, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 800 }}>{cfg.label}</span>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: '40px 0', color: '#9CA3AF' }}>No tickets found for this period</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

"""

# Insert before the main AgentPage marker
insert_before = "/* ─── Main Agent Page ────────────────────────────────────── */"
content = content.replace(insert_before, REPORTS_VIEW + insert_before)

with open(r'apps\web\app\agent\page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("SUCCESS")
