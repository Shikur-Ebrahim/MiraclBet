package database

import (
	"context"
	"log"
)

func SeedTeams(db *DB) {
	var count int
	err := db.Pool.QueryRow(context.Background(), "SELECT count(*) FROM saved_teams").Scan(&count)
	if err != nil {
		log.Printf("[seed] error checking saved_teams: %v", err)
		return
	}

	// Force re-seed if count is less than expected (allows update after code change)
	if count >= 280 {
		return
	}

	log.Println("[seed] clearing and re-seeding international teams...")
	_, _ = db.Pool.Exec(context.Background(), "DELETE FROM saved_teams")

	insertData := []struct {
		apiID         int
		name, logo, country, flag string
	}{
		// 🏴󠁧󠁢󠁥󠁮󠁧󠁿 England – Premier League Top 4
		{1, "Manchester City", "https://media.api-sports.io/football/teams/50.png", "England", "https://media.api-sports.io/flags/gb-eng.svg"},
		{2, "Arsenal", "https://media.api-sports.io/football/teams/42.png", "England", "https://media.api-sports.io/flags/gb-eng.svg"},
		{3, "Liverpool", "https://media.api-sports.io/football/teams/40.png", "England", "https://media.api-sports.io/flags/gb-eng.svg"},
		{4, "Chelsea", "https://media.api-sports.io/football/teams/49.png", "England", "https://media.api-sports.io/flags/gb-eng.svg"},

		// 🇪🇸 Spain – La Liga Top 4
		{5, "Real Madrid", "https://media.api-sports.io/football/teams/541.png", "Spain", "https://media.api-sports.io/flags/es.svg"},
		{6, "Barcelona", "https://media.api-sports.io/football/teams/529.png", "Spain", "https://media.api-sports.io/flags/es.svg"},
		{7, "Atletico Madrid", "https://media.api-sports.io/football/teams/530.png", "Spain", "https://media.api-sports.io/flags/es.svg"},
		{8, "Sevilla", "https://media.api-sports.io/football/teams/536.png", "Spain", "https://media.api-sports.io/flags/es.svg"},

		// 🇮🇹 Italy – Serie A Top 4
		{9, "Juventus", "https://media.api-sports.io/football/teams/496.png", "Italy", "https://media.api-sports.io/flags/it.svg"},
		{10, "AC Milan", "https://media.api-sports.io/football/teams/489.png", "Italy", "https://media.api-sports.io/flags/it.svg"},
		{11, "Inter Milan", "https://media.api-sports.io/football/teams/505.png", "Italy", "https://media.api-sports.io/flags/it.svg"},
		{12, "Napoli", "https://media.api-sports.io/football/teams/492.png", "Italy", "https://media.api-sports.io/flags/it.svg"},

		// 🇩🇪 Germany – Bundesliga Top 4
		{13, "Bayern Munich", "https://media.api-sports.io/football/teams/157.png", "Germany", "https://media.api-sports.io/flags/de.svg"},
		{14, "Borussia Dortmund", "https://media.api-sports.io/football/teams/165.png", "Germany", "https://media.api-sports.io/flags/de.svg"},
		{15, "RB Leipzig", "https://media.api-sports.io/football/teams/173.png", "Germany", "https://media.api-sports.io/flags/de.svg"},
		{16, "Bayer Leverkusen", "https://media.api-sports.io/football/teams/168.png", "Germany", "https://media.api-sports.io/flags/de.svg"},

		// 🇫🇷 France – Ligue 1 Top 4
		{17, "Paris Saint-Germain", "https://media.api-sports.io/football/teams/85.png", "France", "https://media.api-sports.io/flags/fr.svg"},
		{18, "Marseille", "https://media.api-sports.io/football/teams/81.png", "France", "https://media.api-sports.io/flags/fr.svg"},
		{19, "Lyon", "https://media.api-sports.io/football/teams/80.png", "France", "https://media.api-sports.io/flags/fr.svg"},
		{20, "Monaco", "https://media.api-sports.io/football/teams/91.png", "France", "https://media.api-sports.io/flags/fr.svg"},

		// 🇵🇹 Portugal – Primeira Liga Top 4
		{21, "Benfica", "https://media.api-sports.io/football/teams/211.png", "Portugal", "https://media.api-sports.io/flags/pt.svg"},
		{22, "Porto", "https://media.api-sports.io/football/teams/212.png", "Portugal", "https://media.api-sports.io/flags/pt.svg"},
		{23, "Sporting CP", "https://media.api-sports.io/football/teams/228.png", "Portugal", "https://media.api-sports.io/flags/pt.svg"},
		{24, "Braga", "https://media.api-sports.io/football/teams/217.png", "Portugal", "https://media.api-sports.io/flags/pt.svg"},

		// 🇳🇱 Netherlands – Eredivisie Top 4
		{25, "Ajax", "https://media.api-sports.io/football/teams/194.png", "Netherlands", "https://media.api-sports.io/flags/nl.svg"},
		{26, "PSV Eindhoven", "https://media.api-sports.io/football/teams/197.png", "Netherlands", "https://media.api-sports.io/flags/nl.svg"},
		{27, "Feyenoord", "https://media.api-sports.io/football/teams/193.png", "Netherlands", "https://media.api-sports.io/flags/nl.svg"},
		{28, "AZ Alkmaar", "https://media.api-sports.io/football/teams/191.png", "Netherlands", "https://media.api-sports.io/flags/nl.svg"},

		// 🇧🇪 Belgium – First Division Top 4
		{29, "Club Brugge", "https://media.api-sports.io/football/teams/556.png", "Belgium", "https://media.api-sports.io/flags/be.svg"},
		{30, "Anderlecht", "https://media.api-sports.io/football/teams/555.png", "Belgium", "https://media.api-sports.io/flags/be.svg"},
		{31, "Genk", "https://media.api-sports.io/football/teams/557.png", "Belgium", "https://media.api-sports.io/flags/be.svg"},
		{32, "Gent", "https://media.api-sports.io/football/teams/558.png", "Belgium", "https://media.api-sports.io/flags/be.svg"},

		// 🇹🇷 Turkey – Super Lig Top 4
		{33, "Galatasaray", "https://media.api-sports.io/football/teams/645.png", "Turkey", "https://media.api-sports.io/flags/tr.svg"},
		{34, "Fenerbahce", "https://media.api-sports.io/football/teams/641.png", "Turkey", "https://media.api-sports.io/flags/tr.svg"},
		{35, "Besiktas", "https://media.api-sports.io/football/teams/636.png", "Turkey", "https://media.api-sports.io/flags/tr.svg"},
		{36, "Trabzonspor", "https://media.api-sports.io/football/teams/642.png", "Turkey", "https://media.api-sports.io/flags/tr.svg"},

		// 🇷🇺 Russia – Premier League Top 4
		{37, "CSKA Moscow", "https://media.api-sports.io/football/teams/617.png", "Russia", "https://media.api-sports.io/flags/ru.svg"},
		{38, "Spartak Moscow", "https://media.api-sports.io/football/teams/625.png", "Russia", "https://media.api-sports.io/flags/ru.svg"},
		{39, "Zenit Saint Petersburg", "https://media.api-sports.io/football/teams/621.png", "Russia", "https://media.api-sports.io/flags/ru.svg"},
		{40, "Lokomotiv Moscow", "https://media.api-sports.io/football/teams/622.png", "Russia", "https://media.api-sports.io/flags/ru.svg"},

		// 🇧🇷 Brazil – Serie A Top 4
		{41, "Flamengo", "https://media.api-sports.io/football/teams/127.png", "Brazil", "https://media.api-sports.io/flags/br.svg"},
		{42, "Palmeiras", "https://media.api-sports.io/football/teams/121.png", "Brazil", "https://media.api-sports.io/flags/br.svg"},
		{43, "Corinthians", "https://media.api-sports.io/football/teams/131.png", "Brazil", "https://media.api-sports.io/flags/br.svg"},
		{44, "Santos", "https://media.api-sports.io/football/teams/118.png", "Brazil", "https://media.api-sports.io/flags/br.svg"},

		// 🇦🇷 Argentina – Primera Division Top 4
		{45, "Boca Juniors", "https://media.api-sports.io/football/teams/405.png", "Argentina", "https://media.api-sports.io/flags/ar.svg"},
		{46, "River Plate", "https://media.api-sports.io/football/teams/400.png", "Argentina", "https://media.api-sports.io/flags/ar.svg"},
		{47, "San Lorenzo", "https://media.api-sports.io/football/teams/406.png", "Argentina", "https://media.api-sports.io/flags/ar.svg"},
		{48, "Racing Club", "https://media.api-sports.io/football/teams/435.png", "Argentina", "https://media.api-sports.io/flags/ar.svg"},

		// 🇺🇸 USA – MLS Top 4
		{49, "Los Angeles FC", "https://media.api-sports.io/football/teams/1610.png", "USA", "https://media.api-sports.io/flags/us.svg"},
		{50, "LA Galaxy", "https://media.api-sports.io/football/teams/1615.png", "USA", "https://media.api-sports.io/flags/us.svg"},
		{51, "New York City FC", "https://media.api-sports.io/football/teams/1597.png", "USA", "https://media.api-sports.io/flags/us.svg"},
		{52, "Inter Miami", "https://media.api-sports.io/football/teams/1616.png", "USA", "https://media.api-sports.io/flags/us.svg"},

		// 🇲🇽 Mexico – Liga MX Top 4
		{53, "Club America", "https://media.api-sports.io/football/teams/460.png", "Mexico", "https://media.api-sports.io/flags/mx.svg"},
		{54, "Chivas Guadalajara", "https://media.api-sports.io/football/teams/461.png", "Mexico", "https://media.api-sports.io/flags/mx.svg"},
		{55, "Tigres UANL", "https://media.api-sports.io/football/teams/462.png", "Mexico", "https://media.api-sports.io/flags/mx.svg"},
		{56, "Cruz Azul", "https://media.api-sports.io/football/teams/463.png", "Mexico", "https://media.api-sports.io/flags/mx.svg"},

		// 🇯🇵 Japan – J-League Top 4
		{57, "Urawa Red Diamonds", "https://media.api-sports.io/football/teams/315.png", "Japan", "https://media.api-sports.io/flags/jp.svg"},
		{58, "Gamba Osaka", "https://media.api-sports.io/football/teams/314.png", "Japan", "https://media.api-sports.io/flags/jp.svg"},
		{59, "Kashima Antlers", "https://media.api-sports.io/football/teams/318.png", "Japan", "https://media.api-sports.io/flags/jp.svg"},
		{60, "Vissel Kobe", "https://media.api-sports.io/football/teams/2304.png", "Japan", "https://media.api-sports.io/flags/jp.svg"},

		// 🇰🇷 South Korea – K-League Top 4
		{61, "Jeonbuk Hyundai Motors", "https://media.api-sports.io/football/teams/2618.png", "South Korea", "https://media.api-sports.io/flags/kr.svg"},
		{62, "Ulsan Hyundai", "https://media.api-sports.io/football/teams/2617.png", "South Korea", "https://media.api-sports.io/flags/kr.svg"},
		{63, "Suwon Samsung Bluewings", "https://media.api-sports.io/football/teams/2619.png", "South Korea", "https://media.api-sports.io/flags/kr.svg"},
		{64, "FC Seoul", "https://media.api-sports.io/football/teams/2616.png", "South Korea", "https://media.api-sports.io/flags/kr.svg"},

		// 🇦🇺 Australia – A-League Top 4
		{65, "Sydney FC", "https://media.api-sports.io/football/teams/354.png", "Australia", "https://media.api-sports.io/flags/au.svg"},
		{66, "Melbourne City", "https://media.api-sports.io/football/teams/2629.png", "Australia", "https://media.api-sports.io/flags/au.svg"},
		{67, "Melbourne Victory", "https://media.api-sports.io/football/teams/350.png", "Australia", "https://media.api-sports.io/flags/au.svg"},
		{68, "Western Sydney Wanderers", "https://media.api-sports.io/football/teams/355.png", "Australia", "https://media.api-sports.io/flags/au.svg"},

		// 🇨🇳 China – Super League Top 4
		{69, "Shanghai Port", "https://media.api-sports.io/football/teams/2616.png", "China", "https://media.api-sports.io/flags/cn.svg"},
		{70, "Beijing Guoan", "https://media.api-sports.io/football/teams/2667.png", "China", "https://media.api-sports.io/flags/cn.svg"},
		{71, "Guangzhou FC", "https://media.api-sports.io/football/teams/2668.png", "China", "https://media.api-sports.io/flags/cn.svg"},
		{72, "Wuhan Three Towns", "https://media.api-sports.io/football/teams/10070.png", "China", "https://media.api-sports.io/flags/cn.svg"},

		// 🇸🇦 Saudi Arabia – Pro League Top 4
		{73, "Al-Hilal", "https://media.api-sports.io/football/teams/2932.png", "Saudi Arabia", "https://media.api-sports.io/flags/sa.svg"},
		{74, "Al-Nassr", "https://media.api-sports.io/football/teams/2931.png", "Saudi Arabia", "https://media.api-sports.io/flags/sa.svg"},
		{75, "Al-Ittihad", "https://media.api-sports.io/football/teams/2936.png", "Saudi Arabia", "https://media.api-sports.io/flags/sa.svg"},
		{76, "Al-Ahli", "https://media.api-sports.io/football/teams/2935.png", "Saudi Arabia", "https://media.api-sports.io/flags/sa.svg"},

		// 🇬🇷 Greece – Super League Top 4
		{77, "Olympiacos", "https://media.api-sports.io/football/teams/591.png", "Greece", "https://media.api-sports.io/flags/gr.svg"},
		{78, "Panathinaikos", "https://media.api-sports.io/football/teams/590.png", "Greece", "https://media.api-sports.io/flags/gr.svg"},
		{79, "AEK Athens", "https://media.api-sports.io/football/teams/592.png", "Greece", "https://media.api-sports.io/flags/gr.svg"},
		{80, "PAOK", "https://media.api-sports.io/football/teams/593.png", "Greece", "https://media.api-sports.io/flags/gr.svg"},

		// 🇳🇴 Norway – Eliteserien Top 4
		{81, "Rosenborg", "https://media.api-sports.io/football/teams/649.png", "Norway", "https://media.api-sports.io/flags/no.svg"},
		{82, "Brann", "https://media.api-sports.io/football/teams/652.png", "Norway", "https://media.api-sports.io/flags/no.svg"},
		{83, "Bodo/Glimt", "https://media.api-sports.io/football/teams/1100.png", "Norway", "https://media.api-sports.io/flags/no.svg"},
		{84, "Molde", "https://media.api-sports.io/football/teams/651.png", "Norway", "https://media.api-sports.io/flags/no.svg"},

		// 🇸🇪 Sweden – Allsvenskan Top 4
		{85, "Malmo FF", "https://media.api-sports.io/football/teams/379.png", "Sweden", "https://media.api-sports.io/flags/se.svg"},
		{86, "AIK", "https://media.api-sports.io/football/teams/380.png", "Sweden", "https://media.api-sports.io/flags/se.svg"},
		{87, "Djurgarden", "https://media.api-sports.io/football/teams/381.png", "Sweden", "https://media.api-sports.io/flags/se.svg"},
		{88, "Hammarby", "https://media.api-sports.io/football/teams/382.png", "Sweden", "https://media.api-sports.io/flags/se.svg"},

		// 🇩🇰 Denmark – Superliga Top 4
		{89, "FC Copenhagen", "https://media.api-sports.io/football/teams/399.png", "Denmark", "https://media.api-sports.io/flags/dk.svg"},
		{90, "Brondby", "https://media.api-sports.io/football/teams/402.png", "Denmark", "https://media.api-sports.io/flags/dk.svg"},
		{91, "FC Midtjylland", "https://media.api-sports.io/football/teams/400.png", "Denmark", "https://media.api-sports.io/flags/dk.svg"},
		{92, "FC Nordsjaelland", "https://media.api-sports.io/football/teams/401.png", "Denmark", "https://media.api-sports.io/flags/dk.svg"},

		// 🇦🇹 Austria – Bundesliga Top 4
		{93, "Red Bull Salzburg", "https://media.api-sports.io/football/teams/1062.png", "Austria", "https://media.api-sports.io/flags/at.svg"},
		{94, "Rapid Vienna", "https://media.api-sports.io/football/teams/1063.png", "Austria", "https://media.api-sports.io/flags/at.svg"},
		{95, "LASK", "https://media.api-sports.io/football/teams/1064.png", "Austria", "https://media.api-sports.io/flags/at.svg"},
		{96, "Sturm Graz", "https://media.api-sports.io/football/teams/1065.png", "Austria", "https://media.api-sports.io/flags/at.svg"},

		// 🇨🇭 Switzerland – Super League Top 4
		{97, "Young Boys", "https://media.api-sports.io/football/teams/1907.png", "Switzerland", "https://media.api-sports.io/flags/ch.svg"},
		{98, "FC Basel", "https://media.api-sports.io/football/teams/1908.png", "Switzerland", "https://media.api-sports.io/flags/ch.svg"},
		{99, "FC Zurich", "https://media.api-sports.io/football/teams/1909.png", "Switzerland", "https://media.api-sports.io/flags/ch.svg"},
		{100, "Servette", "https://media.api-sports.io/football/teams/1910.png", "Switzerland", "https://media.api-sports.io/flags/ch.svg"},

		// 🇨🇴 Colombia – Liga BetPlay Top 4
		{101, "Atletico Nacional", "https://media.api-sports.io/football/teams/1044.png", "Colombia", "https://media.api-sports.io/flags/co.svg"},
		{102, "Millonarios", "https://media.api-sports.io/football/teams/1045.png", "Colombia", "https://media.api-sports.io/flags/co.svg"},
		{103, "America de Cali", "https://media.api-sports.io/football/teams/1046.png", "Colombia", "https://media.api-sports.io/flags/co.svg"},
		{104, "Junior", "https://media.api-sports.io/football/teams/1047.png", "Colombia", "https://media.api-sports.io/flags/co.svg"},

		// 🇨🇱 Chile – Primera Division Top 4
		{105, "Colo-Colo", "https://media.api-sports.io/football/teams/1073.png", "Chile", "https://media.api-sports.io/flags/cl.svg"},
		{106, "Universidad de Chile", "https://media.api-sports.io/football/teams/1076.png", "Chile", "https://media.api-sports.io/flags/cl.svg"},
		{107, "Universidad Catolica", "https://media.api-sports.io/football/teams/1074.png", "Chile", "https://media.api-sports.io/flags/cl.svg"},
		{108, "Cobresal", "https://media.api-sports.io/football/teams/1075.png", "Chile", "https://media.api-sports.io/flags/cl.svg"},

		// 🇺🇾 Uruguay – Primera Division Top 4
		{109, "Nacional", "https://media.api-sports.io/football/teams/1007.png", "Uruguay", "https://media.api-sports.io/flags/uy.svg"},
		{110, "Penarol", "https://media.api-sports.io/football/teams/1006.png", "Uruguay", "https://media.api-sports.io/flags/uy.svg"},
		{111, "Defensor Sporting", "https://media.api-sports.io/football/teams/1008.png", "Uruguay", "https://media.api-sports.io/flags/uy.svg"},
		{112, "River Plate Montevideo", "https://media.api-sports.io/football/teams/1009.png", "Uruguay", "https://media.api-sports.io/flags/uy.svg"},

		// 🇮🇳 India – ISL Top 4
		{113, "Bengaluru FC", "https://media.api-sports.io/football/teams/2896.png", "India", "https://media.api-sports.io/flags/in.svg"},
		{114, "Mumbai City FC", "https://media.api-sports.io/football/teams/2897.png", "India", "https://media.api-sports.io/flags/in.svg"},
		{115, "ATK Mohun Bagan", "https://media.api-sports.io/football/teams/2898.png", "India", "https://media.api-sports.io/flags/in.svg"},
		{116, "Hyderabad FC", "https://media.api-sports.io/football/teams/2899.png", "India", "https://media.api-sports.io/flags/in.svg"},

		// 🇮🇷 Iran – Persian Gulf Pro League Top 4
		{117, "Persepolis", "https://media.api-sports.io/football/teams/2633.png", "Iran", "https://media.api-sports.io/flags/ir.svg"},
		{118, "Esteghlal", "https://media.api-sports.io/football/teams/2634.png", "Iran", "https://media.api-sports.io/flags/ir.svg"},
		{119, "Sepahan", "https://media.api-sports.io/football/teams/2635.png", "Iran", "https://media.api-sports.io/flags/ir.svg"},
		{120, "Foolad", "https://media.api-sports.io/football/teams/2636.png", "Iran", "https://media.api-sports.io/flags/ir.svg"},

		// 🇵🇱 Poland – Ekstraklasa Top 4
		{121, "Legia Warsaw", "https://media.api-sports.io/football/teams/589.png", "Poland", "https://media.api-sports.io/flags/pl.svg"},
		{122, "Lech Poznan", "https://media.api-sports.io/football/teams/588.png", "Poland", "https://media.api-sports.io/flags/pl.svg"},
		{123, "Wisla Krakow", "https://media.api-sports.io/football/teams/586.png", "Poland", "https://media.api-sports.io/flags/pl.svg"},
		{124, "Rakow Czestochowa", "https://media.api-sports.io/football/teams/4762.png", "Poland", "https://media.api-sports.io/flags/pl.svg"},

		// 🇨🇿 Czech Republic – First League Top 4
		{125, "Slavia Prague", "https://media.api-sports.io/football/teams/540.png", "Czech Republic", "https://media.api-sports.io/flags/cz.svg"},
		{126, "Sparta Prague", "https://media.api-sports.io/football/teams/539.png", "Czech Republic", "https://media.api-sports.io/flags/cz.svg"},
		{127, "Viktoria Plzen", "https://media.api-sports.io/football/teams/541.png", "Czech Republic", "https://media.api-sports.io/flags/cz.svg"},
		{128, "Banik Ostrava", "https://media.api-sports.io/football/teams/542.png", "Czech Republic", "https://media.api-sports.io/flags/cz.svg"},

		// 🏴󠁧󠁢󠁳󠁣󠁴󠁿 Scotland – Premiership Top 4
		{129, "Celtic", "https://media.api-sports.io/football/teams/256.png", "Scotland", "https://media.api-sports.io/flags/gb-sct.svg"},
		{130, "Rangers", "https://media.api-sports.io/football/teams/257.png", "Scotland", "https://media.api-sports.io/flags/gb-sct.svg"},
		{131, "Heart of Midlothian", "https://media.api-sports.io/football/teams/266.png", "Scotland", "https://media.api-sports.io/flags/gb-sct.svg"},
		{132, "Hibernian", "https://media.api-sports.io/football/teams/263.png", "Scotland", "https://media.api-sports.io/flags/gb-sct.svg"},

		// 🇷🇴 Romania – SuperLiga Top 4
		{133, "FCSB", "https://media.api-sports.io/football/teams/670.png", "Romania", "https://media.api-sports.io/flags/ro.svg"},
		{134, "CFR Cluj", "https://media.api-sports.io/football/teams/667.png", "Romania", "https://media.api-sports.io/flags/ro.svg"},
		{135, "Universitatea Craiova", "https://media.api-sports.io/football/teams/671.png", "Romania", "https://media.api-sports.io/flags/ro.svg"},
		{136, "Rapid Bucharest", "https://media.api-sports.io/football/teams/672.png", "Romania", "https://media.api-sports.io/flags/ro.svg"},

		// 🇭🇷 Croatia – HNL Top 4
		{137, "Dinamo Zagreb", "https://media.api-sports.io/football/teams/732.png", "Croatia", "https://media.api-sports.io/flags/hr.svg"},
		{138, "Hajduk Split", "https://media.api-sports.io/football/teams/734.png", "Croatia", "https://media.api-sports.io/flags/hr.svg"},
		{139, "Rijeka", "https://media.api-sports.io/football/teams/733.png", "Croatia", "https://media.api-sports.io/flags/hr.svg"},
		{140, "Osijek", "https://media.api-sports.io/football/teams/735.png", "Croatia", "https://media.api-sports.io/flags/hr.svg"},

		// 🇸🇪 Additional 4 popular European clubs (cross-continent variety)
		{141, "Manchester United", "https://media.api-sports.io/football/teams/33.png", "England", "https://media.api-sports.io/flags/gb-eng.svg"},
		{142, "Tottenham Hotspur", "https://media.api-sports.io/football/teams/47.png", "England", "https://media.api-sports.io/flags/gb-eng.svg"},
		{143, "Newcastle United", "https://media.api-sports.io/football/teams/34.png", "England", "https://media.api-sports.io/flags/gb-eng.svg"},
		{144, "Aston Villa", "https://media.api-sports.io/football/teams/66.png", "England", "https://media.api-sports.io/flags/gb-eng.svg"},
	}

	for _, d := range insertData {
		_, err := db.Pool.Exec(context.Background(),
			"INSERT INTO saved_teams (api_id, name, logo, country, country_flag) VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING",
			d.apiID, d.name, d.logo, d.country, d.flag,
		)
		if err != nil {
			log.Printf("[seed] failed to insert team %s: %v", d.name, err)
		}
	}

	log.Println("[seed] finished inserting international teams.")
}
