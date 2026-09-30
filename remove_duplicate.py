with open(r'apps\web\app\agent\page.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

total = len(lines)
print(f"Total lines: {total}")

# Remove lines 1002 to 1250 (0-indexed: 1001 to 1249)
# These are the duplicate ReportsView block
cleaned = lines[:1001] + lines[1250:]

with open(r'apps\web\app\agent\page.tsx', 'w', encoding='utf-8') as f:
    f.writelines(cleaned)
print(f"Done - new total: {len(cleaned)}")
