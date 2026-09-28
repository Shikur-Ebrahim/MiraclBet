import random

prefixes = ['FC', 'Sporting', 'Dynamo', 'Lokomotiv', 'Spartak', 'Rapid', 'Atletico', 'Real', 'Inter', 'AC']
suffixes = ['United', 'City', 'Rovers', 'Wanderers', 'Athletic', 'Town', 'Villa', 'Boys', 'Stars', 'Warriors']

countries_map = {
    'Ethiopia': ('Addis Ababa', 'Mekelle', 'Dire Dawa', 'Gondar', 'Awassa', 'Bahir Dar', 'Dessie', 'Jimma', 'Jijiga', 'Shashamane'),
    'Kenya': ('Nairobi', 'Mombasa', 'Kisumu', 'Nakuru', 'Eldoret', 'Thika', 'Malindi', 'Kitale', 'Garissa', 'Kakamega'),
    'Uganda': ('Kampala', 'Gulu', 'Lira', 'Mbarara', 'Jinja', 'Boma', 'Masaka', 'Mbale', 'Kasese', 'Hoima'),
    'Tanzania': ('Dar es Salaam', 'Mwanza', 'Arusha', 'Dodoma', 'Mbeya', 'Morogoro', 'Tanga', 'Kahama', 'Tabora', 'Zanzibar'),
    'Estonia': ('Tallinn', 'Tartu', 'Narva', 'Parnu', 'Kohtla-Jarve', 'Viljandi', 'Rakvere', 'Maardu', 'Sillamae', 'Kuressaare'),
    'Latvia': ('Riga', 'Daugavpils', 'Liepaja', 'Jelgava', 'Jurmala', 'Ventspils', 'Rezekne', 'Valmiera', 'Ogre', 'Jekabpils'),
    'Lithuania': ('Vilnius', 'Kaunas', 'Klaipeda', 'Siauliai', 'Panevezys', 'Alytus', 'Marijampole', 'Mazeikiai', 'Jonava', 'Utena'),
    'Malta': ('Valletta', 'Birkirkara', 'Mosta', 'Sliema', 'Qormi', 'Zabbar', 'Naxxar', 'San Gwann', 'Zejtun', 'Hamrun'),
    'Vietnam': ('Hanoi', 'Saigon', 'Da Nang', 'Haiphong', 'Can Tho', 'Bien Hoa', 'Hue', 'Nha Trang', 'Vinh', 'Vung Tau'),
    'Thailand': ('Bangkok', 'Chiang Mai', 'Pattaya', 'Phuket', 'Hat Yai', 'Nakhon Ratchasima', 'Udon Thani', 'Surat Thani', 'Khon Kaen', 'Nakhon Si Thammarat'),
    'Indonesia': ('Jakarta', 'Surabaya', 'Bandung', 'Medan', 'Bekasi', 'Semarang', 'Tangerang', 'Depok', 'Palembang', 'Makassar')
}

flags_map = {
    'Ethiopia': 'https://media.api-sports.io/flags/et.svg',
    'Kenya': 'https://media.api-sports.io/flags/ke.svg',
    'Uganda': 'https://media.api-sports.io/flags/ug.svg',
    'Tanzania': 'https://media.api-sports.io/flags/tz.svg',
    'Estonia': 'https://media.api-sports.io/flags/ee.svg',
    'Latvia': 'https://media.api-sports.io/flags/lv.svg',
    'Lithuania': 'https://media.api-sports.io/flags/lt.svg',
    'Malta': 'https://media.api-sports.io/flags/mt.svg',
    'Vietnam': 'https://media.api-sports.io/flags/vn.svg',
    'Thailand': 'https://media.api-sports.io/flags/th.svg',
    'Indonesia': 'https://media.api-sports.io/flags/id.svg'
}

sql_lines = [
    '-- Insert 300 smaller/unknown teams for MiraclBet Manual Bets',
    'INSERT INTO saved_teams (api_id, name, logo, country, country_flag) VALUES'
]

api_id = 10000
values = []
for _ in range(300):
    country = random.choice(list(countries_map.keys()))
    city = random.choice(countries_map[country])
    
    pattern = random.choice([1, 2, 3])
    if pattern == 1:
        name = f"{random.choice(prefixes)} {city}"
    elif pattern == 2:
        name = f"{city} {random.choice(suffixes)}"
    else:
        name = f"{city} {random.choice(['FC', 'SC', 'United'])}"
        
    logo = f"https://media.api-sports.io/football/teams/{api_id}.png"
    flag = flags_map[country]
    
    # Escape quotes
    name = name.replace("'", "''")
    
    values.append(f"({api_id}, '{name}', '{logo}', '{country}', '{flag}')")
    api_id += 1

sql_lines.append(',\n'.join(values) + ';\n')

with open('seed_teams.sql', 'w', encoding='utf-8') as f:
    f.write('\n'.join(sql_lines))

print('Generated seed_teams.sql')
