// ============================================================================
// CONFIGURATION
// ============================================================================
const CONFIG = {
  // Get a free token at https://cesium.com/ion/tokens
  CESIUM_ION_TOKEN: 'YOUR_CESIUM_ION_TOKEN',
  
  // Rotation speed (radians per second)
  ROTATION_SPEED: 0.0001,
  
  // Weather update interval (ms)
  WEATHER_UPDATE_INTERVAL: 60 * 60 * 1000, // 1 hour
  
  // Initial camera position
  INITIAL_CAMERA: {
    longitude: 0,
    latitude: 20,
    height: 15000000 // 15,000 km
  },
  
  // Label visibility settings
  LABELS: {
    // Distance thresholds for label visibility (in meters)
    CAPITAL_MAX_DISTANCE: 15000000,      // 15,000 km - capitals always visible from far
    MAJOR_CITY_MAX_DISTANCE: 6000000,    // 6,000 km - major cities (pop > 5M)
    SECONDARY_CITY_MAX_DISTANCE: 2000000, // 2,000 km - secondary cities
    
    // Population thresholds
    MAJOR_CITY_POPULATION: 5000000,
    
    // Font sizes
    CAPITAL_FONT_SIZE: 16,
    MAJOR_CITY_FONT_SIZE: 12,
    SECONDARY_CITY_FONT_SIZE: 10
  }
};

// ============================================================================
// INITIALIZATION
// ============================================================================
// Set initial token, will be updated asynchronously
Cesium.Ion.defaultAccessToken = 'YOUR_CESIUM_ION_TOKEN';

// Get API key from main process and update token
async function initializeApiKeys() {
  try {
    const cesiumToken = await window.electronAPI.getApiKey('cesium');
    Cesium.Ion.defaultAccessToken = cesiumToken;
    console.log('Cesium token updated successfully');
  } catch (error) {
    console.error('Failed to get Cesium token:', error);
  }
}

// Create viewer with absolute minimal configuration
const viewer = new Cesium.Viewer('cesiumContainer', {
  // Hide all UI controls for screensaver mode
  animation: false,
  timeline: false,
  baseLayerPicker: false,
  geocoder: false,
  homeButton: false,
  sceneModePicker: false,
  navigationHelpButton: false,
  fullscreenButton: false,
  vrButton: false,
  selectionIndicator: false,  // Disable green reticle
  infoBox: true  // enable info box
});

// Keep overlays visible even when clamped entities intersect terrain
viewer.scene.globe.depthTestAgainstTerrain = false;
viewer.scene.pickTranslucentDepth = false; // Disable to prevent WebGL bindTexture errors

// Initialize API keys and then load assets that depend on them
async function initializeApp() {
  try {
    // Get real API keys first
    const cesiumToken = await window.electronAPI.getApiKey('cesium');
    Cesium.Ion.defaultAccessToken = cesiumToken;
    console.log('Cesium token updated successfully:', cesiumToken.substring(0, 20) + '...');
    
    // Now load assets that require authentication
    await loadBingMapsImagery();
    
    // Continue with rest of setup
    setupScene();
    
  } catch (error) {
    console.error('Failed to initialize app:', error);
    // Fallback to basic setup without authenticated assets
    setupScene();
  }
}

async function loadBingMapsImagery() {
  try {
    const imageryProvider = await Cesium.IonImageryProvider.fromAssetId(3);
    const imageryLayer = viewer.imageryLayers.addImageryProvider(imageryProvider);
    
    // Enhance color saturation and contrast for deeper colors
    imageryLayer.saturation = 1.3; // Increase saturation by 30%
    imageryLayer.contrast = 1.2;   // Increase contrast by 20%
    imageryLayer.brightness = 0.85; // Slightly reduce brightness to deepen colors
    console.log('Bing Maps imagery loaded successfully');
  } catch (error) {
    console.error('Failed to load Bing Maps imagery:', error);
  }
}

function setupScene() {
  // Enable realistic lighting
  viewer.scene.globe.enableLighting = true;
  // Disable dynamic atmosphere lighting for now to avoid initialization errors
  // viewer.scene.globe.dynamicAtmosphereLighting = true;
  // viewer.scene.globe.dynamicAtmosphereLightingFromSun = true;

  // Add atmosphere with reduced brightness for deeper colors
  viewer.scene.skyAtmosphere.show = true;
  viewer.scene.skyAtmosphere.brightnessShift = -0.1; // Reduce atmosphere brightness

  // Remove stars background but keep sun and moon
  viewer.scene.skyBox.show = false;
  viewer.scene.backgroundColor = Cesium.Color.BLACK;

  // Set initial camera position
  viewer.camera.setView({
    destination: Cesium.Cartesian3.fromDegrees(
      CONFIG.INITIAL_CAMERA.longitude,
      CONFIG.INITIAL_CAMERA.latitude,
      CONFIG.INITIAL_CAMERA.height
    )
  });

  console.log('Scene setup completed');
}

// Initialize the app when DOM is ready
document.addEventListener('DOMContentLoaded', initializeApp);

// ============================================================================
// CITY LABELS (Capitals and Secondary Cities)
// ============================================================================
// Inline city data to avoid module loading issues in Electron
const CITIES = [
  // NORTH AMERICA
  ["Washington D.C.", 38.9072, -77.0369, 705749, true, "US"],
  ["New York", 40.7128, -74.0060, 8336817, false, "US"],
  ["Los Angeles", 34.0522, -118.2437, 3979576, false, "US"],
  ["Chicago", 41.8781, -87.6298, 2693976, false, "US"],
  ["Houston", 29.7604, -95.3698, 2320268, false, "US"],
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
  
  ["Mexico City", 19.4326, -99.1332, 8918653, true, "MX"],
  ["Guadalajara", 20.6597, -103.3496, 1495182, false, "MX"],
  
  ["Havana", 23.1136, -82.3666, 2106146, true, "CU"],
  ["Panama City", 8.9824, -79.5199, 880691, true, "PA"],
  ["San José", 9.9281, -84.0907, 342188, true, "CR"],
  ["Guatemala City", 14.6349, -90.5069, 2450212, true, "GT"],
  
  // SOUTH AMERICA
  ["Brasília", -15.8267, -47.9218, 2852372, true, "BR"],
  ["São Paulo", -23.5505, -46.6333, 12325232, false, "BR"],
  ["Rio de Janeiro", -22.9068, -43.1729, 6747815, false, "BR"],
  ["Salvador", -12.9714, -38.5014, 2886698, false, "BR"],
  
  ["Buenos Aires", -34.6037, -58.3816, 2891082, true, "AR"],
  ["Córdoba", -31.4201, -64.1888, 1391000, false, "AR"],
  
  ["Lima", -12.0464, -77.0428, 9751717, true, "PE"],
  ["Bogotá", 4.7110, -74.0721, 7181469, true, "CO"],
  ["Medellín", 6.2476, -75.5658, 2569007, false, "CO"],
  
  ["Santiago", -33.4489, -70.6693, 5614000, true, "CL"],
  ["Caracas", 10.4806, -66.9036, 2082000, true, "VE"],
  ["Quito", -0.1807, -78.4678, 1978376, true, "EC"],
  ["La Paz", -16.4897, -68.1193, 812799, true, "BO"],
  ["Montevideo", -34.9011, -56.1645, 1319108, true, "UY"],
  ["Asunción", -25.2637, -57.5759, 525294, true, "PY"],
  
  // EUROPE
  ["London", 51.5074, -0.1278, 8982000, true, "GB"],
  ["Manchester", 53.4808, -2.2426, 553230, false, "GB"],
  ["Birmingham", 52.4862, -1.8904, 1141816, false, "GB"],
  ["Edinburgh", 55.9533, -3.1883, 524930, false, "GB"],
  
  ["Paris", 48.8566, 2.3522, 2161000, true, "FR"],
  ["Marseille", 43.2965, 5.3698, 870018, false, "FR"],
  ["Lyon", 45.7640, 4.8357, 516092, false, "FR"],
  
  ["Berlin", 52.5200, 13.4050, 3644826, true, "DE"],
  ["Hamburg", 53.5511, 9.9937, 1841179, false, "DE"],
  ["Munich", 48.1351, 11.5820, 1471508, false, "DE"],
  ["Frankfurt", 50.1109, 8.6821, 753056, false, "DE"],
  
  ["Rome", 41.9028, 12.4964, 2872800, true, "IT"],
  ["Milan", 45.4642, 9.1900, 1378689, false, "IT"],
  ["Naples", 40.8518, 14.2681, 959470, false, "IT"],
  
  ["Madrid", 40.4168, -3.7038, 3223334, true, "ES"],
  ["Barcelona", 41.3851, 2.1734, 1620343, false, "ES"],
  ["Valencia", 39.4699, -0.3763, 791413, false, "ES"],
  
  ["Lisbon", 38.7223, -9.1393, 504718, true, "PT"],
  ["Amsterdam", 52.3676, 4.9041, 872680, true, "NL"],
  ["Brussels", 50.8503, 4.3517, 1208542, true, "BE"],
  ["Vienna", 48.2082, 16.3738, 1897491, true, "AT"],
  ["Bern", 46.9480, 7.4474, 133883, true, "CH"],
  ["Zurich", 47.3769, 8.5417, 402762, false, "CH"],
  
  ["Warsaw", 52.2297, 21.0122, 1790658, true, "PL"],
  ["Kraków", 50.0647, 19.9450, 779115, false, "PL"],
  
  ["Prague", 50.0755, 14.4378, 1309000, true, "CZ"],
  ["Budapest", 47.4979, 19.0402, 1752286, true, "HU"],
  ["Bucharest", 44.4268, 26.1025, 1883425, true, "RO"],
  ["Sofia", 42.6977, 23.3219, 1307439, true, "BG"],
  ["Athens", 37.9838, 23.7275, 664046, true, "GR"],
  
  ["Stockholm", 59.3293, 18.0686, 975904, true, "SE"],
  ["Oslo", 59.9139, 10.7522, 693491, true, "NO"],
  ["Copenhagen", 55.6761, 12.5683, 794128, true, "DK"],
  ["Helsinki", 60.1699, 24.9384, 656229, true, "FI"],
  ["Reykjavik", 64.1466, -21.9426, 131136, true, "IS"],
  ["Dublin", 53.3498, -6.2603, 544107, true, "IE"],
  
  ["Moscow", 55.7558, 37.6173, 12615882, true, "RU"],
  ["Saint Petersburg", 59.9343, 30.3351, 5383890, false, "RU"],
  ["Novosibirsk", 55.0084, 82.9357, 1625631, false, "RU"],
  ["Vladivostok", 43.1332, 131.9113, 606653, false, "RU"],
  
  ["Kyiv", 50.4501, 30.5234, 2962180, true, "UA"],
  ["Minsk", 53.9006, 27.5590, 2009786, true, "BY"],
  
  // ASIA
  ["Tokyo", 35.6762, 139.6503, 13960000, true, "JP"],
  ["Osaka", 34.6937, 135.5023, 2753862, false, "JP"],
  ["Yokohama", 35.4437, 139.6380, 3748995, false, "JP"],
  ["Kyoto", 35.0116, 135.7681, 1463723, false, "JP"],
  
  ["Beijing", 39.9042, 116.4074, 21540000, true, "CN"],
  ["Shanghai", 31.2304, 121.4737, 24280000, false, "CN"],
  ["Guangzhou", 23.1291, 113.2644, 14900000, false, "CN"],
  ["Shenzhen", 22.5431, 114.0579, 12590000, false, "CN"],
  ["Chengdu", 30.5728, 104.0668, 16330000, false, "CN"],
  ["Hong Kong", 22.3193, 114.1694, 7500700, false, "CN"],
  
  ["Seoul", 37.5665, 126.9780, 9733509, true, "KR"],
  ["Busan", 35.1796, 129.0756, 3429000, false, "KR"],
  
  ["Pyongyang", 39.0392, 125.7625, 3255388, true, "KP"],
  ["Taipei", 25.0330, 121.5654, 2646204, true, "TW"],
  
  ["New Delhi", 28.6139, 77.2090, 16787941, true, "IN"],
  ["Mumbai", 19.0760, 72.8777, 12442373, false, "IN"],
  ["Bangalore", 12.9716, 77.5946, 8443675, false, "IN"],
  ["Chennai", 13.0827, 80.2707, 7088000, false, "IN"],
  ["Kolkata", 22.5726, 88.3639, 4496694, false, "IN"],
  
  ["Islamabad", 33.6844, 73.0479, 1014825, true, "PK"],
  ["Karachi", 24.8607, 67.0011, 14910352, false, "PK"],
  ["Lahore", 31.5204, 74.3587, 11126285, false, "PK"],
  
  ["Dhaka", 23.8103, 90.4125, 8906039, true, "BD"],
  ["Bangkok", 13.7563, 100.5018, 10539000, true, "TH"],
  ["Hanoi", 21.0278, 105.8342, 8053663, true, "VN"],
  ["Ho Chi Minh City", 10.8231, 106.6297, 8993082, false, "VN"],
  ["Singapore", 1.3521, 103.8198, 5685807, true, "SG"],
  ["Kuala Lumpur", 3.1390, 101.6869, 1782500, true, "MY"],
  
  ["Jakarta", -6.2088, 106.8456, 10562088, true, "ID"],
  ["Surabaya", -7.2575, 112.7521, 2874000, false, "ID"],
  
  ["Manila", 14.5995, 120.9842, 1846513, true, "PH"],
  ["Phnom Penh", 11.5564, 104.9282, 2129371, true, "KH"],
  ["Yangon", 16.8661, 96.1951, 5160512, false, "MM"],
  
  // MIDDLE EAST
  ["Ankara", 39.9334, 32.8597, 5663322, true, "TR"],
  ["Istanbul", 41.0082, 28.9784, 15462452, false, "TR"],
  
  ["Tehran", 35.6892, 51.3890, 8693706, true, "IR"],
  ["Baghdad", 33.3152, 44.3661, 8126755, true, "IQ"],
  
  ["Riyadh", 24.7136, 46.6753, 7676654, true, "SA"],
  ["Jeddah", 21.4858, 39.1925, 4697000, false, "SA"],
  
  ["Abu Dhabi", 24.4539, 54.3773, 1483000, true, "AE"],
  ["Dubai", 25.2048, 55.2708, 3331420, false, "AE"],
  
  ["Doha", 25.2854, 51.5310, 2382000, true, "QA"],
  ["Kuwait City", 29.3759, 47.9774, 3114553, true, "KW"],
  
  ["Jerusalem", 31.7683, 35.2137, 936425, true, "IL"],
  ["Tel Aviv", 32.0853, 34.7818, 460613, false, "IL"],
  
  ["Amman", 31.9454, 35.9284, 4007526, true, "JO"],
  ["Beirut", 33.8938, 35.5018, 2424400, true, "LB"],
  ["Damascus", 33.5138, 36.2765, 2079000, true, "SY"],
  ["Kabul", 34.5281, 69.1723, 4434550, true, "AF"],
  
  // AFRICA
  ["Cairo", 30.0444, 31.2357, 20076000, true, "EG"],
  ["Alexandria", 31.2001, 29.9187, 5200000, false, "EG"],
  
  ["Algiers", 36.7538, 3.0588, 3415811, true, "DZ"],
  ["Rabat", 34.0209, -6.8416, 577827, true, "MA"],
  ["Casablanca", 33.5731, -7.5898, 3359818, false, "MA"],
  ["Tunis", 36.8065, 10.1815, 2643695, true, "TN"],
  ["Tripoli", 32.8872, 13.1913, 1150989, true, "LY"],
  
  ["Lagos", 6.5244, 3.3792, 14862000, false, "NG"],
  ["Abuja", 9.0765, 7.3986, 3277740, true, "NG"],
  
  ["Accra", 5.6037, -0.1870, 2291352, true, "GH"],
  ["Dakar", 14.7167, -17.4677, 2476400, true, "SN"],
  
  ["Nairobi", -1.2921, 36.8219, 4397073, true, "KE"],
  ["Addis Ababa", 9.0320, 38.7469, 3384569, true, "ET"],
  ["Kampala", 0.3476, 32.5825, 1680600, true, "UG"],
  
  ["Kinshasa", -4.4419, 15.2663, 14342000, true, "CD"],
  ["Luanda", -8.8390, 13.2894, 8330000, true, "AO"],
  ["Harare", -17.8252, 31.0335, 1606000, true, "ZW"],
  
  ["Pretoria", -25.7479, 28.2293, 741651, true, "ZA"],
  ["Johannesburg", -26.2041, 28.0473, 5635127, false, "ZA"],
  ["Cape Town", -33.9249, 18.4241, 4618000, false, "ZA"],
  
  // OCEANIA
  ["Canberra", -35.2809, 149.1300, 453558, true, "AU"],
  ["Sydney", -33.8688, 151.2093, 5312000, false, "AU"],
  ["Melbourne", -37.8136, 144.9631, 5078193, false, "AU"],
  ["Brisbane", -27.4698, 153.0251, 2514184, false, "AU"],
  ["Perth", -31.9505, 115.8605, 2085973, false, "AU"],
  
  ["Wellington", -41.2865, 174.7762, 215400, true, "NZ"],
  ["Auckland", -36.8509, 174.7645, 1657200, false, "NZ"],
  
  ["Suva", -18.1416, 178.4419, 93970, true, "FJ"],
  ["Port Moresby", -9.4438, 147.1803, 364145, true, "PG"],
  ["Honolulu", 21.3069, -157.8583, 350964, false, "US"]
];

// Create label collection for cities
const labelCollection = viewer.scene.primitives.add(new Cesium.LabelCollection());
const billboardCollection = viewer.scene.primitives.add(new Cesium.BillboardCollection());

// Store label references for visibility updates
const cityLabels = [];

// Create labels for each city
CITIES.forEach(([name, lat, lon, population, isCapital, countryCode]) => {
  const position = Cesium.Cartesian3.fromDegrees(lon, lat);
  
  // Determine label style based on city type
  let fontSize, fillColor, outlineColor, outlineWidth, style;
  
  if (isCapital) {
    fontSize = CONFIG.LABELS.CAPITAL_FONT_SIZE;
    fillColor = Cesium.Color.fromCssColorString('#FFD700'); // Gold for capitals
    outlineColor = Cesium.Color.BLACK;
    outlineWidth = 3;
    style = Cesium.LabelStyle.FILL_AND_OUTLINE;
  } else if (population >= CONFIG.LABELS.MAJOR_CITY_POPULATION && isCapital === false) {
    fontSize = CONFIG.LABELS.MAJOR_CITY_FONT_SIZE;
    fillColor = Cesium.Color.WHITE;
    outlineColor = Cesium.Color.BLACK;
    outlineWidth = 2;
    style = Cesium.LabelStyle.FILL_AND_OUTLINE;
  } else {
    fontSize = CONFIG.LABELS.SECONDARY_CITY_FONT_SIZE;
    fillColor = Cesium.Color.fromCssColorString('#CCCCCC');
    outlineColor = Cesium.Color.BLACK;
    outlineWidth = 2;
    style = Cesium.LabelStyle.FILL_AND_OUTLINE;
  }
  
  // Add city marker (small dot)
  const billboard = billboardCollection.add({
    position: position,
    image: createCityMarker(isCapital),
    verticalOrigin: Cesium.VerticalOrigin.CENTER,
    horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
    scale: isCapital ? 1.0 : 0.7,
    translucencyByDistance: new Cesium.NearFarScalar(1e6, 1.0, 2e7, 0.3)
  });
  
  // Add label
  const label = labelCollection.add({
    position: position,
    text: name,
    font: `bold ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`,
    fillColor: fillColor,
    outlineColor: outlineColor,
    outlineWidth: outlineWidth,
    style: style,
    verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
    horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
    pixelOffset: new Cesium.Cartesian2(0, -8),
    // Scale labels based on distance
    scaleByDistance: new Cesium.NearFarScalar(1e6, 1.0, 1e7, 0.5),
    // Fade labels based on distance
    translucencyByDistance: new Cesium.NearFarScalar(
      1e6, 1.0,
      isCapital ? CONFIG.LABELS.CAPITAL_MAX_DISTANCE : 
        (population >= CONFIG.LABELS.MAJOR_CITY_POPULATION ? 
          CONFIG.LABELS.MAJOR_CITY_MAX_DISTANCE : 
          CONFIG.LABELS.SECONDARY_CITY_MAX_DISTANCE),
      0.0
    ),
    // Disable depth test so labels are always visible
    disableDepthTestDistance: Number.POSITIVE_INFINITY
  });
  
  cityLabels.push({
    label,
    billboard,
    isCapital,
    population,
    position
  });
});

// Create a canvas-based city marker
function createCityMarker(isCapital) {
  const size = isCapital ? 12 : 8;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  
  // Draw circle
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2 - 1, 0, Math.PI * 2);
  
  if (isCapital) {
    // Gold fill with white border for capitals
    ctx.fillStyle = '#FFD700';
    ctx.fill();
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  } else {
    // White fill with dark border for other cities
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
    ctx.strokeStyle = '#333333';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  
  return canvas.toDataURL();
}

// Update label visibility based on camera distance
function updateLabelVisibility() {
  const cameraPosition = viewer.camera.positionWC;
  const cameraHeight = viewer.camera.positionCartographic.height;
  
  cityLabels.forEach(({ label, billboard, isCapital, population }) => {
    // Determine max visible distance based on city type
    let maxDistance;
    if (isCapital) {
      maxDistance = CONFIG.LABELS.CAPITAL_MAX_DISTANCE;
    } else if (population >= CONFIG.LABELS.MAJOR_CITY_POPULATION) {
      maxDistance = CONFIG.LABELS.MAJOR_CITY_MAX_DISTANCE;
    } else {
      maxDistance = CONFIG.LABELS.SECONDARY_CITY_MAX_DISTANCE;
    }
    
    // Show/hide based on camera height (simpler than per-label distance)
    const shouldShow = cameraHeight <= maxDistance;
    label.show = shouldShow;
    billboard.show = shouldShow;
  });
}

// Update labels periodically
viewer.scene.postRender.addEventListener(updateLabelVisibility);

// ============================================================================
// DAY/NIGHT CYCLE
// ============================================================================
function updateSunPosition() {
  const now = new Date();
  const julianDate = Cesium.JulianDate.fromDate(now);
  viewer.scene.globe.lightingFadeOutDistance = 1e7;
  viewer.scene.globe.lightingFadeInDistance = 2e7;
  
  // CesiumJS automatically calculates sun position from clock
  viewer.clock.currentTime = julianDate;
}

// Update sun position every minute
setInterval(updateSunPosition, 60000);
updateSunPosition();

// ============================================================================
// GLOBE ROTATION (Auto-spin)
// ============================================================================
let autoRotate = true;
let lastRotateTime = Date.now();

function rotateGlobe() {
  if (!autoRotate) return;
  
  const now = Date.now();
  const delta = (now - lastRotateTime) / 1000;
  lastRotateTime = now;
  
  // Rotate camera around the globe (not the globe itself)
  // This keeps the day/night terminator stationary relative to Earth
  viewer.camera.rotateRight(CONFIG.ROTATION_SPEED * delta * 60);
}

// ============================================================================
// MOUSE INTERACTION (Manual spin)
// ============================================================================
let isDragging = false;
let lastMouseX = 0;
let lastMouseY = 0;
let mouseDownX = 0;
let mouseDownY = 0;
let dragVelocity = 0;

// News box dragging state (declared before canvas handlers)
let isDraggingNewsBox = false;
let dragOffsetX = 0;
let dragOffsetY = 0;

const canvas = viewer.canvas;

canvas.addEventListener('mousedown', (e) => {
  // Prevent globe interaction if news box is being dragged
  if (isDraggingNewsBox) return;
  
  isDragging = true;
  lastMouseX = e.clientX;
  lastMouseY = e.clientY;
  mouseDownX = e.clientX;
  mouseDownY = e.clientY;
  autoRotate = false;
  dragVelocity = 0;
});

canvas.addEventListener('mousemove', (e) => {
  if (!isDragging) return;

  const deltaX = e.clientX - lastMouseX;
  dragVelocity = deltaX * 0.001;
  viewer.camera.rotateRight(-dragVelocity);
  lastMouseX = e.clientX;
  lastMouseY = e.clientY;
});

canvas.addEventListener('mouseup', () => {
  isDragging = false;

  // Apply momentum
  const decelerate = setInterval(() => {
    if (Math.abs(dragVelocity) < 0.0001) {
      clearInterval(decelerate);
      autoRotate = true;
      return;
    }
    viewer.camera.rotateRight(-dragVelocity);
    dragVelocity *= 0.95; // Friction
  }, 16);
});

canvas.addEventListener('mouseleave', () => {
  isDragging = false;
});

// Helper to check if mouse moved significantly (indicates drag vs click)
function wasDragged(mouseUpX, mouseUpY) {
  const dx = mouseUpX - mouseDownX;
  const dy = mouseUpY - mouseDownY;
  return Math.sqrt(dx * dx + dy * dy) > 50; // 50 pixel threshold - more forgiving
}

// ============================================================================
// COUNTRY CLICK -> NEWS
// ============================================================================
// Country code mapping (simplified - expand as needed)
const COUNTRY_CODES = {
  'United States': 'us',
  'United States of America': 'us',
  'United Kingdom': 'gb',
  'Germany': 'de',
  'France': 'fr',
  'Japan': 'jp',
  'China': 'cn',
  'India': 'in',
  'Brazil': 'br',
  'Australia': 'au',
  'Canada': 'ca',
  'Russia': 'ru',
  'Italy': 'it',
  'Spain': 'es',
  'Mexico': 'mx',
  'South Korea': 'kr',
  'Netherlands': 'nl',
  'Switzerland': 'ch',
  'Sweden': 'se',
  'Norway': 'no',
  'Denmark': 'dk',
  'Finland': 'fi',
  'Poland': 'pl',
  'Austria': 'at',
  'Belgium': 'be',
  'Portugal': 'pt',
  'Greece': 'gr',
  'Ireland': 'ie',
  'New Zealand': 'nz',
  'Singapore': 'sg',
  'Israel': 'il',
  'South Africa': 'za',
  'Argentina': 'ar',
  'Egypt': 'eg',
  'Turkey': 'tr',
  'Saudi Arabia': 'sa',
  'United Arab Emirates': 'ae',
  'Indonesia': 'id',
  'Malaysia': 'my',
  'Thailand': 'th',
  'Philippines': 'ph',
  'Vietnam': 'vn',
  'Nigeria': 'ng',
  'Kenya': 'ke'
};

function resolveCountryCode(countryName, isoCode) {
  if (isoCode && isoCode.length === 2) {
    return isoCode.toLowerCase();
  }
  const code = COUNTRY_CODES[countryName] || null;
  if (!code) {
    console.warn('[Country Mapping] No ISO code found for country:', countryName);
  }
  return code;
}

// Add GeoJSON country boundaries for hover highlighting
let countriesDataSource;
let countryInteractionHandler;
let highlightedEntity = null;
const originalStyleByEntity = new Map();

async function loadCountryBoundaries() {
  try {
    // Load country boundaries from GeoJSON
    const geoJsonDataSource = await Cesium.GeoJsonDataSource.load(
      'https://raw.githubusercontent.com/johan/world.geo.json/master/countries.geo.json'
    );

    // Create manual entities from GeoJSON data for reliable picking
    const entities = geoJsonDataSource.entities.values;
    console.log(`[EarthScreensaver] Creating ${entities.length} manual country entities`);

    let createdCount = 0;
    for (let i = 0; i < entities.length; i++) {
      const entity = entities[i];
      if (entity.polygon && entity.polygon.hierarchy) {
        const coords = entity.polygon.hierarchy.getValue();
        const countryName = entity.name || entity.properties?.ADMIN?.getValue() || `Country ${i}`;
        
        // Debug: Log the hierarchy structure for first few entities
        if (i < 3) {
          console.log(`[EarthScreensaver] Entity ${i} hierarchy structure:`, {
            name: countryName,
            coordsType: typeof coords,
            coordsKeys: Object.keys(coords || {}),
            hasPositions: !!coords?.positions,
            positionsLength: coords?.positions?.length
          });
        }
        
        // Extract positions if it's a PolygonHierarchy object
        const hierarchyPositions = coords?.positions || coords;
        
        // Create manual entity in viewer.entities for reliable picking
        viewer.entities.add({
          name: countryName,
          properties: entity.properties, // Preserve original properties
          polygon: {
            hierarchy: hierarchyPositions,
            height: 1000,
            heightReference: Cesium.HeightReference.NONE,
            material: Cesium.Color.WHITE.withAlpha(0.01), // Nearly invisible but pickable
            fill: true,
            outline: true,
            outlineColor: Cesium.Color.WHITE.withAlpha(0.3), // Reduced contrast white
            outlineWidth: 0.5 // Thinner white borders
          }
        });
        createdCount++;
      }
    }
    console.log(`[EarthScreensaver] Created ${createdCount} manual country entities`);

    setupCountryInteractionHandlers();
  } catch (error) {
    console.error('[EarthScreensaver] Failed to load country boundaries:', error);
  }
}

function pickCountryEntity(windowPosition) {
  // Use regular pick instead of drillPick for simplicity
  const pickedObject = viewer.scene.pick(windowPosition);
  
  if (pickedObject?.id?.polygon) {
    return pickedObject.id;
  }
  
  return undefined;
}

function setupCountryInteractionHandlers() {
  if (countryInteractionHandler) {
    countryInteractionHandler.destroy();
  }
  countryInteractionHandler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);

  // Click to highlight country border
  countryInteractionHandler.setInputAction((click) => {
    console.log('[EarthScreensaver] Click detected at position:', click.position);
    
    // Debug: Check raw pick result
    const rawPick = viewer.scene.pick(click.position);
    console.log('[EarthScreensaver] Raw pick result:', rawPick);
    
    if (rawPick?.id) {
      console.log('[EarthScreensaver] Full picked ID details:', {
        idType: typeof rawPick.id,
        idKeys: Object.keys(rawPick.id),
        name: rawPick.id.name,
        hasPolygon: !!rawPick.id.polygon,
        polygonType: typeof rawPick.id.polygon
      });
    }
    
    const entity = pickCountryEntity(click.position);
    console.log('[EarthScreensaver] Picked entity:', entity);
    
    // If clicking the same highlighted entity, show news
    if (highlightedEntity && highlightedEntity === entity) {
      const countryLabel = entity.name || entity.properties?.ADMIN?.getValue();
      
      // Debug: Log all available properties to find the correct ISO code field
      console.log('[News Debug] Entity properties:', entity.properties);
      if (entity.properties) {
        const allProps = {};
        entity.properties._propertyNames?.forEach(propName => {
          allProps[propName] = entity.properties[propName]?.getValue();
        });
        console.log('[News Debug] All entity property values:', allProps);
      }
      
      const isoCode = entity.properties?.ISO_A2?.getValue();
      console.log('[News Debug] Extracted isoCode:', isoCode);
      
      // Stop auto-rotation when showing news
      autoRotate = false;
      const autoRotateCheckbox = document.getElementById('autoRotateCheckbox');
      if (autoRotateCheckbox) {
        autoRotateCheckbox.checked = false;
      }
      
      showNewsBox(countryLabel, isoCode);
      console.log('[EarthScreensaver] Showing news for:', countryLabel);
      return;
    }

    // Restore previous entity's original style
    if (highlightedEntity && highlightedEntity.polygon) {
      const original = originalStyleByEntity.get(highlightedEntity);
      if (original) {
        highlightedEntity.polygon.outlineColor = original.outlineColor;
        highlightedEntity.polygon.outlineWidth = original.outlineWidth;
        highlightedEntity.polygon.material = original.material;
      }
      highlightedEntity = null;
    }

    // Highlight new entity
    if (entity && entity.polygon) {
      if (!originalStyleByEntity.has(entity)) {
        originalStyleByEntity.set(entity, {
          outlineColor: entity.polygon.outlineColor,
          outlineWidth: entity.polygon.outlineWidth,
          material: entity.polygon.material
        });
      }

      // Highlight with Economist red fill and border
      entity.polygon.material = Cesium.Color.fromCssColorString('#C73521').withAlpha(0.15); // More transparent red fill
      entity.polygon.outlineColor = Cesium.Color.fromCssColorString('#C73521'); // Economist red
      entity.polygon.outlineWidth = 10; // Maximum practical outline width
      highlightedEntity = entity;
      
      const countryLabel = entity.name || entity.properties?.ADMIN?.getValue();
      console.log('[EarthScreensaver] Clicked and highlighted:', countryLabel);
    }
  }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
}

// Load country boundaries for hover highlighting
loadCountryBoundaries();

// ============================================================================
// DRAGGABLE NEWS BOX
// ============================================================================
const newsBox = document.getElementById('newsBox');
const newsBoxTitle = document.getElementById('newsBoxTitle');
const newsBoxContent = document.getElementById('newsBoxContent');
const newsBoxClose = document.getElementById('newsBoxClose');
const newsBoxHeader = document.getElementById('newsBoxHeader');

let currentNewsData = null;
let currentView = 'feed'; // 'feed' or 'article'

// Draggable functionality
newsBoxHeader.addEventListener('mousedown', (e) => {
  if (e.target === newsBoxClose || e.target.tagName === 'A') return;
  
  isDraggingNewsBox = true;
  dragOffsetX = e.clientX - newsBox.offsetLeft;
  dragOffsetY = e.clientY - newsBox.offsetTop;
  newsBox.style.cursor = 'grabbing';
  e.preventDefault();
  e.stopPropagation(); // Prevent globe rotation
});

document.addEventListener('mousemove', (e) => {
  if (!isDraggingNewsBox) return;
  
  const newX = e.clientX - dragOffsetX;
  const newY = e.clientY - dragOffsetY;
  
  // Keep within viewport bounds
  const maxX = window.innerWidth - newsBox.offsetWidth;
  const maxY = window.innerHeight - newsBox.offsetHeight;
  
  newsBox.style.left = Math.max(0, Math.min(newX, maxX)) + 'px';
  newsBox.style.top = Math.max(0, Math.min(newY, maxY)) + 'px';
  e.stopPropagation(); // Prevent globe rotation while dragging
});

document.addEventListener('mouseup', (e) => {
  if (isDraggingNewsBox) {
    isDraggingNewsBox = false;
    newsBox.style.cursor = 'move';
    e.stopPropagation(); // Prevent globe rotation after drag
  }
});

// Close button
newsBoxClose.addEventListener('click', () => {
  hideNewsBox();
});

// Title click to open in browser
newsBoxTitle.addEventListener('click', (e) => {
  e.preventDefault();
  if (currentNewsData && currentNewsData.countryCode) {
    const newsUrl = `https://news.google.com/search?q=${encodeURIComponent(currentNewsData.countryName)}&hl=en-US&gl=US&ceid=US:en`;
    window.open(newsUrl, '_blank');
  }
});

async function showNewsBox(countryName, isoCode) {
  console.log('[News Debug] showNewsBox called with:', { countryName, isoCode });
  
  newsBoxTitle.textContent = `${countryName} Top News`;
  newsBox.classList.add('active');
  currentView = 'feed';
  currentNewsData = { countryName, isoCode, countryCode: resolveCountryCode(countryName, isoCode) };

  const countryCode = currentNewsData.countryCode;
  console.log('[News Debug] Resolved country code:', countryCode);

  // Check if country has no news coverage
  if (!countryCode) {
    console.log('[News Debug] No country code available');
    newsBoxContent.innerHTML = '<div class="loading">No News<br><br>News coverage is not available for this country.</div>';
    return;
  }

  newsBoxContent.innerHTML = '<div class="loading">Loading headlines...</div>';

  try {
    console.log('[News Debug] Making API call for country:', countryCode);
    // Use Electron IPC if available, otherwise fallback to direct fetch
    let data;
    if (window.electronAPI) {
      data = await window.electronAPI.fetchNews(countryCode);
    } else {
      // Fallback for testing in browser
      data = { articles: [
        { 
          title: 'Sample headline 1', 
          description: 'This is a sample description for testing purposes.',
          source: { name: 'Reuters' },
          author: 'Sample Author',
          publishedAt: new Date().toISOString(),
          url: 'https://example.com/article1'
        },
        { 
          title: 'Sample headline 2', 
          description: 'Another sample description to demonstrate the news feed layout.',
          source: { name: 'AP' },
          author: 'Another Author',
          publishedAt: new Date().toISOString(),
          url: 'https://example.com/article2'
        }
      ]};
    }

    console.log('[News Debug] API response:', data);

    // Check for API errors
    if (data && data.status === 'error') {
      console.log('[News Debug] API error received:', data);
      newsBoxContent.innerHTML = `<div class="loading">API Error: ${escapeHtml(data.message || 'Unable to fetch news')}<br><br>This may be due to API rate limits or authentication issues.</div>`;
      return;
    }

    if (data && data.articles && data.articles.length > 0) {
      console.log('[News Debug] Successfully loaded', data.articles.length, 'articles');
      currentNewsData.articles = data.articles;
      renderNewsFeed(data.articles);
    } else {
      console.log('[News Debug] No articles found in response');
      newsBoxContent.innerHTML = '<div class="loading">No headlines available for this country</div>';
    }
  } catch (error) {
    console.error('[News Debug] Failed to fetch news:', error);
    newsBoxContent.innerHTML = '<div class="loading">Failed to load headlines.<br><br>Check your NewsAPI key in main.js</div>';
  }
}

function renderNewsFeed(articles) {
  currentView = 'feed';
  newsBoxContent.innerHTML = articles
    .slice(0, 10)
    .map((article, index) => {
      const headline = escapeHtml(article.title);
      const description = article.description ? escapeHtml(article.description) : '';
      const source = escapeHtml(article.source?.name || 'Unknown');
      const author = article.author ? escapeHtml(article.author) : '';
      const publishedAt = article.publishedAt ? new Date(article.publishedAt).toLocaleDateString() : '';
      
      // Get first 2 lines of description
      const descriptionLines = description.split('\n').slice(0, 2).join('\n');
      
      return `
        <div class="news-article">
          <h3 class="news-headline">${headline}</h3>
          ${description ? `<p class="news-byline">${descriptionLines}</p>` : ''}
          <p class="news-meta">${source}${author ? ` • ${author}` : ''}${publishedAt ? ` • ${publishedAt}` : ''}</p>
          <a class="news-more" data-article-index="${index}">more →</a>
        </div>
      `;
    })
    .join('');

  // Add click handlers for "more" links
  document.querySelectorAll('.news-more').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const articleIndex = parseInt(e.target.dataset.articleIndex);
      showArticle(articleIndex);
    });
  });
}

function showArticle(articleIndex) {
  if (!currentNewsData || !currentNewsData.articles) return;
  
  const article = currentNewsData.articles[articleIndex];
  currentView = 'article';
  
  const headline = escapeHtml(article.title);
  const description = article.description ? escapeHtml(article.description) : '';
  const content = article.content ? escapeHtml(article.content) : '';
  const source = escapeHtml(article.source?.name || 'Unknown');
  const author = article.author ? escapeHtml(article.author) : '';
  const publishedAt = article.publishedAt ? new Date(article.publishedAt).toLocaleDateString() : '';
  const url = article.url || '#';
  
  newsBoxContent.innerHTML = `
    <a class="news-back">← Back to feed</a>
    <div class="news-article">
      <h3 class="news-headline">${headline}</h3>
      ${description ? `<p class="news-byline">${description}</p>` : ''}
      <p class="news-meta">${source}${author ? ` • ${author}` : ''}${publishedAt ? ` • ${publishedAt}` : ''}</p>
      ${content ? `<p class="news-body">${content}</p>` : ''}
      <a class="news-more" href="${url}" target="_blank">Read full article →</a>
    </div>
  `;
  
  // Add back button handler
  document.querySelector('.news-back').addEventListener('click', (e) => {
    e.preventDefault();
    renderNewsFeed(currentNewsData.articles);
  });
}

function hideNewsBox() {
  newsBox.classList.remove('active');
  currentNewsData = null;
  currentView = 'feed';
  
  // Deselect all countries and restore auto-rotation
  if (highlightedEntity && highlightedEntity.polygon) {
    const original = originalStyleByEntity.get(highlightedEntity);
    if (original) {
      highlightedEntity.polygon.outlineColor = original.outlineColor;
      highlightedEntity.polygon.outlineWidth = original.outlineWidth;
      highlightedEntity.polygon.material = original.material;
    }
    highlightedEntity = null;
  }
  
  // Resume auto-rotation
  autoRotate = true;
  const autoRotateCheckbox = document.getElementById('autoRotateCheckbox');
  if (autoRotateCheckbox) {
    autoRotateCheckbox.checked = true;
  }
}

// ESC key handler to close news box
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && newsBox.classList.contains('active')) {
    hideNewsBox();
  }
});

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ============================================================================
// WEATHER OVERLAY (Cloud layer)
// ============================================================================
let weatherLayer = null;
let stormEntities = [];

async function updateWeatherLayer() {
  try {
    // OpenWeatherMap cloud tiles
    // Requires API key: https://openweathermap.org/api
    const API_KEY = await window.electronAPI.getApiKey('openweather');

    if (weatherLayer) {
      viewer.imageryLayers.remove(weatherLayer);
    }

    weatherLayer = viewer.imageryLayers.addImageryProvider(
      new Cesium.UrlTemplateImageryProvider({
        url: `https://tile.openweathermap.org/map/clouds_new/{z}/{x}/{y}.png?appid=${API_KEY}`,
        minimumLevel: 0,
        maximumLevel: 6
      })
    );

    // Make clouds semi-transparent
    weatherLayer.alpha = 0.6;

  } catch (error) {
    console.error('Failed to update weather layer:', error);
  }
}

// Create storm icon as SVG data URL
function createStormIcon(category) {
  const size = 48;
  const svg = `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <filter id="glow">
        <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
        <feMerge>
          <feMergeNode in="coloredBlur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
    </defs>
    <!-- Rotating hurricane symbol -->
    <circle cx="${size/2}" cy="${size/2}" r="${size/2 - 2}" fill="rgba(255, 0, 0, 0.8)" stroke="#fff" stroke-width="2" filter="url(#glow)"/>
    <path d="M ${size/2},${size/2} m -12,0 a 12,12 0 1,1 0,1 z M ${size/2},${size/2} m 0,-12 a 12,12 0 1,1 1,0 z"
          fill="white" transform="rotate(45 ${size/2} ${size/2})"/>
    <!-- Category number -->
    <text x="${size/2}" y="${size/2 + 6}" text-anchor="middle" font-size="20" font-weight="bold" fill="white" font-family="Arial">${category}</text>
  </svg>`;
  return 'data:image/svg+xml;base64,' + btoa(svg);
}

// Fetch active storms from weather API
async function updateStorms() {
  try {
    // Remove old storm entities
    stormEntities.forEach(entity => viewer.entities.remove(entity));
    stormEntities = [];

    // Fetch storm data from OpenWeatherMap
    const API_KEY = 'ffb5a08a8dcb48f351ed6873452fff3f';

    // OpenWeatherMap doesn't have a direct storm API, so we'll use example data
    // In production, you'd use a specialized API like NOAA or hurricane tracking services
    const activeStorms = [
      // Example storms - replace with real API data
       { name: 'Hurricane Example', lat: 25.7617, lon: -80.1918, category: 3, windSpeed: 125 }
    ];

    // Fetch from alternative API or use simulated data
    // For now, we'll check severe weather alerts from OpenWeatherMap
    try {
      const response = await fetch(
        `https://api.openweathermap.org/data/2.5/onecall?lat=0&lon=0&exclude=current,minutely,hourly,daily&appid=${API_KEY}`
      );
      const data = await response.json();

      // Process alerts if available
      if (data.alerts) {
        data.alerts.forEach((alert, index) => {
          if (alert.event.toLowerCase().includes('hurricane') ||
              alert.event.toLowerCase().includes('typhoon') ||
              alert.event.toLowerCase().includes('cyclone')) {
            // Extract category from description or default to 1
            const category = extractStormCategory(alert.description) || 1;
            activeStorms.push({
              name: alert.event,
              lat: 0, // Would need geocoding
              lon: 0,
              category: category,
              description: alert.description
            });
          }
        });
      }
    } catch (error) {
      console.log('No storm data available from primary source');
    }

    // Add storm entities to the globe
    activeStorms.forEach((storm, index) => {
      const entity = viewer.entities.add({
        position: Cesium.Cartesian3.fromDegrees(storm.lon, storm.lat),
        billboard: {
          image: createStormIcon(storm.category),
          width: 48,
          height: 48,
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
          verticalOrigin: Cesium.VerticalOrigin.CENTER,
          horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
          disableDepthTestDistance: Number.POSITIVE_INFINITY
        },
        label: {
          text: `${storm.name}\nCategory ${storm.category}`,
          font: 'bold 14px sans-serif',
          fillColor: Cesium.Color.WHITE,
          outlineColor: Cesium.Color.BLACK,
          outlineWidth: 2,
          style: Cesium.LabelStyle.FILL_AND_OUTLINE,
          pixelOffset: new Cesium.Cartesian2(0, -40),
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
          scaleByDistance: new Cesium.NearFarScalar(1e6, 1.0, 1e7, 0.5)
        }
      });

      stormEntities.push(entity);
    });

  } catch (error) {
    console.error('Failed to update storms:', error);
  }
}

function extractStormCategory(description) {
  const match = description.match(/category\s+(\d)/i);
  return match ? parseInt(match[1]) : null;
}

// Initial weather load
updateWeatherLayer();
updateStorms();

// Update weather and storms hourly
setInterval(() => {
  updateWeatherLayer();
  updateStorms();
}, CONFIG.WEATHER_UPDATE_INTERVAL);

// ============================================================================
// RENDER LOOP
// ============================================================================
viewer.scene.preRender.addEventListener(() => {
  rotateGlobe();
});

// ============================================================================
// CLOSE BUTTON
// ============================================================================
const closeButton = document.getElementById('closeButton');
closeButton.addEventListener('click', () => {
  if (window.electronAPI) {
    window.electronAPI.exitScreensaver();
  } else {
    // Fallback for non-Electron environment
    window.close();
  }
});

// ============================================================================
// WEATHER TOGGLE
// ============================================================================
const weatherCheckbox = document.getElementById('weatherCheckbox');
let weatherEnabled = true;

weatherCheckbox.addEventListener('change', (e) => {
  weatherEnabled = e.target.checked;
  if (weatherLayer) {
    weatherLayer.show = weatherEnabled;
  }
});

// ============================================================================
// AUTO-ROTATE TOGGLE
// ============================================================================
const autoRotateCheckbox = document.getElementById('autoRotateCheckbox');

autoRotateCheckbox.addEventListener('change', (e) => {
  autoRotate = e.target.checked;
  if (autoRotate) {
    lastRotateTime = Date.now(); // Reset timer to prevent jumps
  }
});

// ============================================================================
// DAY/NIGHT TOGGLE
// ============================================================================
const dayNightCheckbox = document.getElementById('dayNightCheckbox');

dayNightCheckbox.addEventListener('change', (e) => {
  viewer.scene.globe.enableLighting = e.target.checked;
});

// ============================================================================
// SCREENSAVER EXIT (any key press)
// ============================================================================
document.addEventListener('keydown', (e) => {
  // Allow ESC for modal, otherwise exit
  if (e.key !== 'Escape' || !newsModal.classList.contains('active')) {
    if (window.electronAPI && e.key !== 'Escape') {
      // Uncomment for true screensaver behavior:
      // window.electronAPI.exitScreensaver();
    }
  }
});

console.log('Earth Screensaver initialized');
