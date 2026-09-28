const fs = require('fs');

const path = 'apps/web/app/admin/manual-bet/page.tsx';
let text = fs.readFileSync(path, 'utf-8');

text = text.replace(
    /color: '#9CA3AF', cursor: 'pointer'/g,
    "color: '#4B5563', cursor: 'pointer'"
);
text = text.replace(
    /<span style={{ color: '#9CA3AF', fontSize: 13, fontWeight: 600 }}>Total Odds<\/span>/g,
    "<span style={{ color: '#4B5563', fontSize: 13, fontWeight: 600 }}>Total Odds</span>"
);
text = text.replace(
    /<span style={{ color: '#19E66B', fontWeight: 800, fontSize: 13 }}>MATCH \{i \+ 1\}<\/span>/g,
    "<span style={{ color: '#059669', fontWeight: 800, fontSize: 13 }}>MATCH {i + 1}</span>"
);
text = text.replace(
    /color: '#19E66B', fontSize: 16, fontWeight: 800/g,
    "color: '#059669', fontSize: 16, fontWeight: 800"
);
text = text.replace(
    /<span style={{ color: '#19E66B', fontSize: 20, fontWeight: 900 }}>\{totalOdds.toFixed\(2\)\}<\/span>/g,
    "<span style={{ color: '#059669', fontSize: 20, fontWeight: 900 }}>{totalOdds.toFixed(2)}</span>"
);
text = text.replace(
    /style={{ width: '100%', padding: '11px', background: 'transparent', border: '1px dashed #374151', borderRadius: 10, color: '#6B7280'/g,
    "style={{ width: '100%', padding: '11px', background: 'transparent', border: '1px dashed #D1D5DB', borderRadius: 10, color: '#4B5563'"
);
text = text.replace(
    /background: 'linear-gradient\(135deg, #0D2219, #092016\)', borderRadius: 14, border: '1px solid #19E66B55'/g,
    "background: '#F0FDF4', borderRadius: 14, border: '1px solid #86EFAC'"
);
text = text.replace(
    /<p style={{ color: '#9CA3AF', fontSize: 11, fontWeight: 700, letterSpacing: 2, marginBottom: 8 }}>/g,
    "<p style={{ color: '#065F46', fontSize: 11, fontWeight: 700, letterSpacing: 2, marginBottom: 8 }}>"
);
text = text.replace(
    /<div style={{ color: '#19E66B', fontSize: 32, fontWeight: 900, letterSpacing: 8, fontFamily: 'monospace', marginBottom: 12 }}>\{generatedCode\}<\/div>/g,
    "<div style={{ color: '#047857', fontSize: 32, fontWeight: 900, letterSpacing: 8, fontFamily: 'monospace', marginBottom: 12 }}>{generatedCode}</div>"
);

fs.writeFileSync(path, text, 'utf-8');
