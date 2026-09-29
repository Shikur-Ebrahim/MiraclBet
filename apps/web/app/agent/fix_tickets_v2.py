import re

with open(r'apps\web\app\agent\page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add QRCode import if not present
if 'react-qr-code' not in content:
    content = content.replace("import QRCode from 'react-qr-code';", "import QRCode from 'react-qr-code';")

# Find and replace MyTicketsView and everything until Main Agent Page
start_marker = '/* ─── My Tickets View ────────────────────────────────────── */'
end_marker = '/* ─── Main Agent Page ────────────────────────────────────── */'

start_idx = content.index(start_marker)
end_idx = content.index(end_marker)

new_section = r'''/* ─── My Tickets View ────────────────────────────────────── */
type FilterStatus = 'ALL' | 'PENDING' | 'WON' | 'LOST';

function parseMatchName(name: string) {
  const parts = name.split(' vs ');
  return { home: parts[0]?.trim() || name, away: parts[1]?.trim() || '' };
}
function fmtKickoff(iso: string) {
  try { const d = new Date(iso); return `${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')} ${d.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}`; } catch { return ''; }
}
function fmtDateTime(iso: string) {
  try { const d = new Date(iso); return d.toLocaleString(undefined, { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }); } catch { return iso; }
}

function AgentTeamAvatar({ name, logoUrl, size = 32 }: { name: string; logoUrl?: string; size?: number }) {
  if (logoUrl) return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: '#fff', padding: 2, border: '2px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={logoUrl} alt={name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
    </div>
  );
  const words = name.trim().split(/\s+/);
  const initials = words.length >= 2 ? words[0][0] + words[words.length - 1][0] : name.slice(0, 2);
  const colors = ['#EF4444', '#3B82F6', '#F5A623', '#10B981', '#8B5CF6', '#EC4899', '#06B6D4'];
  const idx = (name.charCodeAt(0) + (name.charCodeAt(1) || 0)) % colors.length;
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: `linear-gradient(135deg, ${colors[idx]}, #111827)`, border: '2px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <span style={{ color: '#fff', fontWeight: 900, fontSize: size * 0.35 }}>{initials.toUpperCase()}</span>
    </div>
  );
}

const SLIP_STATUS_CFG: Record<string, { bg: string; text: string; label: string; icon: string; bar: string }> = {
  PENDING: { bg: '#F5A623', text: '#fff', label: 'Pending', icon: '⏳', bar: '#F5A623' },
  WON:     { bg: '#19E66B', text: '#000', label: 'Won',     icon: '✅', bar: '#059669' },
  LOST:    { bg: '#EF4444', text: '#fff', label: 'Lost',    icon: '❌', bar: '#DC2626' },
  VOID:    { bg: '#9CA3AF', text: '#fff', label: 'Void',    icon: '↩',  bar: '#6B7280' },
};

function AgentTicketCard({ slip }: { slip: AgentTicket }) {
  const [open, setOpen] = useState(false);
  const st = SLIP_STATUS_CFG[slip.status] || SLIP_STATUS_CFG.PENDING;
  const isAccumulator = (slip.legs || []).length > 1;
  const shortId = `TICKET-${slip.id.substring(0, 8).toUpperCase()}`;

  return (
    <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', boxShadow: '0 4px 6px rgba(0,0,0,0.07)', overflow: 'hidden', marginBottom: 16 }}>
      {/* Clickable Header */}
      <div onClick={() => setOpen(!open)} style={{ background: '#f9fafb', padding: '13px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', borderBottom: open ? '1px dashed #e5e7eb' : 'none', userSelect: 'none' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ background: st.bg, color: st.text, padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 900 }}>
            {st.icon} {st.label}
          </span>
          <div>
            <div style={{ fontWeight: 800, fontSize: 14, color: '#111827' }}>
              {isAccumulator ? `${(slip.legs || []).length}-Fold Accumulator` : 'Single Bet'}
            </div>
            <div style={{ fontSize: 11, color: '#6B7280', fontFamily: 'monospace' }}>{shortId} · {fmtDateTime(slip.created_at)}</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 10, color: '#9CA3AF', textTransform: 'uppercase' }}>Payout</div>
            <div style={{ fontWeight: 900, fontSize: 15, color: slip.status === 'WON' ? '#059669' : '#D97706' }}>
              {slip.potential_payout.toFixed(2)} Br
            </div>
          </div>
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#9CA3AF" strokeWidth="2.5" style={{ transform: open ? 'rotate(180deg)' : '', transition: 'transform 0.2s', flexShrink: 0 }}>
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </div>

      {/* Expanded body */}
      {open && (
        <div style={{ background: '#fff' }}>
          {/* Legs */}
          {(slip.legs || []).map((leg, i) => {
            const { home, away } = parseMatchName(leg.match_name);
            const legWon  = leg.status === 'WON';
            const legLost = leg.status === 'LOST';
            return (
              <div key={i} style={{ position: 'relative' }}>
                {i > 0 && (
                  <div style={{ position: 'absolute', top: -8, left: 0, right: 0, display: 'flex', justifyContent: 'space-between', zIndex: 2 }}>
                    <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#F3F4F6', marginLeft: -8, border: '1px solid #e5e7eb' }} />
                    <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#F3F4F6', marginRight: -8, border: '1px solid #e5e7eb' }} />
                  </div>
                )}
                <div style={{ padding: '18px 20px', borderBottom: i < (slip.legs || []).length - 1 ? '1px dashed #e5e7eb' : 'none' }}>
                  {/* Sport + Kickoff row */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" style={{ color: '#9CA3AF' }}>
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
                      </svg>
                      <span style={{ color: '#6B7280', fontSize: 12 }}>Football Match</span>
                    </div>
                    {leg.kickoffAt && (
                      <span style={{ color: '#F5A623', fontSize: 11, fontWeight: 700 }}>{fmtKickoff(leg.kickoffAt)}</span>
                    )}
                  </div>

                  {/* Teams */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                    <div style={{ flex: 1, textAlign: 'right', fontWeight: 700, fontSize: 13, color: '#111827' }}>{home}</div>
                    <div style={{ margin: '0 16px', display: 'flex', gap: 8, alignItems: 'center' }}>
                      <AgentTeamAvatar name={home} logoUrl={leg.homeLogo} size={34} />
                      <span style={{ color: '#9CA3AF', fontSize: 10, fontWeight: 900 }}>VS</span>
                      <AgentTeamAvatar name={away} logoUrl={leg.awayLogo} size={34} />
                    </div>
                    <div style={{ flex: 1, textAlign: 'left', fontWeight: 700, fontSize: 13, color: '#111827' }}>{away}</div>
                  </div>

                  {/* Market + Status + Odds */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 14, color: '#111827', marginBottom: 4 }}>{leg.market_name}. {leg.selection_name}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ color: '#6B7280', fontSize: 12 }}>Status:</span>
                        {legWon  && <span style={{ color: '#19E66B', fontSize: 12, fontWeight: 700 }}>✅ Win</span>}
                        {legLost && <span style={{ color: '#EF4444', fontSize: 12, fontWeight: 700 }}>❌ Loss</span>}
                        {!legWon && !legLost && <span style={{ color: '#F5A623', fontSize: 12, fontWeight: 700 }}>⏳ Pending</span>}
                      </div>
                    </div>
                    <div style={{ fontWeight: 900, fontSize: 20, color: '#111827' }}>{leg.odds.toFixed(2)}</div>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Footer: totals + QR */}
          <div style={{ padding: '16px 20px', borderTop: '1px dashed #374151', background: '#fff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ color: '#6B7280', fontSize: 13 }}>Total Odds</span>
              <span style={{ fontWeight: 800, fontSize: 14, color: '#111827' }}>{slip.total_odds.toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ color: '#6B7280', fontSize: 13 }}>Stake</span>
              <span style={{ fontWeight: 800, fontSize: 14, color: '#111827' }}>{slip.stake.toFixed(2)} Br</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 12, borderTop: '1px solid #e5e7eb' }}>
              <span style={{ fontWeight: 800, fontSize: 14, color: '#111827' }}>Potential Payout</span>
              <span style={{ fontWeight: 900, fontSize: 18, color: slip.status === 'WON' ? '#059669' : '#D97706' }}>{slip.potential_payout.toFixed(2)} Br</span>
            </div>
            {/* QR Code */}
            <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ padding: 8, background: '#fff', border: '1px solid #E5E7EB', borderRadius: 8 }}>
                <QRCode value={`https://www.miraclbet.com/check?code=TICKET-${slip.id.toUpperCase()}`} size={120} level="H" style={{ display: 'block' }} />
              </div>
              <div style={{ color: '#6B7280', fontSize: 10, letterSpacing: 2, marginTop: 8, fontFamily: 'monospace' }}>
                {shortId}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MyTicketsView({ agent }: { agent: AgentSession }) {
  const [tickets, setTickets] = useState<AgentTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<FilterStatus>('ALL');
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

  const counts = {
    ALL: tickets.length,
    PENDING: tickets.filter(t => t.status === 'PENDING').length,
    WON:     tickets.filter(t => t.status === 'WON').length,
    LOST:    tickets.filter(t => t.status === 'LOST').length,
  };

  const filtered = tickets.filter(t => {
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 900, color: '#111827', margin: 0 }}>My Tickets</h2>
          <p style={{ fontSize: 13, color: '#6B7280', margin: '3px 0 0' }}>All bets placed through your agent account</p>
        </div>
        <button onClick={loadTickets} style={{ background: '#111827', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span>↻</span> Refresh
        </button>
      </div>

      {/* Stats cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Total',   count: counts.ALL,     icon: '🎟️', color: '#111827', bg: '#F9FAFB', border: '#E5E7EB' },
          { label: 'Pending', count: counts.PENDING, icon: '⏳', color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
          { label: 'Won',     count: counts.WON,     icon: '✅', color: '#059669', bg: '#F0FDF4', border: '#A7F3D0' },
          { label: 'Lost',    count: counts.LOST,    icon: '❌', color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
        ].map(s => (
          <div key={s.label} style={{ background: s.bg, border: `1px solid ${s.border}`, borderRadius: 12, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
            <div style={{ fontSize: 28 }}>{s.icon}</div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 900, color: s.color, lineHeight: 1 }}>{s.count}</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: s.color, opacity: 0.8, marginTop: 2 }}>{s.label}</div>
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
        <div style={{ display: 'flex', gap: 6, background: '#fff', padding: '4px', borderRadius: 10, border: '1px solid #E5E7EB' }}>
          {TAB_FILTERS.map(tab => {
            const isActive = filter === tab.key;
            return (
              <button key={tab.key} onClick={() => setFilter(tab.key)} style={{ padding: '7px 14px', borderRadius: 8, border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, transition: 'all 0.15s', background: isActive ? tab.color : 'transparent', color: isActive ? '#fff' : tab.color }}>
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
          <div style={{ fontSize: 16, fontWeight: 700, color: '#374151' }}>{search ? 'No matching tickets' : `No ${filter === 'ALL' ? '' : filter.toLowerCase()} tickets yet`}</div>
          <div style={{ fontSize: 13, color: '#9CA3AF', marginTop: 4 }}>Tickets placed through this agent will appear here</div>
        </div>
      )}

      <div>
        {filtered.map(t => <AgentTicketCard key={t.id} slip={t} />)}
      </div>
    </div>
  );
}

'''

content = content[:start_idx] + new_section + content[end_idx:]

with open(r'apps\web\app\agent\page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("SUCCESS")
