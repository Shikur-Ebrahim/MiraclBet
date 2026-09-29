import re

with open(r'apps\web\app\agent\page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix the QRCode syntax
content = content.replace(
    '<QRCode value={https://www.miraclbet.com/check?code=TICKET-} size={120} level="M" />',
    '<QRCode value={`https://www.miraclbet.com/check?code=TICKET-${placedTicketId.substring(0, 8).toUpperCase()}`} size={120} level="M" />'
)

with open(r'apps\web\app\agent\page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Done")
