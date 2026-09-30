import re

with open(r'apps\web\app\agent\page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Define the new MyTicketsView code
new_my_tickets_view = """function MyTicketsView({ agent }: { agent: AgentSession }) {
  const [tickets, setTickets] = useState<AgentTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<FilterStatus>('ALL');
  const [timeFilter, setTimeFilter] = useState<'TODAY' | 'WEEK' | 'MONTH' | 'YEAR' | 'ALL'>('TODAY');
  const [search, setSearch] = useState('');

  const loadTickets = useCallback(async () => {
    if (!agent.id) return;
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/v1/bets?user_id=${agent.id}`);
      if (!res.ok) { setError('Failed to load tickets.'); return; }
      const data = await res.json();
      setTickets(Array.isArray(data) ? data : []);
    } catch { setError('Network error loading tickets.'); }
    finally { setLoading(false); }
  }, [agent.id]);

  useEffect(() => { loadTickets(); }, [loadTickets]);

  // Apply Time Filter
  const now = new Date();
  const timeFilteredTickets = tickets.filter(t => {
    if (timeFilter === 'ALL') return true;
    const ticketDate = new Date(t.created_at);
    if (timeFilter === 'TODAY') {
      return ticketDate.toDateString() === now.toDateString();
    }
    if (timeFilter === 'WEEK') {
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return ticketDate >= oneWeekAgo;
    }
    if (timeFilter === 'MONTH') {
      return ticketDate.getMonth() === now.getMonth() && ticketDate.getFullYear() === now.getFullYear();
    }
    if (timeFilter === 'YEAR') {
      return ticketDate.getFullYear() === now.getFullYear();
    }
    return true;
  });

  const counts = {
    ALL: timeFilteredTickets.length,
    PENDING: timeFilteredTickets.filter(t => t.status === 'PENDING').length,
    WON:     timeFilteredTickets.filter(t => t.status === 'WON').length,
    LOST:    timeFilteredTickets.filter(t => t.status === 'LOST').length,
  };

  const totalStake = timeFilteredTickets.reduce((sum, t) => sum + (t.stake || 0), 0);
  const totalPayout = timeFilteredTickets.filter(t => t.status === 'WON').reduce((sum, t) => sum + (t.potential_payout || 0), 0);

  const filtered = timeFilteredTickets.filter(t => {
    const matchesFilter = filter === 'ALL' || t.status === filter;
    const q = search.trim().toUpperCase();
    const matchesSearch = !q || t.id.toUpperCase().includes(q) || `TICKET-${t.id.substring(0,8).toUpperCase()}`.includes(q);
    return matchesFilter && matchesSearch;
  });

  const TAB_FILTERS: { key: FilterStatus; label: string; icon: string; color: string }[] = [
    { key: 'ALL',     label: 'All',     icon: '🎟️', color: '#111827' },
    { key: 'PENDING', label: 'Pending', icon: '⏳', color: '#D97706' },
    { key: 'WON',     label: 'Won',     icon: '✅', color: '#059669' },
    { key: 'LOST',    label: 'Lost',    icon: '❌', color: '#DC2626' },
  ];

  return (
    <div style={{ flex: 1 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 900, color: '#111827', margin: 0 }}>My Tickets</h2>
          <p style={{ fontSize: 13, color: '#6B7280', margin: '3px 0 0' }}>Track your sales and placed bets</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <select 
            value={timeFilter} 
            onChange={e => setTimeFilter(e.target.value as any)}
            style={{ padding: '9px 12px', borderRadius: 8, border: '2px solid #E5E7EB', outline: 'none', fontWeight: 700, fontSize: 13, background: '#fff', cursor: 'pointer' }}
          >
            <option value="TODAY">Today</option>
            <option value="WEEK">This Week</option>
            <option value="MONTH">This Month</option>
            <option value="YEAR">This Year</option>
            <option value="ALL">All Time</option>
          </select>
          <button onClick={loadTickets} style={{ background: '#111827', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>↻</span> Refresh
          </button>
        </div>
      </div>

      {/* Financial Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 16 }}>
        <div style={{ background: '#111827', borderRadius: 12, padding: '16px 20px', color: '#fff', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#9CA3AF', letterSpacing: 0.5, marginBottom: 4 }}>TOTAL STAKE ({timeFilter})</div>
          <div style={{ fontSize: 28, fontWeight: 900 }}>{totalStake.toFixed(2)} Br</div>
        </div>
        <div style={{ background: '#059669', borderRadius: 12, padding: '16px 20px', color: '#fff', boxShadow: '0 4px 6px rgba(16,185,129,0.2)' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#A7F3D0', letterSpacing: 0.5, marginBottom: 4 }}>TOTAL PAYOUT WON</div>
          <div style={{ fontSize: 28, fontWeight: 900 }}>{totalPayout.toFixed(2)} Br</div>
        </div>
      </div>

      {/* Ticket Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Total Tickets', count: counts.ALL,     icon: '🎟️', color: '#111827', bg: '#F9FAFB', border: '#E5E7EB' },
          { label: 'Pending',       count: counts.PENDING, icon: '⏳', color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
          { label: 'Won',           count: counts.WON,     icon: '✅', color: '#059669', bg: '#F0FDF4', border: '#A7F3D0' },
          { label: 'Lost',          count: counts.LOST,    icon: '❌', color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
        ].map(s => (
          <div key={s.label} style={{ background: s.bg, border: `1px solid ${s.border}`, borderRadius: 12, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
            <div style={{ fontSize: 22 }}>{s.icon}</div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 900, color: s.color, lineHeight: 1 }}>{s.count}</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: s.color, opacity: 0.8, marginTop: 4 }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Search + Filter */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 200, position: 'relative' }}>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#9CA3AF" strokeWidth="2.5" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }}>
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by ticket code..."
            style={{ width: '100%', padding: '11px 14px 11px 38px', border: '2px solid #E5E7EB', borderRadius: 10, fontSize: 14, outline: 'none', boxSizing: 'border-box', background: '#fff', fontFamily: 'monospace', fontWeight: 600 }} />
          {search && <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', fontSize: 16 }}>✕</button>}
        </div>
        <div style={{ display: 'flex', gap: 6, background: '#fff', padding: '4px', borderRadius: 10, border: '1px solid #E5E7EB', overflowX: 'auto' }}>
          {TAB_FILTERS.map(tab => {
            const isActive = filter === tab.key;
            return (
              <button key={tab.key} onClick={() => setFilter(tab.key)} style={{ padding: '7px 14px', borderRadius: 8, border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, transition: 'all 0.15s', background: isActive ? tab.color : 'transparent', color: isActive ? '#fff' : tab.color, whiteSpace: 'nowrap' }}>
                <span>{tab.icon}</span> {tab.label}
                <span style={{ background: isActive ? 'rgba(255,255,255,0.25)' : '#F3F4F6', color: isActive ? '#fff' : tab.color, padding: '1px 7px', borderRadius: 20, fontSize: 11, fontWeight: 800 }}>{counts[tab.key]}</span>
              </button>
            );
          })}
        </div>
      </div>

      {loading && <div style={{ textAlign: 'center', padding: '60px 0', color: '#6B7280' }}>⏳ Loading tickets...</div>}
      {error && <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: 16, color: '#DC2626' }}>⚠️ {error}</div>}
      {!loading && !error && filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '80px 0' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🎟️</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#374151' }}>{search ? 'No matching tickets' : `No ${filter === 'ALL' ? '' : filter.toLowerCase()} tickets found for ${timeFilter}`}</div>
          <div style={{ fontSize: 13, color: '#9CA3AF', marginTop: 4 }}>Change your time filter or place new bets</div>
        </div>
      )}

      <div>
        {filtered.map(t => <AgentTicketCard key={t.id} slip={t} />)}
      </div>
    </div>
  );
}"""

# Using regex to replace the function MyTicketsView
pattern = re.compile(r'function MyTicketsView.*?^}$', re.MULTILINE | re.DOTALL)
new_content, count = pattern.subn(new_my_tickets_view, content, count=1)

if count > 0:
    with open(r'apps\web\app\agent\page.tsx', 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("SUCCESS: MyTicketsView replaced")
else:
    print("ERROR: MyTicketsView not found")
