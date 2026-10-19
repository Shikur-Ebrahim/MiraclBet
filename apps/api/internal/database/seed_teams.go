package database

import (
	"context"
	"log"
)

func SeedTeams(db *DB) {
	var sudanCount int
	_ = db.Pool.QueryRow(context.Background(), "SELECT count(*) FROM saved_teams WHERE country = 'Sudan'").Scan(&sudanCount)

	var oldOrDummyCount int
	_ = db.Pool.QueryRow(context.Background(), "SELECT count(*) FROM saved_teams WHERE api_id >= 10000 OR country IN ('England', 'Spain', 'Scotland', 'Germany', 'France', 'Italy', 'Portugal', 'Netherlands', 'Lithuania', 'Estonia', 'Latvia', 'Malta')").Scan(&oldOrDummyCount)

	// If already populated with authentic African/Asian teams and no old dummy leftovers, skip
	if sudanCount >= 8 && oldOrDummyCount == 0 {
		return
	}

	log.Println("[seed] clearing old/dummy teams and seeding authentic African and Asian league teams...")
	_, _ = db.Pool.Exec(context.Background(), "DELETE FROM saved_teams")

	insertData := []struct {
		apiID                     int
		name, logo, country, flag string
	}{
		// 🇸🇩 Sudan – Sudan Premier League
		{1045, "Al-Hilal Omdurman", "https://media.api-sports.io/football/teams/1045.png", "Sudan", "https://media.api-sports.io/flags/sd.svg"},
		{1046, "Al-Merrikh SC", "https://media.api-sports.io/football/teams/1046.png", "Sudan", "https://media.api-sports.io/flags/sd.svg"},
		{1048, "Al Ahli Shendi", "https://media.api-sports.io/football/teams/1048.png", "Sudan", "https://media.api-sports.io/flags/sd.svg"},
		{5543, "Al Hilal Al Fasher", "https://media.api-sports.io/football/teams/5543.png", "Sudan", "https://media.api-sports.io/flags/sd.svg"},
		{5542, "Al Ahly Khartoum", "https://media.api-sports.io/football/teams/5542.png", "Sudan", "https://media.api-sports.io/flags/sd.svg"},
		{5545, "Hay Al Arab", "https://media.api-sports.io/football/teams/5545.png", "Sudan", "https://media.api-sports.io/flags/sd.svg"},
		{16738, "Hilal Alsahil", "https://media.api-sports.io/football/teams/16738.png", "Sudan", "https://media.api-sports.io/flags/sd.svg"},
		{16740, "Kober SC", "https://media.api-sports.io/football/teams/16740.png", "Sudan", "https://media.api-sports.io/flags/sd.svg"},

		// 🇪🇹 Ethiopia – Ethiopian Premier League
		{1047, "Saint George SC", "https://media.api-sports.io/football/teams/1047.png", "Ethiopia", "https://media.api-sports.io/flags/et.svg"},
		{1049, "Fasil Kenema", "https://media.api-sports.io/football/teams/1049.png", "Ethiopia", "https://media.api-sports.io/flags/et.svg"},
		{1050, "Ethiopian Coffee", "https://media.api-sports.io/football/teams/1050.png", "Ethiopia", "https://media.api-sports.io/flags/et.svg"},
		{5546, "Hawassa City", "https://media.api-sports.io/football/teams/5546.png", "Ethiopia", "https://media.api-sports.io/flags/et.svg"},
		{5547, "Bahir Dar Kenema", "https://media.api-sports.io/football/teams/5547.png", "Ethiopia", "https://media.api-sports.io/flags/et.svg"},
		{5548, "Sidama Coffee", "https://media.api-sports.io/football/teams/5548.png", "Ethiopia", "https://media.api-sports.io/flags/et.svg"},
		{5549, "Adama City", "https://media.api-sports.io/football/teams/5549.png", "Ethiopia", "https://media.api-sports.io/flags/et.svg"},
		{5550, "Hadiya Hossana", "https://media.api-sports.io/football/teams/5550.png", "Ethiopia", "https://media.api-sports.io/flags/et.svg"},
		{16743, "Dire Dawa City", "https://media.api-sports.io/football/teams/16743.png", "Ethiopia", "https://media.api-sports.io/flags/et.svg"},
		{16744, "Defense Force SC", "https://media.api-sports.io/football/teams/16744.png", "Ethiopia", "https://media.api-sports.io/flags/et.svg"},

		// 🇹🇿 Tanzania – Ligi Kuu Bara
		{1051, "Young Africans SC", "https://media.api-sports.io/football/teams/1051.png", "Tanzania", "https://media.api-sports.io/flags/tz.svg"},
		{1052, "Simba SC", "https://media.api-sports.io/football/teams/1052.png", "Tanzania", "https://media.api-sports.io/flags/tz.svg"},
		{1053, "Azam FC", "https://media.api-sports.io/football/teams/1053.png", "Tanzania", "https://media.api-sports.io/flags/tz.svg"},
		{1054, "Singida Fountain Gate", "https://media.api-sports.io/football/teams/1054.png", "Tanzania", "https://media.api-sports.io/flags/tz.svg"},
		{5551, "Kagera Sugar", "https://media.api-sports.io/football/teams/5551.png", "Tanzania", "https://media.api-sports.io/flags/tz.svg"},
		{5552, "Mtibwa Sugar", "https://media.api-sports.io/football/teams/5552.png", "Tanzania", "https://media.api-sports.io/flags/tz.svg"},
		{5553, "Coastal Union", "https://media.api-sports.io/football/teams/5553.png", "Tanzania", "https://media.api-sports.io/flags/tz.svg"},
		{5554, "Namungo FC", "https://media.api-sports.io/football/teams/5554.png", "Tanzania", "https://media.api-sports.io/flags/tz.svg"},

		// 🇰🇪 Kenya – Kenyan Premier League
		{1055, "Gor Mahia", "https://media.api-sports.io/football/teams/1055.png", "Kenya", "https://media.api-sports.io/flags/ke.svg"},
		{1056, "AFC Leopards", "https://media.api-sports.io/football/teams/1056.png", "Kenya", "https://media.api-sports.io/flags/ke.svg"},
		{1057, "Tusker FC", "https://media.api-sports.io/football/teams/1057.png", "Kenya", "https://media.api-sports.io/flags/ke.svg"},
		{1058, "Bandari FC", "https://media.api-sports.io/football/teams/1058.png", "Kenya", "https://media.api-sports.io/flags/ke.svg"},
		{5555, "KCB FC", "https://media.api-sports.io/football/teams/5555.png", "Kenya", "https://media.api-sports.io/flags/ke.svg"},
		{5556, "Posta Rangers", "https://media.api-sports.io/football/teams/5556.png", "Kenya", "https://media.api-sports.io/flags/ke.svg"},
		{5557, "Nairobi City Stars", "https://media.api-sports.io/football/teams/5557.png", "Kenya", "https://media.api-sports.io/flags/ke.svg"},
		{5558, "Ulinzi Stars", "https://media.api-sports.io/football/teams/5558.png", "Kenya", "https://media.api-sports.io/flags/ke.svg"},

		// 🇺🇬 Uganda – Uganda Premier League
		{1059, "Vipers SC", "https://media.api-sports.io/football/teams/1059.png", "Uganda", "https://media.api-sports.io/flags/ug.svg"},
		{1060, "KCCA FC", "https://media.api-sports.io/football/teams/1060.png", "Uganda", "https://media.api-sports.io/flags/ug.svg"},
		{1061, "SC Villa", "https://media.api-sports.io/football/teams/1061.png", "Uganda", "https://media.api-sports.io/flags/ug.svg"},
		{1062, "Express FC", "https://media.api-sports.io/football/teams/1062.png", "Uganda", "https://media.api-sports.io/flags/ug.svg"},
		{5559, "URA FC", "https://media.api-sports.io/football/teams/5559.png", "Uganda", "https://media.api-sports.io/flags/ug.svg"},
		{5560, "BUL FC", "https://media.api-sports.io/football/teams/5560.png", "Uganda", "https://media.api-sports.io/flags/ug.svg"},
		{5561, "Maroons FC", "https://media.api-sports.io/football/teams/5561.png", "Uganda", "https://media.api-sports.io/flags/ug.svg"},
		{5562, "Wakiso Giants", "https://media.api-sports.io/football/teams/5562.png", "Uganda", "https://media.api-sports.io/flags/ug.svg"},

		// 🇷🇼 Rwanda – National Football League
		{1063, "APR FC", "https://media.api-sports.io/football/teams/1063.png", "Rwanda", "https://media.api-sports.io/flags/rw.svg"},
		{1064, "Rayon Sports", "https://media.api-sports.io/football/teams/1064.png", "Rwanda", "https://media.api-sports.io/flags/rw.svg"},
		{1065, "AS Kigali", "https://media.api-sports.io/football/teams/1065.png", "Rwanda", "https://media.api-sports.io/flags/rw.svg"},
		{1066, "Kiyovu Sports", "https://media.api-sports.io/football/teams/1066.png", "Rwanda", "https://media.api-sports.io/flags/rw.svg"},
		{5563, "Police FC Rwanda", "https://media.api-sports.io/football/teams/5563.png", "Rwanda", "https://media.api-sports.io/flags/rw.svg"},
		{5564, "Mukura Victory", "https://media.api-sports.io/football/teams/5564.png", "Rwanda", "https://media.api-sports.io/flags/rw.svg"},

		// 🇿🇲 Zambia – Super League
		{1067, "ZESCO United", "https://media.api-sports.io/football/teams/1067.png", "Zambia", "https://media.api-sports.io/flags/zm.svg"},
		{1068, "Nkana FC", "https://media.api-sports.io/football/teams/1068.png", "Zambia", "https://media.api-sports.io/flags/zm.svg"},
		{1069, "Red Arrows", "https://media.api-sports.io/football/teams/1069.png", "Zambia", "https://media.api-sports.io/flags/zm.svg"},
		{1070, "Power Dynamos", "https://media.api-sports.io/football/teams/1070.png", "Zambia", "https://media.api-sports.io/flags/zm.svg"},
		{5567, "Zanaco FC", "https://media.api-sports.io/football/teams/5567.png", "Zambia", "https://media.api-sports.io/flags/zm.svg"},
		{5568, "Green Buffaloes", "https://media.api-sports.io/football/teams/5568.png", "Zambia", "https://media.api-sports.io/flags/zm.svg"},

		// 🇿🇼 Zimbabwe – Premier Soccer League
		{1071, "Dynamos FC", "https://media.api-sports.io/football/teams/1071.png", "Zimbabwe", "https://media.api-sports.io/flags/zw.svg"},
		{1072, "Highlanders FC", "https://media.api-sports.io/football/teams/1072.png", "Zimbabwe", "https://media.api-sports.io/flags/zw.svg"},
		{1073, "CAPS United", "https://media.api-sports.io/football/teams/1073.png", "Zimbabwe", "https://media.api-sports.io/flags/zw.svg"},
		{1074, "FC Platinum", "https://media.api-sports.io/football/teams/1074.png", "Zimbabwe", "https://media.api-sports.io/flags/zw.svg"},
		{5571, "Chicken Inn", "https://media.api-sports.io/football/teams/5571.png", "Zimbabwe", "https://media.api-sports.io/flags/zw.svg"},
		{5572, "Ngezi Platinum", "https://media.api-sports.io/football/teams/5572.png", "Zimbabwe", "https://media.api-sports.io/flags/zw.svg"},

		// 🇨🇩 DR Congo – Linafoot
		{1075, "TP Mazembe", "https://media.api-sports.io/football/teams/1075.png", "DR Congo", "https://media.api-sports.io/flags/cd.svg"},
		{1076, "AS Vita Club", "https://media.api-sports.io/football/teams/1076.png", "DR Congo", "https://media.api-sports.io/flags/cd.svg"},
		{1077, "DC Motema Pembe", "https://media.api-sports.io/football/teams/1077.png", "DR Congo", "https://media.api-sports.io/flags/cd.svg"},
		{1078, "Maniema Union", "https://media.api-sports.io/football/teams/1078.png", "DR Congo", "https://media.api-sports.io/flags/cd.svg"},
		{5575, "Saint-Eloi Lupopo", "https://media.api-sports.io/football/teams/5575.png", "DR Congo", "https://media.api-sports.io/flags/cd.svg"},

		// 🇦🇴 Angola – Girabola
		{1079, "Petro de Luanda", "https://media.api-sports.io/football/teams/1079.png", "Angola", "https://media.api-sports.io/flags/ao.svg"},
		{1080, "Primeiro de Agosto", "https://media.api-sports.io/football/teams/1080.png", "Angola", "https://media.api-sports.io/flags/ao.svg"},
		{1081, "Sagrada Esperanca", "https://media.api-sports.io/football/teams/1081.png", "Angola", "https://media.api-sports.io/flags/ao.svg"},
		{1082, "Interclube", "https://media.api-sports.io/football/teams/1082.png", "Angola", "https://media.api-sports.io/flags/ao.svg"},

		// 🇲🇱 Mali – Premiere Division
		{1087, "Stade Malien", "https://media.api-sports.io/football/teams/1087.png", "Mali", "https://media.api-sports.io/flags/ml.svg"},
		{1088, "Djoliba AC", "https://media.api-sports.io/football/teams/1088.png", "Mali", "https://media.api-sports.io/flags/ml.svg"},
		{1089, "Real Bamako", "https://media.api-sports.io/football/teams/1089.png", "Mali", "https://media.api-sports.io/flags/ml.svg"},
		{1090, "AS Bakaridjan", "https://media.api-sports.io/football/teams/1090.png", "Mali", "https://media.api-sports.io/flags/ml.svg"},

		// 🇸🇳 Senegal – Ligue 1
		{1091, "Teungueth FC", "https://media.api-sports.io/football/teams/1091.png", "Senegal", "https://media.api-sports.io/flags/sn.svg"},
		{1092, "ASC Jaraaf", "https://media.api-sports.io/football/teams/1092.png", "Senegal", "https://media.api-sports.io/flags/sn.svg"},
		{1093, "Casa Sports", "https://media.api-sports.io/football/teams/1093.png", "Senegal", "https://media.api-sports.io/flags/sn.svg"},
		{1094, "Generation Foot", "https://media.api-sports.io/football/teams/1094.png", "Senegal", "https://media.api-sports.io/flags/sn.svg"},

		// 🇬🇳 Guinea – Ligue 1 Pro
		{1095, "Horoya AC", "https://media.api-sports.io/football/teams/1095.png", "Guinea", "https://media.api-sports.io/flags/gn.svg"},
		{1096, "Hafia FC", "https://media.api-sports.io/football/teams/1096.png", "Guinea", "https://media.api-sports.io/flags/gn.svg"},
		{1097, "SOAR Academie", "https://media.api-sports.io/football/teams/1097.png", "Guinea", "https://media.api-sports.io/flags/gn.svg"},
		{1098, "Milo FC", "https://media.api-sports.io/football/teams/1098.png", "Guinea", "https://media.api-sports.io/flags/gn.svg"},

		// 🇲🇷 Mauritania – Super D1
		{1099, "FC Nouadhibou", "https://media.api-sports.io/football/teams/1099.png", "Mauritania", "https://media.api-sports.io/flags/mr.svg"},
		{1100, "Tevragh-Zeina", "https://media.api-sports.io/football/teams/1100.png", "Mauritania", "https://media.api-sports.io/flags/mr.svg"},
		{1101, "AS Douanes", "https://media.api-sports.io/football/teams/1101.png", "Mauritania", "https://media.api-sports.io/flags/mr.svg"},
		{1102, "Nouakchott Kings", "https://media.api-sports.io/football/teams/1102.png", "Mauritania", "https://media.api-sports.io/flags/mr.svg"},

		// 🇱🇾 Libya – Premier League
		{1103, "Al Ahli Tripoli", "https://media.api-sports.io/football/teams/1103.png", "Libya", "https://media.api-sports.io/flags/ly.svg"},
		{1104, "Al Ittihad Tripoli", "https://media.api-sports.io/football/teams/1104.png", "Libya", "https://media.api-sports.io/flags/ly.svg"},
		{1105, "Al Ahly Benghazi", "https://media.api-sports.io/football/teams/1105.png", "Libya", "https://media.api-sports.io/flags/ly.svg"},
		{1106, "Al Nasr Benghazi", "https://media.api-sports.io/football/teams/1106.png", "Libya", "https://media.api-sports.io/flags/ly.svg"},

		// 🇸🇴 Somalia – Somali Premier League
		{1107, "Mogadishu City Club", "https://media.api-sports.io/football/teams/1107.png", "Somalia", "https://media.api-sports.io/flags/so.svg"},
		{1108, "Horseed FC", "https://media.api-sports.io/football/teams/1108.png", "Somalia", "https://media.api-sports.io/flags/so.svg"},
		{1109, "Dekedaha FC", "https://media.api-sports.io/football/teams/1109.png", "Somalia", "https://media.api-sports.io/flags/so.svg"},
		{1110, "Elman FC", "https://media.api-sports.io/football/teams/1110.png", "Somalia", "https://media.api-sports.io/flags/so.svg"},

		// 🇧🇮 Burundi – Primus League
		{1111, "Vital'O FC", "https://media.api-sports.io/football/teams/1111.png", "Burundi", "https://media.api-sports.io/flags/bi.svg"},
		{1112, "Le Messager Ngozi", "https://media.api-sports.io/football/teams/1112.png", "Burundi", "https://media.api-sports.io/flags/bi.svg"},
		{1113, "Aigle Noir", "https://media.api-sports.io/football/teams/1113.png", "Burundi", "https://media.api-sports.io/flags/bi.svg"},
		{1114, "Musongati FC", "https://media.api-sports.io/football/teams/1114.png", "Burundi", "https://media.api-sports.io/flags/bi.svg"},

		// 🇧🇼 Botswana – Premier League
		{1115, "Jwaneng Galaxy", "https://media.api-sports.io/football/teams/1115.png", "Botswana", "https://media.api-sports.io/flags/bw.svg"},
		{1116, "Township Rollers", "https://media.api-sports.io/football/teams/1116.png", "Botswana", "https://media.api-sports.io/flags/bw.svg"},
		{1117, "Gaborone United", "https://media.api-sports.io/football/teams/1117.png", "Botswana", "https://media.api-sports.io/flags/bw.svg"},
		{1118, "Orapa United", "https://media.api-sports.io/football/teams/1118.png", "Botswana", "https://media.api-sports.io/flags/bw.svg"},

		// 🇲🇼 Malawi – Super League
		{1119, "Nyasa Big Bullets", "https://media.api-sports.io/football/teams/1119.png", "Malawi", "https://media.api-sports.io/flags/mw.svg"},
		{1120, "Silver Strikers", "https://media.api-sports.io/football/teams/1120.png", "Malawi", "https://media.api-sports.io/flags/mw.svg"},
		{1121, "Mighty Wanderers", "https://media.api-sports.io/football/teams/1121.png", "Malawi", "https://media.api-sports.io/flags/mw.svg"},
		{1122, "Kamuzu Barracks", "https://media.api-sports.io/football/teams/1122.png", "Malawi", "https://media.api-sports.io/flags/mw.svg"},

		// 🇻🇳 Vietnam – V.League 1
		{1127, "Hanoi FC", "https://media.api-sports.io/football/teams/1127.png", "Vietnam", "https://media.api-sports.io/flags/vn.svg"},
		{1128, "Viettel FC", "https://media.api-sports.io/football/teams/1128.png", "Vietnam", "https://media.api-sports.io/flags/vn.svg"},
		{1129, "Hoang Anh Gia Lai", "https://media.api-sports.io/football/teams/1129.png", "Vietnam", "https://media.api-sports.io/flags/vn.svg"},
		{1130, "Cong An Ha Noi", "https://media.api-sports.io/football/teams/1130.png", "Vietnam", "https://media.api-sports.io/flags/vn.svg"},
		{5605, "Becamex Binh Duong", "https://media.api-sports.io/football/teams/5605.png", "Vietnam", "https://media.api-sports.io/flags/vn.svg"},
		{5606, "Nam Dinh FC", "https://media.api-sports.io/football/teams/5606.png", "Vietnam", "https://media.api-sports.io/flags/vn.svg"},

		// 🇲🇲 Myanmar – National League
		{1131, "Shan United", "https://media.api-sports.io/football/teams/1131.png", "Myanmar", "https://media.api-sports.io/flags/mm.svg"},
		{1132, "Yangon United", "https://media.api-sports.io/football/teams/1132.png", "Myanmar", "https://media.api-sports.io/flags/mm.svg"},
		{1133, "Hantharwady United", "https://media.api-sports.io/football/teams/1133.png", "Myanmar", "https://media.api-sports.io/flags/mm.svg"},
		{1134, "Yadanarbon FC", "https://media.api-sports.io/football/teams/1134.png", "Myanmar", "https://media.api-sports.io/flags/mm.svg"},

		// 🇰🇭 Cambodia – Premier League
		{1135, "Phnom Penh Crown", "https://media.api-sports.io/football/teams/1135.png", "Cambodia", "https://media.api-sports.io/flags/kh.svg"},
		{1136, "Svay Rieng", "https://media.api-sports.io/football/teams/1136.png", "Cambodia", "https://media.api-sports.io/flags/kh.svg"},
		{1137, "Boeung Ket FC", "https://media.api-sports.io/football/teams/1137.png", "Cambodia", "https://media.api-sports.io/flags/kh.svg"},
		{1138, "Visakha FC", "https://media.api-sports.io/football/teams/1138.png", "Cambodia", "https://media.api-sports.io/flags/kh.svg"},

		// 🇱🇦 Laos – Lao League 1
		{1139, "Young Elephants FC", "https://media.api-sports.io/football/teams/1139.png", "Laos", "https://media.api-sports.io/flags/la.svg"},
		{1140, "Master 7 FC", "https://media.api-sports.io/football/teams/1140.png", "Laos", "https://media.api-sports.io/flags/la.svg"},
		{1141, "Ezra FC", "https://media.api-sports.io/football/teams/1141.png", "Laos", "https://media.api-sports.io/flags/la.svg"},
		{1142, "Luang Prabang FC", "https://media.api-sports.io/football/teams/1142.png", "Laos", "https://media.api-sports.io/flags/la.svg"},

		// 🇧🇩 Bangladesh – Premier League
		{1143, "Bashundhara Kings", "https://media.api-sports.io/football/teams/1143.png", "Bangladesh", "https://media.api-sports.io/flags/bd.svg"},
		{1144, "Abahani Limited Dhaka", "https://media.api-sports.io/football/teams/1144.png", "Bangladesh", "https://media.api-sports.io/flags/bd.svg"},
		{1145, "Mohammedan SC Dhaka", "https://media.api-sports.io/football/teams/1145.png", "Bangladesh", "https://media.api-sports.io/flags/bd.svg"},
		{1146, "Sheikh Russel KC", "https://media.api-sports.io/football/teams/1146.png", "Bangladesh", "https://media.api-sports.io/flags/bd.svg"},

		// 🇳🇵 Nepal – Martyr's Memorial A-Division
		{1147, "Machhindra FC", "https://media.api-sports.io/football/teams/1147.png", "Nepal", "https://media.api-sports.io/flags/np.svg"},
		{1148, "Tribhuwan Army", "https://media.api-sports.io/football/teams/1148.png", "Nepal", "https://media.api-sports.io/flags/np.svg"},
		{1149, "Manang Marshyangdi", "https://media.api-sports.io/football/teams/1149.png", "Nepal", "https://media.api-sports.io/flags/np.svg"},
		{1150, "Three Star Club", "https://media.api-sports.io/football/teams/1150.png", "Nepal", "https://media.api-sports.io/flags/np.svg"},

		// 🇲🇻 Maldives – Dhivehi Premier League
		{1151, "Maziya S&RC", "https://media.api-sports.io/football/teams/1151.png", "Maldives", "https://media.api-sports.io/flags/mv.svg"},
		{1152, "Club Valencia", "https://media.api-sports.io/football/teams/1152.png", "Maldives", "https://media.api-sports.io/flags/mv.svg"},
		{1153, "TC Sports Club", "https://media.api-sports.io/football/teams/1153.png", "Maldives", "https://media.api-sports.io/flags/mv.svg"},
		{1154, "Club Green Streets", "https://media.api-sports.io/football/teams/1154.png", "Maldives", "https://media.api-sports.io/flags/mv.svg"},

		// 🇲🇳 Mongolia – National Premier League
		{1155, "FC Ulaanbaatar", "https://media.api-sports.io/football/teams/1155.png", "Mongolia", "https://media.api-sports.io/flags/mn.svg"},
		{1156, "SP Falcons", "https://media.api-sports.io/football/teams/1156.png", "Mongolia", "https://media.api-sports.io/flags/mn.svg"},
		{1157, "Khaan Khuns-Erchim", "https://media.api-sports.io/football/teams/1157.png", "Mongolia", "https://media.api-sports.io/flags/mn.svg"},
		{1158, "Deren FC", "https://media.api-sports.io/football/teams/1158.png", "Mongolia", "https://media.api-sports.io/flags/mn.svg"},

		// 🇰🇬 Kyrgyzstan – Kyrgyz Premier League
		{1159, "FK Dordoi Bishkek", "https://media.api-sports.io/football/teams/1159.png", "Kyrgyzstan", "https://media.api-sports.io/flags/kg.svg"},
		{1160, "Abdysh-Ata Kant", "https://media.api-sports.io/football/teams/1160.png", "Kyrgyzstan", "https://media.api-sports.io/flags/kg.svg"},
		{1161, "Alay Osh", "https://media.api-sports.io/football/teams/1161.png", "Kyrgyzstan", "https://media.api-sports.io/flags/kg.svg"},
		{1162, "Neftchi Kochkor-Ata", "https://media.api-sports.io/football/teams/1162.png", "Kyrgyzstan", "https://media.api-sports.io/flags/kg.svg"},

		// 🇹🇯 Tajikistan – Vysshaya Liga
		{1163, "FC Istiklol", "https://media.api-sports.io/football/teams/1163.png", "Tajikistan", "https://media.api-sports.io/flags/tj.svg"},
		{1164, "Ravshan Kulob", "https://media.api-sports.io/football/teams/1164.png", "Tajikistan", "https://media.api-sports.io/flags/tj.svg"},
		{1165, "CSKA Pamir Dushanbe", "https://media.api-sports.io/football/teams/1165.png", "Tajikistan", "https://media.api-sports.io/flags/tj.svg"},
		{1166, "FK Khujand", "https://media.api-sports.io/football/teams/1166.png", "Tajikistan", "https://media.api-sports.io/flags/tj.svg"},

		// 🇹🇲 Turkmenistan – Yokary Liga
		{1167, "Altyn Asyr FK", "https://media.api-sports.io/football/teams/1167.png", "Turkmenistan", "https://media.api-sports.io/flags/tm.svg"},
		{1168, "FK Arkadag", "https://media.api-sports.io/football/teams/1168.png", "Turkmenistan", "https://media.api-sports.io/flags/tm.svg"},
		{1169, "Ahal FT", "https://media.api-sports.io/football/teams/1169.png", "Turkmenistan", "https://media.api-sports.io/flags/tm.svg"},
		{1170, "Shagadam FK", "https://media.api-sports.io/football/teams/1170.png", "Turkmenistan", "https://media.api-sports.io/flags/tm.svg"},

		// 🇧🇭 Bahrain – Bahraini Premier League
		{1171, "Al-Riffa SC", "https://media.api-sports.io/football/teams/1171.png", "Bahrain", "https://media.api-sports.io/flags/bh.svg"},
		{1172, "Al-Muharraq SC", "https://media.api-sports.io/football/teams/1172.png", "Bahrain", "https://media.api-sports.io/flags/bh.svg"},
		{1173, "Manama Club", "https://media.api-sports.io/football/teams/1173.png", "Bahrain", "https://media.api-sports.io/flags/bh.svg"},
		{1174, "Al-Khaldiya", "https://media.api-sports.io/football/teams/1174.png", "Bahrain", "https://media.api-sports.io/flags/bh.svg"},

		// 🇰🇼 Kuwait – Kuwaiti Premier League
		{1175, "Kuwait SC", "https://media.api-sports.io/football/teams/1175.png", "Kuwait", "https://media.api-sports.io/flags/kw.svg"},
		{1176, "Al-Qadsia", "https://media.api-sports.io/football/teams/1176.png", "Kuwait", "https://media.api-sports.io/flags/kw.svg"},
		{1177, "Al-Arabi SC", "https://media.api-sports.io/football/teams/1177.png", "Kuwait", "https://media.api-sports.io/flags/kw.svg"},
		{1178, "Kazma SC", "https://media.api-sports.io/football/teams/1178.png", "Kuwait", "https://media.api-sports.io/flags/kw.svg"},

		// 🇴🇲 Oman – Professional League
		{1179, "Al-Seeb Club", "https://media.api-sports.io/football/teams/1179.png", "Oman", "https://media.api-sports.io/flags/om.svg"},
		{1180, "Dhofar Club", "https://media.api-sports.io/football/teams/1180.png", "Oman", "https://media.api-sports.io/flags/om.svg"},
		{1181, "Al-Nahda Club", "https://media.api-sports.io/football/teams/1181.png", "Oman", "https://media.api-sports.io/flags/om.svg"},
		{1182, "Sohar SC", "https://media.api-sports.io/football/teams/1182.png", "Oman", "https://media.api-sports.io/flags/om.svg"},

		// 🇯🇴 Jordan – Pro League
		{1183, "Al-Wehdat SC", "https://media.api-sports.io/football/teams/1183.png", "Jordan", "https://media.api-sports.io/flags/jo.svg"},
		{1184, "Al-Faisaly Amman", "https://media.api-sports.io/football/teams/1184.png", "Jordan", "https://media.api-sports.io/flags/jo.svg"},
		{1185, "Al-Hussein Irbid", "https://media.api-sports.io/football/teams/1185.png", "Jordan", "https://media.api-sports.io/flags/jo.svg"},
		{1186, "Shabab Al-Ordon", "https://media.api-sports.io/football/teams/1186.png", "Jordan", "https://media.api-sports.io/flags/jo.svg"},

		// 🇱🇧 Lebanon – Premier League
		{1187, "Al-Ahed SC", "https://media.api-sports.io/football/teams/1187.png", "Lebanon", "https://media.api-sports.io/flags/lb.svg"},
		{1188, "Nejmeh SC", "https://media.api-sports.io/football/teams/1188.png", "Lebanon", "https://media.api-sports.io/flags/lb.svg"},
		{1189, "Al-Ansar FC", "https://media.api-sports.io/football/teams/1189.png", "Lebanon", "https://media.api-sports.io/flags/lb.svg"},
		{1190, "Safa SC", "https://media.api-sports.io/football/teams/1190.png", "Lebanon", "https://media.api-sports.io/flags/lb.svg"},

		// 🇮🇶 Iraq – Stars League
		{1191, "Al-Shorta SC", "https://media.api-sports.io/football/teams/1191.png", "Iraq", "https://media.api-sports.io/flags/iq.svg"},
		{1192, "Al-Quwa Al-Jawiya", "https://media.api-sports.io/football/teams/1192.png", "Iraq", "https://media.api-sports.io/flags/iq.svg"},
		{1193, "Al-Zawraa SC", "https://media.api-sports.io/football/teams/1193.png", "Iraq", "https://media.api-sports.io/flags/iq.svg"},
		{1194, "Erbil SC", "https://media.api-sports.io/football/teams/1194.png", "Iraq", "https://media.api-sports.io/flags/iq.svg"},

		// 🇾🇪 Yemen – Yemeni League
		{1195, "Al-Tilal SC", "https://media.api-sports.io/football/teams/1195.png", "Yemen", "https://media.api-sports.io/flags/ye.svg"},
		{1196, "Al-Wahda Aden", "https://media.api-sports.io/football/teams/1196.png", "Yemen", "https://media.api-sports.io/flags/ye.svg"},
		{1197, "Al-Ahli Sana'a", "https://media.api-sports.io/football/teams/1197.png", "Yemen", "https://media.api-sports.io/flags/ye.svg"},
		{1198, "Al-Sha'ab Ibb", "https://media.api-sports.io/football/teams/1198.png", "Yemen", "https://media.api-sports.io/flags/ye.svg"},

		// 🇸🇾 Syria – Premier League
		{1199, "Al-Karamah SC", "https://media.api-sports.io/football/teams/1199.png", "Syria", "https://media.api-sports.io/flags/sy.svg"},
		{1200, "Al-Wahda Damascus", "https://media.api-sports.io/football/teams/1200.png", "Syria", "https://media.api-sports.io/flags/sy.svg"},
		{1201, "Al-Jaish SC", "https://media.api-sports.io/football/teams/1201.png", "Syria", "https://media.api-sports.io/flags/sy.svg"},
		{1202, "Tishreen SC", "https://media.api-sports.io/football/teams/1202.png", "Syria", "https://media.api-sports.io/flags/sy.svg"},

		// 🇺🇿 Uzbekistan – Super League
		{1203, "Pakhtakor Tashkent", "https://media.api-sports.io/football/teams/1203.png", "Uzbekistan", "https://media.api-sports.io/flags/uz.svg"},
		{1204, "Navbahor Namangan", "https://media.api-sports.io/football/teams/1204.png", "Uzbekistan", "https://media.api-sports.io/flags/uz.svg"},
		{1205, "Nasaf Qarshi", "https://media.api-sports.io/football/teams/1205.png", "Uzbekistan", "https://media.api-sports.io/flags/uz.svg"},
		{1206, "AGMK FC", "https://media.api-sports.io/football/teams/1206.png", "Uzbekistan", "https://media.api-sports.io/flags/uz.svg"},

		// 🇮🇩 Indonesia – Liga 1
		{1207, "Persib Bandung", "https://media.api-sports.io/football/teams/1207.png", "Indonesia", "https://media.api-sports.io/flags/id.svg"},
		{1208, "Persija Jakarta", "https://media.api-sports.io/football/teams/1208.png", "Indonesia", "https://media.api-sports.io/flags/id.svg"},
		{1209, "Bali United", "https://media.api-sports.io/football/teams/1209.png", "Indonesia", "https://media.api-sports.io/flags/id.svg"},
		{1210, "Persebaya Surabaya", "https://media.api-sports.io/football/teams/1210.png", "Indonesia", "https://media.api-sports.io/flags/id.svg"},

		// 🇵🇭 Philippines – Football League
		{1211, "Kaya FC-Iloilo", "https://media.api-sports.io/football/teams/1211.png", "Philippines", "https://media.api-sports.io/flags/ph.svg"},
		{1212, "United City FC", "https://media.api-sports.io/football/teams/1212.png", "Philippines", "https://media.api-sports.io/flags/ph.svg"},
		{1213, "Dynamic Herb Cebu", "https://media.api-sports.io/football/teams/1213.png", "Philippines", "https://media.api-sports.io/flags/ph.svg"},
		{1214, "Stallion Laguna", "https://media.api-sports.io/football/teams/1214.png", "Philippines", "https://media.api-sports.io/flags/ph.svg"},
	}

	for _, t := range insertData {
		_, err := db.Pool.Exec(context.Background(),
			`INSERT INTO saved_teams (api_id, name, logo, country, country_flag) 
			 VALUES ($1, $2, $3, $4, $5) 
			 ON CONFLICT (api_id) DO UPDATE SET 
			   name = EXCLUDED.name, 
			   logo = EXCLUDED.logo, 
			   country = EXCLUDED.country, 
			   country_flag = EXCLUDED.country_flag`,
			t.apiID, t.name, t.logo, t.country, t.flag,
		)
		if err != nil {
			log.Printf("[seed] error saving team %s: %v", t.name, err)
		}
	}

	log.Printf("[seed] successfully seeded %d authentic African and Asian league teams", len(insertData))
}
