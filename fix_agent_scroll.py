with open(r'apps\web\app\agent\page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Fix Sidebar style
content = content.replace(
    "width: 240, height: '100%', minHeight: '100vh', background: '#111827',",
    "width: 240, height: '100%', background: '#111827',"
)

# 2. Fix AgentPage wrapper style
content = content.replace(
    "display: 'flex', minHeight: '100vh', background: '#F3F4F6', fontFamily: 'system-ui, -apple-system, sans-serif'",
    "display: 'flex', height: '100vh', overflow: 'hidden', background: '#F3F4F6', fontFamily: 'system-ui, -apple-system, sans-serif'"
)

# 3. Desktop sidebar class (ensure it fills height)
if '.agent-sidebar-desktop { display: block !important; }' in content:
    content = content.replace(
        '.agent-sidebar-desktop { display: block !important; }',
        '.agent-sidebar-desktop { display: block !important; height: 100%; flex-shrink: 0; }'
    )
    print("Updated CSS rules")

with open(r'apps\web\app\agent\page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("SUCCESS")
