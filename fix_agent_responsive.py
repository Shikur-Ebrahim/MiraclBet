with open(r'apps\web\app\agent\page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Find the start of the Sidebar comment and the end of the file
sidebar_start = content.index('/* \u2500\u2500\u2500 Sidebar \u2500')
# Everything before sidebar stays the same
before = content[:sidebar_start]

new_tail = r"""/* ─── Sidebar ─────────────────────────────────────────────── */
function Sidebar({
  active, onNav, agent, onLogout,
}: {
  active: ActiveView;
  onNav: (v: ActiveView) => void;
  agent: AgentSession;
  onLogout: () => void;
}) {
  const navItems: { id: ActiveView; label: string; icon: React.ReactNode }[] = [
    {
      id: 'place-bet',
      label: 'Place Bet',
      icon: (
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2">
          <rect x="2" y="5" width="20" height="14" rx="2" />
          <line x1="2" y1="10" x2="22" y2="10" />
        </svg>
      ),
    },
    {
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
  ];

  return (
    <aside style={{
      width: 240, height: '100%', minHeight: '100vh', background: '#111827',
      display: 'flex', flexDirection: 'column', flexShrink: 0,
      borderRight: '1px solid #1F2937',
    }}>
      {/* Logo */}
      <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid #1F2937' }}>
        <div style={{ fontWeight: 900, fontSize: 20, color: '#fff', letterSpacing: -0.5 }}>
          Miracl<span style={{ color: '#F5A623' }}>Bet</span>
          <span style={{ marginLeft: 8, background: '#F5A623', color: '#111827', padding: '2px 7px', borderRadius: 5, fontSize: 9, fontWeight: 900, letterSpacing: 0.5 }}>AGENT POS</span>
        </div>
        <div style={{ color: '#9CA3AF', fontSize: 11, marginTop: 4 }}>Cashier: {agent.phone}</div>
      </div>

      {/* Nav items */}
      <nav style={{ flex: 1, padding: '12px 12px' }}>
        {navItems.map(item => {
          const isActive = active === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNav(item.id)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                padding: '13px 14px', borderRadius: 10, border: 'none', marginBottom: 4,
                background: isActive ? '#F5A623' : 'transparent',
                color: isActive ? '#111827' : '#9CA3AF',
                fontWeight: isActive ? 800 : 600, fontSize: 14,
                cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
              }}
            >
              {item.icon}
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* Bottom: logout */}
      <div style={{ padding: '16px 12px', borderTop: '1px solid #1F2937' }}>
        <button
          onClick={onLogout}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 12,
            padding: '11px 14px', borderRadius: 10, border: 'none',
            background: 'transparent', color: '#EF4444', fontWeight: 700,
            fontSize: 14, cursor: 'pointer', textAlign: 'left',
          }}
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          Logout
        </button>
      </div>
    </aside>
  );
}

/* ─── Main Agent Page ────────────────────────────────────── */
export default function AgentPage() {
  const router = useRouter();
  const [agent, setAgent] = useState<AgentSession | null>(null);
  const [activeView, setActiveView] = useState<ActiveView>('place-bet');
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('miraclbet_user');
    if (!saved) { router.push('/login'); return; }
    const u = JSON.parse(saved);
    if (u.role !== 'AGENT' && u.role !== 'ADMIN') { router.push('/'); return; }
    setAgent(u);
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('miraclbet_user');
    router.push('/login');
  };

  const handleNav = (view: ActiveView) => {
    setActiveView(view);
    setDrawerOpen(false);
  };

  if (!agent) return null;

  const pageTitle = activeView === 'place-bet' ? '🖨️ Place Bet & Print Ticket' : '🎟️ My Tickets';

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#F3F4F6', fontFamily: 'system-ui, -apple-system, sans-serif' }}>

      {/* Desktop permanent sidebar */}
      <div className="no-print agent-sidebar-desktop">
        <Sidebar active={activeView} onNav={handleNav} agent={agent} onLogout={handleLogout} />
      </div>

      {/* Mobile backdrop */}
      {drawerOpen && (
        <div
          onClick={() => setDrawerOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 40, backdropFilter: 'blur(2px)' }}
        />
      )}

      {/* Mobile slide-in drawer */}
      <div
        className="no-print agent-sidebar-mobile"
        style={{
          position: 'fixed', top: 0, left: 0, height: '100vh', zIndex: 50,
          transform: drawerOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.28s cubic-bezier(0.4,0,0.2,1)',
          boxShadow: drawerOpen ? '4px 0 32px rgba(0,0,0,0.4)' : 'none',
        }}
      >
        {/* Close button inside drawer */}
        <div style={{ position: 'absolute', top: 14, right: -40, zIndex: 60 }}>
          <button onClick={() => setDrawerOpen(false)} style={{ background: '#374151', border: 'none', borderRadius: '50%', width: 32, height: 32, color: '#fff', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            ✕
          </button>
        </div>
        <Sidebar active={activeView} onNav={handleNav} agent={agent} onLogout={handleLogout} />
      </div>

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'auto', minWidth: 0 }}>

        {/* Sticky top header */}
        <div className="no-print" style={{
          background: '#111827', borderBottom: '1px solid #1F2937',
          padding: '0 16px', display: 'flex', alignItems: 'center',
          gap: 10, height: 56, position: 'sticky', top: 0, zIndex: 30,
        }}>
          {/* Hamburger button — mobile only */}
          <button
            className="agent-hamburger"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open menu"
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px 8px', borderRadius: 8, flexDirection: 'column', gap: 5, alignItems: 'center', justifyContent: 'center' }}
          >
            <span style={{ display: 'block', width: 22, height: 2.5, background: '#fff', borderRadius: 2 }} />
            <span style={{ display: 'block', width: 22, height: 2.5, background: '#fff', borderRadius: 2 }} />
            <span style={{ display: 'block', width: 16, height: 2.5, background: '#F5A623', borderRadius: 2 }} />
          </button>

          {/* Mobile logo */}
          <div className="agent-mobile-logo" style={{ fontWeight: 900, fontSize: 16, color: '#fff', flexShrink: 0 }}>
            Miracl<span style={{ color: '#F5A623' }}>Bet</span>
            <span style={{ marginLeft: 5, background: '#F5A623', color: '#111827', padding: '1px 5px', borderRadius: 4, fontSize: 8, fontWeight: 900 }}>AGENT</span>
          </div>

          {/* Page title */}
          <h1 style={{ margin: 0, flex: 1, fontSize: 15, fontWeight: 800, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {pageTitle}
          </h1>

          {/* Agent phone badge */}
          <div style={{ fontSize: 11, color: '#9CA3AF', background: '#1F2937', padding: '5px 10px', borderRadius: 8, fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0 }}>
            {agent.phone}
          </div>
        </div>

        {/* Page content */}
        <div style={{ flex: 1, padding: '20px 16px' }}>
          {activeView === 'place-bet' && <PlaceBetView agent={agent} />}
          {activeView === 'my-tickets' && <MyTicketsView agent={agent} />}
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        /* Desktop (≥768px): permanent sidebar visible, hamburger hidden */
        @media (min-width: 768px) {
          .agent-sidebar-desktop { display: block !important; }
          .agent-sidebar-mobile  { display: none   !important; }
          .agent-hamburger       { display: none   !important; }
          .agent-mobile-logo     { display: none   !important; }
        }
        /* Mobile (<768px): sidebar hidden, hamburger shown */
        @media (max-width: 767px) {
          .agent-sidebar-desktop { display: none  !important; }
          .agent-sidebar-mobile  { display: block !important; }
          .agent-hamburger       { display: flex  !important; }
          .agent-mobile-logo     { display: block !important; }
        }
        @media print {
          .no-print { display: none !important; }
          body * { visibility: hidden; }
          .print-receipt, .print-receipt * { visibility: visible; }
          .print-receipt { position: fixed; left: 0; top: 0; width: 80mm; padding: 10px; box-shadow: none !important; }
        }
      `}} />
    </div>
  );
}
"""

content = before + new_tail

with open(r'apps\web\app\agent\page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("SUCCESS")
