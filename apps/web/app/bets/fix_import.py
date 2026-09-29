import re

with open(r'apps\web\app\bets\page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add import
if 'import QRCode from' not in content:
    content = content.replace("import { useRouter } from 'next/navigation';", "import { useRouter } from 'next/navigation';\nimport QRCode from 'react-qr-code';")

with open(r'apps\web\app\bets\page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("SUCCESS")
