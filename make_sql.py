import json

flags_map = {
    'England': 'https://media.api-sports.io/flags/gb-eng.svg',
    'Spain': 'https://media.api-sports.io/flags/es.svg',
    'Italy': 'https://media.api-sports.io/flags/it.svg',
    'Germany': 'https://media.api-sports.io/flags/de.svg',
    'France': 'https://media.api-sports.io/flags/fr.svg',
    'Portugal': 'https://media.api-sports.io/flags/pt.svg',
    'Netherlands': 'https://media.api-sports.io/flags/nl.svg',
    'Brazil': 'https://media.api-sports.io/flags/br.svg',
    'Argentina': 'https://media.api-sports.io/flags/ar.svg',
    'USA': 'https://media.api-sports.io/flags/us.svg',
    'Canada': 'https://media.api-sports.io/flags/ca.svg',
    'Scotland': 'https://media.api-sports.io/flags/gb-sct.svg',
    'Turkey': 'https://media.api-sports.io/flags/tr.svg',
    'Mexico': 'https://media.api-sports.io/flags/mx.svg',
    'Russia': 'https://media.api-sports.io/flags/ru.svg',
    'Belgium': 'https://media.api-sports.io/flags/be.svg',
    'Wales': 'https://media.api-sports.io/flags/gb-wls.svg',
    'Monaco': 'https://media.api-sports.io/flags/mc.svg',
}

with open('teams.json', 'r', encoding='utf-8') as f:
    teams = json.load(f)

# Sort teams to make sure we don't insert duplicate IDs if TheSportsDB gives same team in multiple leagues
unique_teams = {}
for t in teams:
    unique_teams[t['id']] = t

teams = list(unique_teams.values())

# Limit to 300
teams = teams[:300]

sql_lines = [
    '-- Insert 300 real international teams for MiraclBet Manual Bets',
    'INSERT INTO saved_teams (api_id, name, logo, country, country_flag) VALUES'
]

values = []
for t in teams:
    api_id = int(t['id'])
    name = t['name'].replace("'", "''")
    logo = t['logo'] or f"https://media.api-sports.io/football/teams/{api_id}.png"
    country = t['country']
    flag = flags_map.get(country, 'https://media.api-sports.io/flags/un.svg') # UN flag or blank if not found
    
    values.append(f"({api_id}, '{name}', '{logo}', '{country}', '{flag}')")

sql_lines.append(',\n'.join(values) + ';\n')

with open('seed_real_teams.sql', 'w', encoding='utf-8') as f:
    f.write('\n'.join(sql_lines))

print(f'Generated seed_real_teams.sql with {len(teams)} teams.')
