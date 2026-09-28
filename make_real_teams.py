teams = [
    # England (40)
    'Arsenal', 'Aston Villa', 'Bournemouth', 'Brentford', 'Brighton', 'Burnley', 'Chelsea', 'Crystal Palace', 'Everton', 'Fulham', 'Liverpool', 'Luton Town', 'Manchester City', 'Manchester United', 'Newcastle United', 'Nottingham Forest', 'Sheffield United', 'Tottenham Hotspur', 'West Ham United', 'Wolverhampton Wanderers',
    'Leicester City', 'Leeds United', 'Southampton', 'Norwich City', 'Watford', 'Sunderland', 'Middlesbrough', 'West Bromwich Albion', 'Stoke City', 'Swansea City', 'Cardiff City', 'Hull City', 'Queens Park Rangers', 'Bolton Wanderers', 'Blackburn Rovers', 'Portsmouth', 'Birmingham City', 'Derby County', 'Charlton Athletic', 'Wigan Athletic',
    # Spain (30)
    'Real Madrid', 'Barcelona', 'Atletico Madrid', 'Sevilla', 'Real Sociedad', 'Villarreal', 'Real Betis', 'Athletic Club', 'Valencia', 'Osasuna', 'Celta Vigo', 'Rayo Vallecano', 'Girona', 'Mallorca', 'Getafe', 'Cadiz', 'Almeria', 'Granada', 'Las Palmas', 'Alaves', 'Espanyol', 'Levante', 'Elche', 'Valladolid', 'Eibar', 'Malaga', 'Deportivo La Coruna', 'Zaragoza', 'Sporting Gijon', 'Racing Santander',
    # Italy (30)
    'Napoli', 'Lazio', 'Inter Milan', 'AC Milan', 'Atalanta', 'Roma', 'Juventus', 'Fiorentina', 'Bologna', 'Torino', 'Monza', 'Udinese', 'Sassuolo', 'Empoli', 'Salernitana', 'Lecce', 'Verona', 'Frosinone', 'Genoa', 'Cagliari', 'Sampdoria', 'Parma', 'Palermo', 'Bari', 'Brescia', 'Chievo', 'Catania', 'Siena', 'Livorno', 'Reggina',
    # Germany (30)
    'Bayern Munich', 'Borussia Dortmund', 'RB Leipzig', 'Union Berlin', 'Freiburg', 'Bayer Leverkusen', 'Eintracht Frankfurt', 'Wolfsburg', 'Mainz 05', 'Borussia Monchengladbach', 'Koln', 'Hoffenheim', 'Werder Bremen', 'Bochum', 'Augsburg', 'Stuttgart', 'Heidenheim', 'Darmstadt', 'Schalke 04', 'Hertha BSC', 'Hamburger SV', 'Hannover 96', 'Nurnberg', 'Kaiserslautern', 'Arminia Bielefeld', 'Greuther Furth', 'Paderborn', 'Fortuna Dusseldorf', 'Ingolstadt', 'Braunschweig',
    # France (30)
    'Paris Saint-Germain', 'Lens', 'Marseille', 'Rennes', 'Lille', 'Monaco', 'Lyon', 'Clermont', 'Nice', 'Lorient', 'Reims', 'Montpellier', 'Toulouse', 'Brest', 'Strasbourg', 'Nantes', 'Le Havre', 'Metz', 'Bordeaux', 'Saint-Etienne', 'Angers', 'Troyes', 'Ajaccio', 'Auxerre', 'Guingamp', 'Dijon', 'Amiens', 'Nimes', 'Caen', 'Evian',
    # Portugal (20)
    'Benfica', 'Porto', 'Braga', 'Sporting CP', 'Vitoria de Guimaraes', 'Arouca', 'Chaves', 'Famalicao', 'Boavista', 'Casa Pia', 'Vizela', 'Rio Ave', 'Gil Vicente', 'Estoril', 'Portimonense', 'Moreirense', 'Farense', 'Estrela da Amadora', 'Belenenses', 'Maritimo',
    # Netherlands (20)
    'Feyenoord', 'PSV Eindhoven', 'Ajax', 'AZ Alkmaar', 'Twente', 'Sparta Rotterdam', 'Utrecht', 'Heerenveen', 'RKC Waalwijk', 'Vitesse', 'Go Ahead Eagles', 'NEC Nijmegen', 'Fortuna Sittard', 'Volendam', 'Excelsior', 'Almere City', 'Heracles Almelo', 'PEC Zwolle', 'Groningen', 'Willem II',
    # Belgium (20)
    'Antwerp', 'Genk', 'Union SG', 'Club Brugge', 'Gent', 'Standard Liege', 'Cercle Brugge', 'Charleroi', 'Anderlecht', 'OH Leuven', 'Mechelen', 'Sint-Truiden', 'Kortrijk', 'Eupen', 'Oostende', 'Westerlo', 'RWD Molenbeek', 'Zulte Waregem', 'Beveren', 'Lierse',
    # Turkey (20)
    'Galatasaray', 'Fenerbahce', 'Besiktas', 'Adana Demirspor', 'Istanbul Basaksehir', 'Trabzonspor', 'Kayserispor', 'Konyaspor', 'Fatih Karagumruk', 'Alanyaspor', 'Kasimpasa', 'Antalyaspor', 'Sivasspor', 'Gaziantep', 'Pendikspor', 'Samsunspor', 'Caykur Rizespor', 'Ankaragucu', 'Bursaspor', 'Goztepe',
    # Scotland (10)
    'Celtic', 'Rangers', 'Aberdeen', 'Heart of Midlothian', 'Hibernian', 'St Mirren', 'Motherwell', 'Livingston', 'Kilmarnock', 'Ross County',
    # Brazil (20)
    'Palmeiras', 'Internacional', 'Fluminense', 'Corinthians', 'Flamengo', 'Athletico Paranaense', 'Atletico Mineiro', 'Fortaleza', 'Sao Paulo', 'America Mineiro', 'Botafogo', 'Santos', 'Goias', 'Red Bull Bragantino', 'Coritiba', 'Cuiaba', 'Gremio', 'Bahia', 'Cruzeiro', 'Vasco da Gama',
    # Argentina (20)
    'Boca Juniors', 'Racing Club', 'River Plate', 'Argentinos Juniors', 'Huracan', 'Gimnasia La Plata', 'Defensa y Justicia', 'Tigre', 'Newells Old Boys', 'Estudiantes', 'San Lorenzo', 'Independiente', 'Velez Sarsfield', 'Talleres', 'Rosario Central', 'Lanus', 'Banfield', 'Union', 'Colon', 'Arsenal de Sarandi',
    # USA (10)
    'Los Angeles FC', 'Philadelphia Union', 'CF Montreal', 'Austin FC', 'New York City FC', 'New York Red Bulls', 'FC Dallas', 'LA Galaxy', 'Nashville SC', 'Inter Miami'
]

countries = {
    'England': teams[0:40],
    'Spain': teams[40:70],
    'Italy': teams[70:100],
    'Germany': teams[100:130],
    'France': teams[130:160],
    'Portugal': teams[160:180],
    'Netherlands': teams[180:200],
    'Belgium': teams[200:220],
    'Turkey': teams[220:240],
    'Scotland': teams[240:250],
    'Brazil': teams[250:270],
    'Argentina': teams[270:290],
    'USA': teams[290:300]
}

flags_map = {
    'England': 'https://media.api-sports.io/flags/gb-eng.svg',
    'Spain': 'https://media.api-sports.io/flags/es.svg',
    'Italy': 'https://media.api-sports.io/flags/it.svg',
    'Germany': 'https://media.api-sports.io/flags/de.svg',
    'France': 'https://media.api-sports.io/flags/fr.svg',
    'Portugal': 'https://media.api-sports.io/flags/pt.svg',
    'Netherlands': 'https://media.api-sports.io/flags/nl.svg',
    'Belgium': 'https://media.api-sports.io/flags/be.svg',
    'Turkey': 'https://media.api-sports.io/flags/tr.svg',
    'Scotland': 'https://media.api-sports.io/flags/gb-sct.svg',
    'Brazil': 'https://media.api-sports.io/flags/br.svg',
    'Argentina': 'https://media.api-sports.io/flags/ar.svg',
    'USA': 'https://media.api-sports.io/flags/us.svg'
}

sql_lines = [
    '-- Insert 300 REAL international teams for MiraclBet Manual Bets',
    'INSERT INTO saved_teams (api_id, name, logo, country, country_flag) VALUES'
]

api_id = 1
values = []
for country, country_teams in countries.items():
    for team in country_teams:
        name = team.replace("'", "''")
        logo = f"https://media.api-sports.io/football/teams/{api_id}.png"
        flag = flags_map[country]
        values.append(f"({api_id}, '{name}', '{logo}', '{country}', '{flag}')")
        api_id += 1

sql_lines.append(',\n'.join(values) + ';\n')

with open('real_teams.sql', 'w', encoding='utf-8') as f:
    f.write('\n'.join(sql_lines))

print(f'Generated real_teams.sql with {len(values)} teams')
