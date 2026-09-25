export function Header() {
  return (
    <header style={{ 
      position: 'sticky', 
      top: 0, 
      zIndex: 9999, 
      background: '#0A0E1A', 
      borderBottom: '1px solid #1E293B',
      width: '100%'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', height: '56px' }}>

        {/* Logo */}
        <a href="/" style={{ textDecoration: 'none', fontSize: '22px', fontWeight: 900, letterSpacing: '-0.5px', lineHeight: 1, userSelect: 'none' }}>
          <span style={{ color: '#FFFFFF' }}>Miracl</span>
          <span style={{ color: '#19E66B' }}>Bet</span>
        </a>

        {/* Auth Buttons */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <a
            href="/login"
            style={{
              textDecoration: 'none',
              padding: '7px 16px',
              fontSize: '13px',
              fontWeight: 600,
              color: '#FFFFFF',
              border: '1px solid rgba(255,255,255,0.4)',
              borderRadius: '6px',
              display: 'inline-block',
              whiteSpace: 'nowrap',
            }}
          >
            Log In
          </a>
          <a
            href="/register"
            style={{
              textDecoration: 'none',
              padding: '7px 16px',
              fontSize: '13px',
              fontWeight: 700,
              color: '#000000',
              background: '#F5A623',
              borderRadius: '6px',
              display: 'inline-block',
              whiteSpace: 'nowrap',
            }}
          >
            Registration
          </a>
        </div>

      </div>
    </header>
  );
}
