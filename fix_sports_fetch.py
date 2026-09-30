import os
import re

file_path = r'apps\web\components\sports\TopLeagues.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace hardcoded SPORTS with dynamic fetch
# We need to add useEffect and useState imports
if 'useState' not in content:
    content = content.replace("import React from 'react';", "import React, { useState, useEffect } from 'react';")

# We need to inject the fetch logic into the SportsNav component
component_start = content.find('export function SportsNav')
return_start = content.find('return (', component_start)

# Define the dynamic fetch logic
fetch_logic = """
  const [sportsList, setSportsList] = useState<{ slug: string; name: string; emoji: string; count: number }[]>([]);

  useEffect(() => {
    const fetchSports = async () => {
      try {
        const API = process.env.NEXT_PUBLIC_API_URL || 'https://api.miraclbet.com:8443';
        const url = new URL(`${API}/api/v1/meta/sports`);
        if (activeTab === 'live') {
          url.searchParams.set('live', 'true');
        } else if (timeRange !== undefined) {
          url.searchParams.set('days', String(timeRange));
        }
        const res = await fetch(url.toString());
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            setSportsList(data);
            return;
          }
        }
      } catch (err) {
        console.error('Failed to fetch sports', err);
      }
      // Fallback
      setSportsList([
        { slug: 'football',   name: 'Football',   emoji: '⚽', count: 0 },
        { slug: 'hockey',     name: 'Hockey',     emoji: '🏒', count: 0 },
        { slug: 'tennis',     name: 'Tennis',     emoji: '🎾', count: 0 },
        { slug: 'basketball', name: 'Basketball', emoji: '🏀', count: 0 },
        { slug: 'baseball',   name: 'Baseball',   emoji: '⚾', count: 0 },
      ]);
    };
    fetchSports();
  }, [activeTab, timeRange]);

  const isLive = activeTab === 'live';
"""

# Replace the old `const isLive = activeTab === 'live';`
content = re.sub(r'const isLive = activeTab === \'live\';\s*', '', content)

# Inject the fetch logic
content = content[:return_start] + fetch_logic + content[return_start:]

# Replace SPORTS.map with sportsList.map
content = content.replace('SPORTS.map((sport)', 'sportsList.map((sport)')
content = content.replace('sport.key', 'sport.slug')
content = content.replace('sport.label', 'sport.name')
content = content.replace('sport.icon', 'sport.emoji')

# Remove the old const SPORTS array
content = re.sub(r'const SPORTS = \[\s*(?:\{.*\},\s*)*\];', '', content, flags=re.MULTILINE)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated TopLeagues.tsx")
