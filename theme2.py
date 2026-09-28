import os

path = r'C:\Users\hp\Desktop\miraclbet\apps\web\app\admin\manual-bet\page.tsx'
with open(path, 'r', encoding='utf-8') as f:
    text = f.read()

# Fix icon back button
text = text.replace(
    \"color: '#9CA3AF', cursor: 'pointer'\",
    \"color: '#4B5563', cursor: 'pointer'\"
)
# Total Odds text
text = text.replace(
    \"<span style={{ color: '#9CA3AF', fontSize: 13, fontWeight: 600 }}>Total Odds</span>\",
    \"<span style={{ color: '#4B5563', fontSize: 13, fontWeight: 600 }}>Total Odds</span>\"
)
# Match number text
text = text.replace(
    \"<span style={{ color: '#19E66B', fontWeight: 800, fontSize: 13 }}>MATCH {i + 1}</span>\",
    \"<span style={{ color: '#059669', fontWeight: 800, fontSize: 13 }}>MATCH {i + 1}</span>\"
)
# Odds value text
text = text.replace(
    \"color: '#19E66B', fontSize: 16, fontWeight: 800\",
    \"color: '#059669', fontSize: 16, fontWeight: 800\"
)
text = text.replace(
    \"<span style={{ color: '#19E66B', fontSize: 20, fontWeight: 900 }}>{totalOdds.toFixed(2)}</span>\",
    \"<span style={{ color: '#059669', fontSize: 20, fontWeight: 900 }}>{totalOdds.toFixed(2)}</span>\"
)
# Add match button
text = text.replace(
    \"style={{ width: '100%', padding: '11px', background: 'transparent', border: '1px dashed #374151', borderRadius: 10, color: '#6B7280'\",
    \"style={{ width: '100%', padding: '11px', background: 'transparent', border: '1px dashed #D1D5DB', borderRadius: 10, color: '#4B5563'\"
)
# Generate code section
text = text.replace(
    \"background: 'linear-gradient(135deg, #0D2219, #092016)', borderRadius: 14, border: '1px solid #19E66B55'\",
    \"background: '#F0FDF4', borderRadius: 14, border: '1px solid #86EFAC'\"
)
text = text.replace(
    \"<p style={{ color: '#9CA3AF', fontSize: 11, fontWeight: 700, letterSpacing: 2, marginBottom: 8 }}>? ADMIN TICKET CODE</p>\",
    \"<p style={{ color: '#065F46', fontSize: 11, fontWeight: 700, letterSpacing: 2, marginBottom: 8 }}>? ADMIN TICKET CODE</p>\"
)
text = text.replace(
    \"<div style={{ color: '#19E66B', fontSize: 32, fontWeight: 900, letterSpacing: 8, fontFamily: 'monospace', marginBottom: 12 }}>{generatedCode}</div>\",
    \"<div style={{ color: '#047857', fontSize: 32, fontWeight: 900, letterSpacing: 8, fontFamily: 'monospace', marginBottom: 12 }}>{generatedCode}</div>\"
)
# Loading text
text = text.replace(
    \"color: loading ? '#9CA3AF' : '#000'\",
    \"color: loading ? '#9CA3AF' : '#ffffff'\"
)

with open(path, 'w', encoding='utf-8') as f:
    f.write(text)
