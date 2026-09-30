import os
import re

# 1. Update layout.tsx
layout_path = r'apps\web\app\layout.tsx'
with open(layout_path, 'r', encoding='utf-8') as f:
    layout_content = f.read()

layout_content = layout_content.replace(
    "import { BottomNav } from '@/components/layout/BottomNav';",
    "import { BottomNav } from '@/components/layout/BottomNav';\nimport { RightSidebar } from '@/components/layout/RightSidebar';"
)

layout_content = layout_content.replace(
    '<main className="flex-1 md:pl-64">{children}</main>',
    '<main className="flex-1 md:pl-64 md:pr-[280px]">{children}</main>'
)

layout_content = layout_content.replace(
    '<BottomNav />',
    '<RightSidebar />\n        <BottomNav />'
)

with open(layout_path, 'w', encoding='utf-8') as f:
    f.write(layout_content)
print("Updated layout.tsx")


# 2. Update BottomNav.tsx
bottom_nav_path = r'apps\web\components\layout\BottomNav.tsx'
with open(bottom_nav_path, 'r', encoding='utf-8') as f:
    bn = f.read()

# Find the desktop toolbar section and remove it
desktop_toolbar_start = bn.find('{/* Desktop bottom toolbar')
if desktop_toolbar_start != -1:
    bn = bn[:desktop_toolbar_start].strip() + "\n    </>\n  );\n}\n"

with open(bottom_nav_path, 'w', encoding='utf-8') as f:
    f.write(bn)
print("Updated BottomNav.tsx")


# 3. Update Sidebar.tsx
sidebar_path = r'apps\web\components\layout\Sidebar.tsx'
with open(sidebar_path, 'r', encoding='utf-8') as f:
    sb = f.read()

sb = sb.replace('md:bottom-[54px]', 'md:bottom-0')
sb = sb.replace('md:pb-[54px]', 'md:pb-6')

with open(sidebar_path, 'w', encoding='utf-8') as f:
    f.write(sb)
print("Updated Sidebar.tsx")
