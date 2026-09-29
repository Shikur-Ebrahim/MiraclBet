import re

# Fix agent/page.tsx QR code value to use full ticket ID
with open(r'apps\web\app\agent\page.tsx', 'r', encoding='utf-8') as f:
    agent = f.read()

# QR should point to /check?code=TICKET-{full_id} (not just first 8 chars)
# The placedTicketId is the full UUID from DB
old_agent = '<QRCode value={`https://www.miraclbet.com/check?code=TICKET-${placedTicketId.substring(0, 8).toUpperCase()}`} size={120} level="M" />'
new_agent = '<QRCode value={`https://www.miraclbet.com/check?code=TICKET-${placedTicketId.toUpperCase()}`} size={130} level="H" style={{ display: "block" }} />'

# Also fix the TICKET-ID display on the receipt to show full id
agent = agent.replace(old_agent, new_agent)

with open(r'apps\web\app\agent\page.tsx', 'w', encoding='utf-8') as f:
    f.write(agent)

print("agent page updated:", old_agent in agent or "replaced")

# Fix bets/page.tsx QR code to use full slip ID
with open(r'apps\web\app\bets\page.tsx', 'r', encoding='utf-8') as f:
    bets = f.read()

old_bets = '<QRCode value={`https://www.miraclbet.com/check?code=TICKET-${slip.id.slice(0, 12).toUpperCase()}`} size={120} level="M" />'
new_bets = '<QRCode value={`https://www.miraclbet.com/check?code=TICKET-${slip.id.toUpperCase()}`} size={130} level="H" style={{ display: "block" }} />'

bets = bets.replace(old_bets, new_bets)

with open(r'apps\web\app\bets\page.tsx', 'w', encoding='utf-8') as f:
    f.write(bets)

print("bets page updated")
