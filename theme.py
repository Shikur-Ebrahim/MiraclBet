import os

path = r'C:\Users\hp\Desktop\miraclbet\apps\web\app\admin\manual-bet\page.tsx'
with open(path, 'r', encoding='utf-8') as f:
    text = f.read()

# Replace main background
text = text.replace(
    "<div style={{ minHeight: '100vh', background: '#0A0E1A', padding: '20px 16px' }}>",
    "<div style={{ minHeight: '100vh', background: '#F9FAFB', padding: '20px 16px' }}>"
)

# Header text
text = text.replace(
    "<h1 style={{ color: '#fff', fontWeight: 900, fontSize: 20, margin: 0 }}>Create Admin Ticket</h1>",
    "<h1 style={{ color: '#111827', fontWeight: 900, fontSize: 20, margin: 0 }}>Create Admin Ticket</h1>"
)
text = text.replace(
    "<p style={{ color: '#9CA3AF', fontSize: 12, margin: 0 }}>All bets on this code win automatically when matches finish</p>",
    "<p style={{ color: '#6B7280', fontSize: 12, margin: 0 }}>All bets on this code win automatically when matches finish</p>"
)

# Zap box text
text = text.replace(
    "<strong style={{ color: '#fff' }}>WON</strong>",
    "<strong style={{ color: '#111827' }}>WON</strong>"
)
text = text.replace(
    "<div style={{ fontSize: 12, color: '#9CA3AF' }}>",
    "<div style={{ fontSize: 12, color: '#4B5563' }}>"
)

# Card background
text = text.replace(
    "<div key={i} style={{ background: '#111827', borderRadius: 14, border: '1px solid #1E293B', padding: 16, marginBottom: 14 }}>",
    "<div key={i} style={{ background: '#ffffff', borderRadius: 14, border: '1px solid #E5E7EB', padding: 16, marginBottom: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>"
)

# Label colors
text = text.replace("color: '#9CA3AF', fontWeight: 700", "color: '#4B5563', fontWeight: 700")

# Input backgrounds
text = text.replace(
    "background: '#0A0E1A', border: '1px solid #1E293B', borderRadius: 8, padding: '9px 12px', color: '#fff'",
    "background: '#ffffff', border: '1px solid #D1D5DB', borderRadius: 8, padding: '9px 12px', color: '#111827'"
)
text = text.replace("colorScheme: 'dark'", "colorScheme: 'light'")

# Dropdown vs box
text = text.replace(
    "<div style={{ background: '#0A0E1A', padding: '10px 14px', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, border: '1px solid #1E293B' }}>",
    "<div style={{ background: '#F3F4F6', padding: '10px 14px', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, border: '1px solid #E5E7EB' }}>"
)
text = text.replace(
    "<div style={{ color: '#fff', fontWeight: 800, fontSize: 13 }}>{leg.matchName || 'vs'}</div>",
    "<div style={{ color: '#111827', fontWeight: 800, fontSize: 13 }}>{leg.matchName || 'vs'}</div>"
)
text = text.replace("background: '#1E293B'", "background: '#D1D5DB'")

# Total odds card
text = text.replace(
    "<div style={{ background: '#111827', borderRadius: 10, padding: '12px 16px', marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #1E293B' }}>",
    "<div style={{ background: '#ffffff', borderRadius: 10, padding: '12px 16px', marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>"
)

# New ticket button
text = text.replace(
    "background: '#1E293B', border: '1px solid #374151', borderRadius: 8, color: '#fff'",
    "background: '#F3F4F6', border: '1px solid #D1D5DB', borderRadius: 8, color: '#111827'"
)

with open(path, 'w', encoding='utf-8') as f:
    f.write(text)
