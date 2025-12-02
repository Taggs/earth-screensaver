// World cities data: capitals and major secondary cities
// Format: [name, lat, lon, population, isCapital, countryCode]

export const CITIES = [
  // NORTH AMERICA
  ["Washington D.C.", 38.9072, -77.0369, 705749, true, "US"],
  ["New York", 40.7128, -74.0060, 8336817, false, "US"],
  ["Los Angeles", 34.0522, -118.2437, 3979576, false, "US"],
  ["Chicago", 41.8781, -87.6298, 2693976, false, "US"],
  ["Houston", 29.7604, -95.3698, 2320268, false, "US"],
  ["Phoenix", 33.4484, -112.0740, 1680992, false, "US"],
  ["San Francisco", 37.7749, -122.4194, 881549, false, "US"],
  ["Seattle", 47.6062, -122.3321, 753675, false, "US"],
  ["Miami", 25.7617, -80.1918, 467963, false, "US"],
  ["Boston", 42.3601, -71.0589, 692600, false, "US"],
  ["Denver", 39.7392, -104.9903, 727211, false, "US"],
  ["Atlanta", 33.7490, -84.3880, 498715, false, "US"],
  
  ["Ottawa", 45.4215, -75.6972, 994837, true, "CA"],
  ["Toronto", 43.6532, -79.3832, 2731571, false, "CA"],
  ["Vancouver", 49.2827, -123.1207, 631486, false, "CA"],
  ["Montreal", 45.5017, -73.5673, 1762949, false, "CA"],
  ["Calgary", 51.0447, -114.0719, 1239220, false, "CA"],
  
  ["Mexico City", 19.4326, -99.1332, 8918653, true, "MX"],
  ["Guadalajara", 20.6597, -103.3496, 1495182, false, "MX"],
  ["Monterrey", 25.6866, -100.3161, 1142994, false, "MX"],
  
  ["Havana", 23.1136, -82.3666, 2106146, true, "CU"],
  ["Kingston", 18.0179, -76.8099, 937700, true, "JM"],
  ["Panama City", 8.9824, -79.5199, 880691, true, "PA"],
  ["San José", 9.9281, -84.0907, 342188, true, "CR"],
  ["Guatemala City", 14.6349, -90.5069, 2450212, true, "GT"],
  
  // SOUTH AMERICA
  ["Brasília", -15.8267, -47.9218, 2852372, true, "BR"],
  ["São Paulo", -23.5505, -46.6333, 12325232, false, "BR"],
  ["Rio de Janeiro", -22.9068, -43.1729, 6747815, false, "BR"],
  ["Salvador", -12.9714, -38.5014, 2886698, false, "BR"],
  ["Fortaleza", -3.7172, -38.5433, 2686612, false, "BR"],
  
  ["Buenos Aires", -34.6037, -58.3816, 2891082, true, "AR"],
  ["Córdoba", -31.4201, -64.1888, 1391000, false, "AR"],
  ["Rosario", -32.9468, -60.6393, 1193605, false, "AR"],
  
  ["Lima", -12.0464, -77.0428, 9751717, true, "PE"],
  ["Bogotá", 4.7110, -74.0721, 7181469, true, "CO"],
  ["Medellín", 6.2476, -75.5658, 2569007, false, "CO"],
  ["Cali", 3.4516, -76.5320, 2227642, false, "CO"],
  
  ["Santiago", -33.4489, -70.6693, 5614000, true, "CL"],
  ["Valparaíso", -33.0472, -71.6127, 284630, false, "CL"],
  
  ["Caracas", 10.4806, -66.9036, 2082000, true, "VE"],
  ["Quito", -0.1807, -78.4678, 1978376, true, "EC"],
  ["Guayaquil", -2.1710, -79.9224, 2698077, false, "EC"],
  ["La Paz", -16.4897, -68.1193, 812799, true, "BO"],
  ["Montevideo", -34.9011, -56.1645, 1319108, true, "UY"],
  ["Asunción", -25.2637, -57.5759, 525294, true, "PY"],
  ["Georgetown", 6.8013, -58.1551, 235017, true, "GY"],
  ["Paramaribo", 5.8520, -55.2038, 240924, true, "SR"],
  
  // EUROPE
  ["London", 51.5074, -0.1278, 8982000, true, "GB"],
  ["Manchester", 53.4808, -2.2426, 553230, false, "GB"],
  ["Birmingham", 52.4862, -1.8904, 1141816, false, "GB"],
  ["Edinburgh", 55.9533, -3.1883, 524930, false, "GB"],
  ["Glasgow", 55.8642, -4.2518, 633120, false, "GB"],
  
  ["Paris", 48.8566, 2.3522, 2161000, true, "FR"],
  ["Marseille", 43.2965, 5.3698, 870018, false, "FR"],
  ["Lyon", 45.7640, 4.8357, 516092, false, "FR"],
  ["Toulouse", 43.6047, 1.4442, 479553, false, "FR"],
  
  ["Berlin", 52.5200, 13.4050, 3644826, true, "DE"],
  ["Hamburg", 53.5511, 9.9937, 1841179, false, "DE"],
  ["Munich", 48.1351, 11.5820, 1471508, false, "DE"],
  ["Frankfurt", 50.1109, 8.6821, 753056, false, "DE"],
  ["Cologne", 50.9375, 6.9603, 1085664, false, "DE"],
  
  ["Rome", 41.9028, 12.4964, 2872800, true, "IT"],
  ["Milan", 45.4642, 9.1900, 1378689, false, "IT"],
  ["Naples", 40.8518, 14.2681, 959470, false, "IT"],
  ["Turin", 45.0703, 7.6869, 870456, false, "IT"],
  ["Florence", 43.7696, 11.2558, 382808, false, "IT"],
  
  ["Madrid", 40.4168, -3.7038, 3223334, true, "ES"],
  ["Barcelona", 41.3851, 2.1734, 1620343, false, "ES"],
  ["Valencia", 39.4699, -0.3763, 791413, false, "ES"],
  ["Seville", 37.3891, -5.9845, 688711, false, "ES"],
  
  ["Lisbon", 38.7223, -9.1393, 504718, true, "PT"],
  ["Porto", 41.1579, -8.6291, 237591, false, "PT"],
  
  ["Amsterdam", 52.3676, 4.9041, 872680, true, "NL"],
  ["Rotterdam", 51.9244, 4.4777, 651446, false, "NL"],
  
  ["Brussels", 50.8503, 4.3517, 1208542, true, "BE"],
  ["Antwerp", 51.2194, 4.4025, 529247, false, "BE"],
  
  ["Vienna", 48.2082, 16.3738, 1897491, true, "AT"],
  ["Bern", 46.9480, 7.4474, 133883, true, "CH"],
  ["Zurich", 47.3769, 8.5417, 402762, false, "CH"],
  ["Geneva", 46.2044, 6.1432, 201818, false, "CH"],
  
  ["Warsaw", 52.2297, 21.0122, 1790658, true, "PL"],
  ["Kraków", 50.0647, 19.9450, 779115, false, "PL"],
  ["Gdańsk", 54.3520, 18.6466, 470907, false, "PL"],
  
  ["Prague", 50.0755, 14.4378, 1309000, true, "CZ"],
  ["Budapest", 47.4979, 19.0402, 1752286, true, "HU"],
  ["Bucharest", 44.4268, 26.1025, 1883425, true, "RO"],
  ["Sofia", 42.6977, 23.3219, 1307439, true, "SO"],
  
  ["Athens", 37.9838, 23.7275, 664046, true, "GR"],
  ["Thessaloniki", 40.6401, 22.9444, 325182, false, "GR"],
  
  ["Stockholm", 59.3293, 18.0686, 975904, true, "SE"],
  ["Gothenburg", 57.7089, 11.9746, 583056, false, "SE"],
  
  ["Oslo", 59.9139, 10.7522, 693491, true, "NO"],
  ["Bergen", 60.3913, 5.3221, 283929, false, "NO"],
  
  ["Copenhagen", 55.6761, 12.5683, 794128, true, "DK"],
  ["Helsinki", 60.1699, 24.9384, 656229, true, "FI"],
  ["Reykjavik", 64.1466, -21.9426, 131136, true, "IS"],
  
  ["Dublin", 53.3498, -6.2603, 544107, true, "IE"],
  ["Cork", 51.8985, -8.4756, 210000, false, "IE"],
  
  ["Moscow", 55.7558, 37.6173, 12615882, true, "RU"],
  ["Saint Petersburg", 59.9343, 30.3351, 5383890, false, "RU"],
  ["Novosibirsk", 55.0084, 82.9357, 1625631, false, "RU"],
  ["Yekaterinburg", 56.8389, 60.6057, 1493749, false, "RU"],
  ["Vladivostok", 43.1332, 131.9113, 606653, false, "RU"],
  
  ["Kyiv", 50.4501, 30.5234, 2962180, true, "UA"],
  ["Kharkiv", 49.9935, 36.2304, 1433886, false, "UA"],
  ["Odesa", 46.4825, 30.7233, 1015826, false, "UA"],
  
  ["Minsk", 53.9006, 27.5590, 2009786, true, "BY"],
  
  // ASIA
  ["Tokyo", 35.6762, 139.6503, 13960000, true, "JP"],
  ["Osaka", 34.6937, 135.5023, 2753862, false, "JP"],
  ["Yokohama", 35.4437, 139.6380, 3748995, false, "JP"],
  ["Nagoya", 35.1815, 136.9066, 2320361, false, "JP"],
  ["Sapporo", 43.0618, 141.3545, 1973395, false, "JP"],
  ["Kyoto", 35.0116, 135.7681, 1463723, false, "JP"],
  
  ["Beijing", 39.9042, 116.4074, 21540000, true, "CN"],
  ["Shanghai", 31.2304, 121.4737, 24280000, false, "CN"],
  ["Guangzhou", 23.1291, 113.2644, 14900000, false, "CN"],
  ["Shenzhen", 22.5431, 114.0579, 12590000, false, "CN"],
  ["Chengdu", 30.5728, 104.0668, 16330000, false, "CN"],
  ["Chongqing", 29.4316, 106.9123, 15870000, false, "CN"],
  ["Tianjin", 39.3434, 117.3616, 13870000, false, "CN"],
  ["Wuhan", 30.5928, 114.3055, 11080000, false, "CN"],
  ["Xi'an", 34.3416, 108.9398, 12950000, false, "CN"],
  ["Hong Kong", 22.3193, 114.1694, 7500700, false, "CN"],
  
  ["Seoul", 37.5665, 126.9780, 9733509, true, "KR"],
  ["Busan", 35.1796, 129.0756, 3429000, false, "KR"],
  ["Incheon", 37.4563, 126.7052, 2957026, false, "KR"],
  
  ["Pyongyang", 39.0392, 125.7625, 3255388, true, "KP"],
  
  ["Taipei", 25.0330, 121.5654, 2646204, true, "TW"],
  ["Kaohsiung", 22.6273, 120.3014, 2773000, false, "TW"],
  
  ["New Delhi", 28.6139, 77.2090, 16787941, true, "IN"],
  ["Mumbai", 19.0760, 72.8777, 12442373, false, "IN"],
  ["Bangalore", 12.9716, 77.5946, 8443675, false, "IN"],
  ["Chennai", 13.0827, 80.2707, 7088000, false, "IN"],
  ["Kolkata", 22.5726, 88.3639, 4496694, false, "IN"],
  ["Hyderabad", 17.3850, 78.4867, 6809970, false, "IN"],
  ["Ahmedabad", 23.0225, 72.5714, 5570585, false, "IN"],
  ["Pune", 18.5204, 73.8567, 3124458, false, "IN"],
  
  ["Islamabad", 33.6844, 73.0479, 1014825, true, "PK"],
  ["Karachi", 24.8607, 67.0011, 14910352, false, "PK"],
  ["Lahore", 31.5204, 74.3587, 11126285, false, "PK"],
  
  ["Dhaka", 23.8103, 90.4125, 8906039, true, "BD"],
  ["Chittagong", 22.3569, 91.7832, 2592439, false, "BD"],
  
  ["Colombo", 6.9271, 79.8612, 752993, true, "LK"],
  ["Kathmandu", 27.7172, 85.3240, 1442271, true, "NP"],
  
  ["Bangkok", 13.7563, 100.5018, 10539000, true, "TH"],
  ["Chiang Mai", 18.7883, 98.9853, 131091, false, "TH"],
  
  ["Hanoi", 21.0278, 105.8342, 8053663, true, "VN"],
  ["Ho Chi Minh City", 10.8231, 106.6297, 8993082, false, "VN"],
  
  ["Singapore", 1.3521, 103.8198, 5685807, true, "SG"],
  
  ["Kuala Lumpur", 3.1390, 101.6869, 1782500, true, "MY"],
  ["George Town", 5.4141, 100.3288, 708127, false, "MY"],
  
  ["Jakarta", -6.2088, 106.8456, 10562088, true, "ID"],
  ["Surabaya", -7.2575, 112.7521, 2874000, false, "ID"],
  ["Bandung", -6.9175, 107.6191, 2575478, false, "ID"],
  ["Bali", -8.3405, 115.0920, 4225000, false, "ID"],
  
  ["Manila", 14.5995, 120.9842, 1846513, true, "PH"],
  ["Quezon City", 14.6760, 121.0437, 2960048, false, "PH"],
  ["Cebu City", 10.3157, 123.8854, 922611, false, "PH"],
  
  ["Phnom Penh", 11.5564, 104.9282, 2129371, true, "KH"],
  ["Vientiane", 17.9757, 102.6331, 820940, true, "LA"],
  ["Naypyidaw", 19.7633, 96.0785, 1160242, true, "MM"],
  ["Yangon", 16.8661, 96.1951, 5160512, false, "MM"],
  
  // MIDDLE EAST
  ["Ankara", 39.9334, 32.8597, 5663322, true, "TR"],
  ["Istanbul", 41.0082, 28.9784, 15462452, false, "TR"],
  ["Izmir", 38.4192, 27.1287, 4367251, false, "TR"],
  
  ["Tehran", 35.6892, 51.3890, 8693706, true, "IR"],
  ["Mashhad", 36.2605, 59.6168, 3001184, false, "IR"],
  ["Isfahan", 32.6546, 51.6680, 1961260, false, "IR"],
  
  ["Baghdad", 33.3152, 44.3661, 8126755, true, "IQ"],
  ["Basra", 30.5085, 47.7804, 2750000, false, "IQ"],
  
  ["Riyadh", 24.7136, 46.6753, 7676654, true, "SA"],
  ["Jeddah", 21.4858, 39.1925, 4697000, false, "SA"],
  ["Mecca", 21.3891, 39.8579, 2042106, false, "SA"],
  
  ["Abu Dhabi", 24.4539, 54.3773, 1483000, true, "AE"],
  ["Dubai", 25.2048, 55.2708, 3331420, false, "AE"],
  
  ["Doha", 25.2854, 51.5310, 2382000, true, "QA"],
  ["Kuwait City", 29.3759, 47.9774, 3114553, true, "KW"],
  ["Manama", 26.2285, 50.5860, 157474, true, "BH"],
  ["Muscat", 23.5880, 58.3829, 1421409, true, "OM"],
  
  ["Jerusalem", 31.7683, 35.2137, 936425, true, "IL"],
  ["Tel Aviv", 32.0853, 34.7818, 460613, false, "IL"],
  
  ["Amman", 31.9454, 35.9284, 4007526, true, "JO"],
  ["Beirut", 33.8938, 35.5018, 2424400, true, "LB"],
  ["Damascus", 33.5138, 36.2765, 2079000, true, "SY"],
  
  ["Kabul", 34.5281, 69.1723, 4434550, true, "AF"],
  ["Tashkent", 41.2995, 69.2401, 2571668, true, "UZ"],
  ["Almaty", 43.2220, 76.8512, 1977011, false, "KZ"],
  ["Astana", 51.1605, 71.4704, 1136008, true, "KZ"],
  
  // AFRICA
  ["Cairo", 30.0444, 31.2357, 20076000, true, "EG"],
  ["Alexandria", 31.2001, 29.9187, 5200000, false, "EG"],
  
  ["Algiers", 36.7538, 3.0588, 3415811, true, "DZ"],
  ["Oran", 35.6969, -0.6331, 1454078, false, "DZ"],
  
  ["Rabat", 34.0209, -6.8416, 577827, true, "MA"],
  ["Casablanca", 33.5731, -7.5898, 3359818, false, "MA"],
  ["Marrakech", 31.6295, -7.9811, 928850, false, "MA"],
  
  ["Tunis", 36.8065, 10.1815, 2643695, true, "TN"],
  ["Tripoli", 32.8872, 13.1913, 1150989, true, "LY"],
  
  ["Lagos", 6.5244, 3.3792, 14862000, false, "NG"],
  ["Abuja", 9.0765, 7.3986, 3277740, true, "NG"],
  ["Kano", 12.0022, 8.5920, 3931300, false, "NG"],
  
  ["Accra", 5.6037, -0.1870, 2291352, true, "GH"],
  ["Dakar", 14.7167, -17.4677, 2476400, true, "SN"],
  ["Abidjan", 5.3600, -4.0083, 4395243, false, "CI"],
  ["Yamoussoukro", 6.8276, -5.2893, 281071, true, "CI"],
  
  ["Nairobi", -1.2921, 36.8219, 4397073, true, "KE"],
  ["Mombasa", -4.0435, 39.6682, 1208333, false, "KE"],
  
  ["Addis Ababa", 9.0320, 38.7469, 3384569, true, "ET"],
  ["Kampala", 0.3476, 32.5825, 1680600, true, "UG"],
  ["Dar es Salaam", -6.7924, 39.2083, 6702000, false, "TZ"],
  ["Dodoma", -6.1630, 35.7516, 410956, true, "TZ"],
  ["Kigali", -1.9403, 29.8739, 1132686, true, "RW"],
  
  ["Kinshasa", -4.4419, 15.2663, 14342000, true, "CD"],
  ["Lubumbashi", -11.6876, 27.5026, 1786397, false, "CD"],
  
  ["Luanda", -8.8390, 13.2894, 8330000, true, "AO"],
  ["Maputo", -25.9692, 32.5732, 1101170, true, "MZ"],
  ["Harare", -17.8252, 31.0335, 1606000, true, "ZW"],
  ["Lusaka", -15.3875, 28.3228, 2774000, true, "ZM"],
  
  ["Pretoria", -25.7479, 28.2293, 741651, true, "ZA"],
  ["Johannesburg", -26.2041, 28.0473, 5635127, false, "ZA"],
  ["Cape Town", -33.9249, 18.4241, 4618000, false, "ZA"],
  ["Durban", -29.8587, 31.0218, 3720953, false, "ZA"],
  
  ["Antananarivo", -18.8792, 47.5079, 1391433, true, "MG"],
  ["Port Louis", -20.1609, 57.5012, 147066, true, "MU"],
  
  // OCEANIA
  ["Canberra", -35.2809, 149.1300, 453558, true, "AU"],
  ["Sydney", -33.8688, 151.2093, 5312000, false, "AU"],
  ["Melbourne", -37.8136, 144.9631, 5078193, false, "AU"],
  ["Brisbane", -27.4698, 153.0251, 2514184, false, "AU"],
  ["Perth", -31.9505, 115.8605, 2085973, false, "AU"],
  ["Adelaide", -34.9285, 138.6007, 1345777, false, "AU"],
  
  ["Wellington", -41.2865, 174.7762, 215400, true, "NZ"],
  ["Auckland", -36.8509, 174.7645, 1657200, false, "NZ"],
  ["Christchurch", -43.5321, 172.6362, 381500, false, "NZ"],
  
  ["Suva", -18.1416, 178.4419, 93970, true, "FJ"],
  ["Port Moresby", -9.4438, 147.1803, 364145, true, "PG"],
  ["Apia", -13.8333, -171.7500, 36735, true, "WS"],
  ["Nuku'alofa", -21.2167, -175.1500, 24571, true, "TO"],
  ["Honolulu", 21.3069, -157.8583, 350964, false, "US"]
];

// Country name to code mapping for news lookup
export const COUNTRY_NAMES = {
  "US": "United States",
  "CA": "Canada",
  "MX": "Mexico",
  "CU": "Cuba",
  "JM": "Jamaica",
  "PA": "Panama",
  "CR": "Costa Rica",
  "GT": "Guatemala",
  "BR": "Brazil",
  "AR": "Argentina",
  "PE": "Peru",
  "CO": "Colombia",
  "CL": "Chile",
  "VE": "Venezuela",
  "EC": "Ecuador",
  "BO": "Bolivia",
  "UY": "Uruguay",
  "PY": "Paraguay",
  "GY": "Guyana",
  "SR": "Suriname",
  "GB": "United Kingdom",
  "FR": "France",
  "DE": "Germany",
  "IT": "Italy",
  "ES": "Spain",
  "PT": "Portugal",
  "NL": "Netherlands",
  "BE": "Belgium",
  "AT": "Austria",
  "CH": "Switzerland",
  "PL": "Poland",
  "CZ": "Czech Republic",
  "HU": "Hungary",
  "RO": "Romania",
  "BG": "Bulgaria",
  "GR": "Greece",
  "SE": "Sweden",
  "NO": "Norway",
  "DK": "Denmark",
  "FI": "Finland",
  "IS": "Iceland",
  "IE": "Ireland",
  "RU": "Russia",
  "UA": "Ukraine",
  "BY": "Belarus",
  "JP": "Japan",
  "CN": "China",
  "KR": "South Korea",
  "KP": "North Korea",
  "TW": "Taiwan",
  "IN": "India",
  "PK": "Pakistan",
  "BD": "Bangladesh",
  "LK": "Sri Lanka",
  "NP": "Nepal",
  "TH": "Thailand",
  "VN": "Vietnam",
  "SG": "Singapore",
  "MY": "Malaysia",
  "ID": "Indonesia",
  "PH": "Philippines",
  "KH": "Cambodia",
  "LA": "Laos",
  "MM": "Myanmar",
  "TR": "Turkey",
  "IR": "Iran",
  "IQ": "Iraq",
  "SA": "Saudi Arabia",
  "AE": "United Arab Emirates",
  "QA": "Qatar",
  "KW": "Kuwait",
  "BH": "Bahrain",
  "OM": "Oman",
  "IL": "Israel",
  "JO": "Jordan",
  "LB": "Lebanon",
  "SY": "Syria",
  "AF": "Afghanistan",
  "UZ": "Uzbekistan",
  "KZ": "Kazakhstan",
  "EG": "Egypt",
  "DZ": "Algeria",
  "MA": "Morocco",
  "TN": "Tunisia",
  "LY": "Libya",
  "NG": "Nigeria",
  "GH": "Ghana",
  "SN": "Senegal",
  "CI": "Ivory Coast",
  "KE": "Kenya",
  "ET": "Ethiopia",
  "UG": "Uganda",
  "TZ": "Tanzania",
  "RW": "Rwanda",
  "CD": "DR Congo",
  "AO": "Angola",
  "MZ": "Mozambique",
  "ZW": "Zimbabwe",
  "ZM": "Zambia",
  "ZA": "South Africa",
  "MG": "Madagascar",
  "MU": "Mauritius",
  "AU": "Australia",
  "NZ": "New Zealand",
  "FJ": "Fiji",
  "PG": "Papua New Guinea",
  "WS": "Samoa",
  "TO": "Tonga"
};
