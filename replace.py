import os

path = r'C:\Users\hp\Desktop\miraclbet\apps\web\app\admin\manual-bet\page.tsx'
with open(path, 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace(
    'const [copied, setCopied] = useState(false);',
    'const [copied, setCopied] = useState(false);\n  const [savedTeams, setSavedTeams] = useState<any[]>([]);'
)

old_effect = '''  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem('miraclbet_user');
    if (!saved) { router.push('/login'); return; }
    const u = JSON.parse(saved);
    if (u.role !== 'ADMIN') { router.push('/'); }
  }, [router]);'''

new_effect = '''  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem('miraclbet_user');
    if (!saved) { router.push('/login'); return; }
    const u = JSON.parse(saved);
    if (u.role !== 'ADMIN') { router.push('/'); }
    fetch(${API}/api/v1/admin/teams).then(r => r.json()).then(d => setSavedTeams(d || []));
  }, [router]);'''

text = text.replace(old_effect, new_effect)

old_inputs = '''            <div style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 700, display: 'block', marginBottom: 4 }}>MATCH NAME (Home vs Away)</label>
              <input
                value={leg.matchName}
                onChange={e => updateLeg(i, 'matchName', e.target.value)}
                placeholder="e.g. Arsenal vs Chelsea"
                style={{ width: '100%', background: '#0A0E1A', border: '1px solid #1E293B', borderRadius: 8, padding: '9px 12px', color: '#fff', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
              <div>
                <label style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 700, display: 'block', marginBottom: 4 }}>HOME LOGO URL (optional)</label>
                <input
                  value={leg.homeLogo}
                  onChange={e => updateLeg(i, 'homeLogo', e.target.value)}
                  placeholder="https://..."
                  style={{ width: '100%', background: '#0A0E1A', border: '1px solid #1E293B', borderRadius: 8, padding: '9px 12px', color: '#fff', fontSize: 11, outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 700, display: 'block', marginBottom: 4 }}>AWAY LOGO URL (optional)</label>
                <input
                  value={leg.awayLogo}
                  onChange={e => updateLeg(i, 'awayLogo', e.target.value)}
                  placeholder="https://..."
                  style={{ width: '100%', background: '#0A0E1A', border: '1px solid #1E293B', borderRadius: 8, padding: '9px 12px', color: '#fff', fontSize: 11, outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
            </div>'''

new_inputs = '''            {/* Home and Away Selection */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
              <div>
                <label style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 700, display: 'block', marginBottom: 4 }}>HOME TEAM</label>
                <select
                  value={leg.homeLogo}
                  onChange={e => {
                    const t = savedTeams.find(st => st.logo === e.target.value);
                    if (t) {
                      const awayName = leg.matchName.split(' vs ')[1] || 'Away';
                      updateLeg(i, 'matchName', ${t.name} vs );
                      updateLeg(i, 'homeLogo', t.logo);
                    }
                  }}
                  style={{ width: '100%', background: '#0A0E1A', border: '1px solid #1E293B', borderRadius: 8, padding: '9px 12px', color: '#fff', fontSize: 13, outline: 'none' }}
                >
                  <option value="">Select Home Team...</option>
                  {savedTeams.map(t => <option key={h-} value={t.logo}>{t.name} ({t.country})</option>)}
                </select>
              </div>
              
              <div>
                <label style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 700, display: 'block', marginBottom: 4 }}>AWAY TEAM</label>
                <select
                  value={leg.awayLogo}
                  onChange={e => {
                    const t = savedTeams.find(st => st.logo === e.target.value);
                    if (t) {
                      const homeName = leg.matchName.split(' vs ')[0] || 'Home';
                      updateLeg(i, 'matchName', ${homeName} vs );
                      updateLeg(i, 'awayLogo', t.logo);
                    }
                  }}
                  style={{ width: '100%', background: '#0A0E1A', border: '1px solid #1E293B', borderRadius: 8, padding: '9px 12px', color: '#fff', fontSize: 13, outline: 'none' }}
                >
                  <option value="">Select Away Team...</option>
                  {savedTeams.map(t => <option key={-} value={t.logo}>{t.name} ({t.country})</option>)}
                </select>
              </div>
              
              <div style={{ background: '#0A0E1A', padding: '10px 14px', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, border: '1px solid #1E293B' }}>
                {leg.homeLogo ? <img src={leg.homeLogo} width={24} height={24} alt='' /> : <div style={{width: 24, height: 24, borderRadius: '50%', background: '#1E293B'}}/>}
                <div style={{ color: '#fff', fontWeight: 800, fontSize: 13 }}>{leg.matchName || 'vs'}</div>
                {leg.awayLogo ? <img src={leg.awayLogo} width={24} height={24} alt='' /> : <div style={{width: 24, height: 24, borderRadius: '50%', background: '#1E293B'}}/>}
              </div>
            </div>'''

text = text.replace(old_inputs, new_inputs)

with open(path, 'w', encoding='utf-8') as f:
    f.write(text)
