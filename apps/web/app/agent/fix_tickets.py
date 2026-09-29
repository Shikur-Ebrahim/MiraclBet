import re

with open(r'apps\web\app\agent\page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

old = r'''/* ─── My Tickets View ────────────────────────────────────── */
function MyTicketsView({ agent }: { agent: AgentSession }) {
  const [tickets, setTickets] = useState<AgentTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

  const statusColor: Record<string, string> = { PENDING: '#D97706', WON: '#059669', LOST: '#DC2626', VOID: '#6B7280' };
  const statusBg: Record<string, string> = { PENDING: '#FFFBEB', WON: '#F0FDF4', LOST: '#FEF2F2', VOID: '#F3F4F6' };

  return (
    <div style={{ flex: 1 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 900, color: '#111827', margin: 0 }}>My Tickets</h2>
          <p style={{ fontSize: 13, color: '#6B7280', margin: '4px 0 0' }}>All bets placed through your agent account</p>
        </div>
        <button onClick={loadTickets} style={{ background: '#111827', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>
          ↻ Refresh
        </button>
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#6B7280' }}>Loading tickets...</div>
      )}
      {error && (
        <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: 16, color: '#DC2626', fontSize: 14 }}>⚠️ {error}</div>
      )}
      {!loading && !error && tickets.length === 0 && (
        <div style={{ textAlign: 'center', padding: '80px 0' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🎟️</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#374151' }}>No tickets yet</div>
          <div style={{ fontSize: 13, color: '#9CA3AF', marginTop: 4 }}>Tickets placed through this agent will appear here</div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {tickets.map(t => {
          const sc = statusColor[t.status] || '#D97706';
          const sb = statusBg[t.status] || '#FFFBEB';
          const shortId = `TICKET-${t.id.substring(0, 8).toUpperCase()}`;
          const date = new Date(t.created_at).toLocaleString(undefined, { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

          return (
            <div key={t.id} style={{ background: '#fff', borderRadius: 14, border: '1px solid #E5E7EB', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
              {/* Header */}
              <div style={{ background: '#F9FAFB', padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #E5E7EB' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ background: sb, color: sc, border: `1px solid ${sc}33`, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 800 }}>
                    {t.status === 'PENDING' ? '⏳' : t.status === 'WON' ? '✅' : t.status === 'LOST' ? '❌' : '↩'} {t.status}
                  </span>
                  <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#059669', fontWeight: 700 }}>{shortId}</span>
                </div>
                <span style={{ fontSize: 11, color: '#9CA3AF' }}>{date}</span>
              </div>

              {/* Legs */}
              <div style={{ padding: '14px 20px' }}>
                {(t.legs || []).slice(0, 3).map((leg, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: i < (t.legs || []).length - 1 ? 10 : 0, paddingBottom: i < (t.legs || []).length - 1 ? 10 : 0, borderBottom: i < (t.legs || []).length - 1 ? '1px dashed #E5E7EB' : 'none' }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13, color: '#111827' }}>{leg.match_name}</div>
                      <div style={{ fontSize: 12, color: '#6B7280' }}>{leg.market_name} · {leg.selection_name}</div>
                    </div>
                    <span style={{ fontWeight: 900, fontSize: 15, color: '#111827' }}>{leg.odds.toFixed(2)}</span>
                  </div>
                ))}
                {(t.legs || []).length > 3 && (
                  <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 8 }}>+{t.legs.length - 3} more selections</div>
                )}
              </div>

              {/* Footer */}
              <div style={{ background: '#FAFAFA', padding: '12px 20px', borderTop: '1px dashed #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: 20 }}>
                  <div>
                    <div style={{ fontSize: 10, color: '#9CA3AF', fontWeight: 700, marginBottom: 2 }}>STAKE</div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: '#111827' }}>{t.stake.toFixed(2)} Br</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: '#9CA3AF', fontWeight: 700, marginBottom: 2 }}>TOTAL ODDS</div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: '#111827' }}>{t.total_odds.toFixed(2)}</div>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 10, color: '#9CA3AF', fontWeight: 700, marginBottom: 2 }}>POTENTIAL PAYOUT</div>
                  <div style={{ fontSize: 16, fontWeight: 900, color: t.status === 'WON' ? '#059669' : '#D97706' }}>{t.potential_payout.toFixed(2)} Br</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}'''

new = r'''/* ─── My Tickets View ────────────────────────────────────── */
type FilterStatus = 'ALL' | 'PENDING' | 'WON' | 'LOST';

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

  const STATUS_CFG: Record<string, { color: string; bg: string; border: string; icon: string; label: string }> = {
    PENDING: { color: '#D97706', bg: '#FFFBEB', border: '#FDE68A', icon: '⏳', label: 'Pending' },
    WON:     { color: '#059669', bg: '#F0FDF4', border: '#A7F3D0', icon: '✅', label: 'Won' },
    LOST:    { color: '#DC2626', bg: '#FEF2F2', border: '#FECACA', icon: '❌', label: 'Lost' },
    VOID:    { color: '#6B7280', bg: '#F3F4F6', border: '#D1D5DB', icon: '↩',  label: 'Void' },
  };

  const counts = {
    ALL: tickets.length,
    PENDING: tickets.filter(t => t.status === 'PENDING').length,
    WON: tickets.filter(t => t.status === 'WON').length,
    LOST: tickets.filter(t => t.status === 'LOST').length,
  };

  const filtered = tickets.filter(t => {
    const matchesFilter = filter === 'ALL' || t.status === filter;
    const q = search.trim().toUpperCase();
    const matchesSearch = !q || t.id.toUpperCase().includes(q) || `TICKET-${t.id.substring(0,8).toUpperCase()}`.includes(q);
    return matchesFilter && matchesSearch;
  });

  const TAB_FILTERS: { key: FilterStatus; label: string; color: string; activeColor: string; icon: string }[] = [
    { key: 'ALL',     label: 'All',     color: '#374151', activeColor: '#111827', icon: '🎟️' },
    { key: 'PENDING', label: 'Pending', color: '#D97706', activeColor: '#D97706', icon: '⏳' },
    { key: 'WON',     label: 'Won',     color: '#059669', activeColor: '#059669', icon: '✅' },
    { key: 'LOST',    label: 'Lost',    color: '#DC2626', activeColor: '#DC2626', icon: '❌' },
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
          <span style={{ fontSize: 16 }}>↻</span> Refresh
        </button>
      </div>

      {/* Stats cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Total', count: counts.ALL, icon: '🎟️', color: '#111827', bg: '#F9FAFB', border: '#E5E7EB' },
          { label: 'Pending', count: counts.PENDING, icon: '⏳', color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
          { label: 'Won', count: counts.WON, icon: '✅', color: '#059669', bg: '#F0FDF4', border: '#A7F3D0' },
          { label: 'Lost', count: counts.LOST, icon: '❌', color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
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

      {/* Search + Filter row */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, alignItems: 'center', flexWrap: 'wrap' }}>
        {/* Search input */}
        <div style={{ flex: 1, minWidth: 200, position: 'relative' }}>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#9CA3AF" strokeWidth="2.5" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }}>
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by ticket code..."
            style={{ width: '100%', padding: '11px 14px 11px 38px', border: '2px solid #E5E7EB', borderRadius: 10, fontSize: 14, outline: 'none', boxSizing: 'border-box', background: '#fff', fontFamily: 'monospace', fontWeight: 600 }}
          />
          {search && (
            <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', fontSize: 16, padding: 2 }}>✕</button>
          )}
        </div>

        {/* Status filter tabs */}
        <div style={{ display: 'flex', gap: 6, background: '#fff', padding: '4px', borderRadius: 10, border: '1px solid #E5E7EB' }}>
          {TAB_FILTERS.map(tab => {
            const isActive = filter === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                style={{
                  padding: '7px 14px', borderRadius: 8, border: 'none', fontWeight: 700, fontSize: 13,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, transition: 'all 0.15s',
                  background: isActive ? tab.activeColor : 'transparent',
                  color: isActive ? '#fff' : tab.color,
                }}
              >
                <span style={{ fontSize: 14 }}>{tab.icon}</span>
                {tab.label}
                <span style={{
                  background: isActive ? 'rgba(255,255,255,0.25)' : '#F3F4F6',
                  color: isActive ? '#fff' : tab.color,
                  padding: '1px 7px', borderRadius: 20, fontSize: 11, fontWeight: 800
                }}>
                  {counts[tab.key]}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>⏳</div>
          <div style={{ color: '#6B7280', fontWeight: 600 }}>Loading tickets...</div>
        </div>
      )}
      {error && <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: 16, color: '#DC2626', fontSize: 14 }}>⚠️ {error}</div>}

      {!loading && !error && filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '80px 0' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🎟️</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#374151' }}>
            {search ? 'No tickets match your search' : tickets.length === 0 ? 'No tickets yet' : `No ${filter.toLowerCase()} tickets`}
          </div>
          <div style={{ fontSize: 13, color: '#9CA3AF', marginTop: 4 }}>
            {search ? 'Try a different ticket code' : 'Tickets placed through this agent will appear here'}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {filtered.map(t => {
          const sc = STATUS_CFG[t.status] || STATUS_CFG.PENDING;
          const shortId = `TICKET-${t.id.substring(0, 8).toUpperCase()}`;
          const date = new Date(t.created_at).toLocaleString(undefined, { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
          const foldLabel = (t.legs || []).length > 1 ? `${(t.legs || []).length}-Fold Accumulator` : 'Single Bet';

          return (
            <div key={t.id} style={{ background: '#fff', borderRadius: 14, border: `1px solid ${sc.border}`, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', transition: 'box-shadow 0.2s' }}>
              {/* Header with colored left bar */}
              <div style={{ display: 'flex', borderBottom: `1px solid #F3F4F6` }}>
                <div style={{ width: 5, background: sc.color, flexShrink: 0 }} />
                <div style={{ flex: 1, padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: sc.bg }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ background: '#fff', color: sc.color, border: `1px solid ${sc.border}`, padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 900 }}>
                      {sc.icon} {sc.label}
                    </span>
                    <div>
                      <div style={{ fontFamily: 'monospace', fontSize: 12, color: '#059669', fontWeight: 800 }}>{shortId}</div>
                      <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 1 }}>{foldLabel}</div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 10, color: '#9CA3AF', fontWeight: 700 }}>DATE</div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#374151' }}>{date}</div>
                  </div>
                </div>
              </div>

              {/* Legs */}
              <div style={{ padding: '14px 20px' }}>
                {(t.legs || []).slice(0, 3).map((leg, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: i < Math.min((t.legs || []).length, 3) - 1 ? 10 : 0, marginBottom: i < Math.min((t.legs || []).length, 3) - 1 ? 10 : 0, borderBottom: i < Math.min((t.legs || []).length, 3) - 1 ? '1px dashed #E5E7EB' : 'none' }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13, color: '#111827' }}>{leg.match_name}</div>
                      <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>{leg.market_name} · <strong style={{ color: '#374151' }}>{leg.selection_name}</strong></div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 12 }}>
                      <div style={{ fontWeight: 900, fontSize: 16, color: '#111827' }}>{leg.odds.toFixed(2)}</div>
                      {leg.status !== 'PENDING' && (
                        <div style={{ fontSize: 11, color: leg.status === 'WON' ? '#059669' : '#DC2626', fontWeight: 700 }}>
                          {leg.status === 'WON' ? '✅ Won' : '❌ Lost'}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {(t.legs || []).length > 3 && (
                  <div style={{ fontSize: 12, color: '#6B7280', marginTop: 8, fontStyle: 'italic' }}>+{t.legs.length - 3} more selection{t.legs.length - 3 > 1 ? 's' : ''}</div>
                )}
              </div>

              {/* Footer */}
              <div style={{ background: '#FAFAFA', padding: '12px 20px', borderTop: '1px dashed #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: 24 }}>
                  <div>
                    <div style={{ fontSize: 10, color: '#9CA3AF', fontWeight: 700, letterSpacing: 0.5 }}>STAKE</div>
                    <div style={{ fontSize: 15, fontWeight: 900, color: '#111827', marginTop: 2 }}>{t.stake.toFixed(2)} Br</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: '#9CA3AF', fontWeight: 700, letterSpacing: 0.5 }}>TOTAL ODDS</div>
                    <div style={{ fontSize: 15, fontWeight: 900, color: '#111827', marginTop: 2 }}>{t.total_odds.toFixed(2)}</div>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 10, color: '#9CA3AF', fontWeight: 700, letterSpacing: 0.5 }}>POTENTIAL PAYOUT</div>
                  <div style={{ fontSize: 20, fontWeight: 900, color: t.status === 'WON' ? '#059669' : sc.color, marginTop: 2 }}>
                    {t.potential_payout.toFixed(2)} Br
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}'''

if '/* ─── My Tickets View ────────────────────────────────────── */' in content:
    content = content.replace(
        content[content.index('/* ─── My Tickets View'):content.index('/* ─── Main Agent Page')],
        new + '\n\n'
    )
    with open(r'apps\web\app\agent\page.tsx', 'w', encoding='utf-8') as f:
        f.write(content)
    print("SUCCESS")
else:
    print("ERROR: marker not found")
