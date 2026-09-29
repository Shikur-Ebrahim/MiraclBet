import re

with open(r'apps\web\app\bets\page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add import
if 'import QRCode from' not in content:
    content = content.replace("import { useRouter } from 'next/navigation';", "import { useRouter } from 'next/navigation';\nimport QRCode from 'react-qr-code';")

old = r'''              {/* Fake Barcode for visual flair */}
              <div style={{ marginTop: 20, textAlign: 'center' }}>
                <div style={{ display: 'inline-flex', height: 40, opacity: 0.5 }}>
                  {[...Array(30)].map((_, i) => (
                    <div key={i} style={{ width: Math.random() > 0.5 ? 3 : 1.5, background: '#374151', marginRight: 2 }} />
                  ))}
                </div>
                <div style={{ color: '#6B7280', fontSize: 10, letterSpacing: 2, marginTop: 4, fontFamily: 'monospace' }}>
                  TICKET-{slip.id.slice(0, 12).toUpperCase()}
                </div>
              </div>'''

new = r'''              {/* QR Code */}
              <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ padding: 8, background: '#fff', borderRadius: 8 }}>
                  <QRCode value={`https://www.miraclbet.com/check?code=TICKET-${slip.id.slice(0, 12).toUpperCase()}`} size={120} level="M" />
                </div>
                <div style={{ color: '#6B7280', fontSize: 10, letterSpacing: 2, marginTop: 8, fontFamily: 'monospace' }}>
                  TICKET-{slip.id.slice(0, 12).toUpperCase()}
                </div>
              </div>'''

if old in content:
    content = content.replace(old, new)
    with open(r'apps\web\app\bets\page.tsx', 'w', encoding='utf-8') as f:
        f.write(content)
    print("SUCCESS: Barcode replaced in bets/page.tsx")
else:
    print("ERROR: block not found")
