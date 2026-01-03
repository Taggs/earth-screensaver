// High Fix #8: Import CITIES from cities.js instead of duplicating
import { CITIES } from './cities.js';

// ============================================================================
// CONFIGURATION
// ============================================================================
const CONFIG = {
  // Get a free token at https://cesium.com/ion/tokens
  CESIUM_ION_TOKEN: 'YOUR_CESIUM_ION_TOKEN',

  // Rotation speed (radians per second)
  ROTATION_SPEED: 0.001,

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
  },

  // Performance optimization settings
  PERFORMANCE: {
    // Screen space error - higher values = lower quality/better performance
    // Default: 2.0, Recommended for performance: 4.0-8.0
    maximumScreenSpaceError: 6.0,

    // Tile cache size (MB) - lower = less memory but more loading
    // Default: 512 MB
    tileCacheSize: 256,

    // Quality presets for user selection
    PRESETS: {
      HIGH_QUALITY: {
        maximumScreenSpaceError: 2.0,
        tileCacheSize: 512
      },
      BALANCED: {
        maximumScreenSpaceError: 6.0,
        tileCacheSize: 256
      },
      HIGH_PERFORMANCE: {
        maximumScreenSpaceError: 8.0,
        tileCacheSize: 128
      }
    }
  }
};

// ============================================================================
// LANGUAGE DETECTION & TRANSLATION
// ============================================================================
// Detect user's native language from OS/browser
const userLanguage = (navigator.language || navigator.userLanguage || 'en').split('-')[0]; // e.g., "en", "es", "fr"
console.log('[Language] Detected user language:', userLanguage);

// Feature toggles - will be overridden by saved settings
let translationEnabled = true;
let weatherEnabled = true;

// ============================================================================
// INITIALIZATION
// ============================================================================
// Wait for Cesium to load, then configure
function waitForCesium() {
  return new Promise((resolve, reject) => {
    if (typeof Cesium !== 'undefined') {
      resolve();
    } else {
      console.log('[Globe] Waiting for Cesium to load...');

      let attempts = 0;
      const maxAttempts = 600; // 60 seconds (100ms * 600)

      // Wait for Cesium to load
      const checkInterval = setInterval(() => {
        attempts++;

        if (typeof Cesium !== 'undefined') {
          clearInterval(checkInterval);
          console.log('[Globe] Cesium loaded after', (attempts * 100) + 'ms');
          resolve();
        } else if (attempts >= maxAttempts) {
          clearInterval(checkInterval);
          console.error('[Globe] Cesium failed to load after 60 seconds');
          document.getElementById('cesiumContainer').innerHTML = '<div style="color: white; padding: 40px; text-align: center;"><h1>Loading Error</h1><p>The 3D globe library failed to load. This may be due to a slow internet connection.<br><br>Please refresh the page to try again.</p></div>';
          reject(new Error('Cesium load timeout'));
        } else if (attempts % 50 === 0) {
          // Progress feedback every 5 seconds
          console.log('[Globe] Still waiting for Cesium...', (attempts * 100 / 1000) + 's elapsed');
        }
      }, 100);
    }
  });
}

// Configure Cesium after it loads
waitForCesium().then(() => {
  console.log('[Globe] Cesium loaded successfully');

  // Configure base URL for local assets
  if (!window.CESIUM_BASE_URL) {
    window.CESIUM_BASE_URL = '../../node_modules/cesium/Build/Cesium/';
  }

  // Set initial token, will be updated asynchronously
  Cesium.Ion.defaultAccessToken = 'YOUR_CESIUM_ION_TOKEN';

  // Initialize the app
  initializeApp();
}).catch((error) => {
  console.error('[Globe] Error initializing Cesium:', error);
});

// Viewer will be created after Cesium loads
let viewer;

// Initialize API keys and create viewer
async function initializeApp() {
  try {
    console.log('[Globe] Initializing app...');

    // Get real API keys first
    const cesiumToken = await window.electronAPI.getApiKey('cesium');
    Cesium.Ion.defaultAccessToken = cesiumToken;
    console.log('Cesium token updated successfully:', cesiumToken.substring(0, 20) + '...');

    // Create viewer with absolute minimal configuration
    viewer = new Cesium.Viewer('cesiumContainer', {
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
      infoBox: false,  // Disable info box (camera bar)

      // Performance optimization: Enable on-demand rendering
      requestRenderMode: true,
      maximumRenderTimeChange: Infinity  // Only render on explicit requests
    });

    console.log('[Globe] Viewer created');

    // Now load assets that require authentication
    await loadBingMapsImagery();

    // Continue with rest of setup
    setupScene();

    // Initialize all the globe features
    initializeGlobeFeatures();

    // Load company logo if available
    loadCompanyLogo();

  } catch (error) {
    console.error('Failed to initialize app:', error);
    document.getElementById('cesiumContainer').innerHTML = '<div style="color: white; padding: 40px; text-align: center;"><h1>Initialization Error</h1><p>' + error.message + '</p></div>';
  }
}

async function loadBingMapsImagery() {
  try {
    // Bing Maps Aerial with Labels - satellite imagery (Asset ID 3)
    // This is included with Cesium Ion free tier
    const imageryProvider = await Cesium.IonImageryProvider.fromAssetId(3);
    const imageryLayer = viewer.imageryLayers.addImageryProvider(imageryProvider);

    // Enhance colors for better visibility
    imageryLayer.saturation = 1.3;
    imageryLayer.contrast = 1.2;
    imageryLayer.brightness = 0.85;

    console.log('Bing Maps imagery loaded successfully');

    // Request render after imagery loads
    viewer.scene.requestRender();
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

  // Apply performance optimizations
  viewer.scene.globe.maximumScreenSpaceError = CONFIG.PERFORMANCE.maximumScreenSpaceError;
  viewer.scene.globe.tileCacheSize = CONFIG.PERFORMANCE.tileCacheSize;

  // Additional performance optimizations
  viewer.scene.fog.enabled = false;  // Disable fog for cleaner look and better performance
  viewer.scene.globe.showGroundAtmosphere = true;  // Keep ground atmosphere for visual quality

  // Enable depth testing so far side of globe is not visible
  viewer.scene.globe.depthTestAgainstTerrain = true;
  viewer.scene.pickTranslucentDepth = false;

  // Set initial camera position
  viewer.camera.setView({
    destination: Cesium.Cartesian3.fromDegrees(
      CONFIG.INITIAL_CAMERA.longitude,
      CONFIG.INITIAL_CAMERA.latitude,
      CONFIG.INITIAL_CAMERA.height
    )
  });

  console.log('Scene setup completed with performance optimizations');
  console.log('  maximumScreenSpaceError:', CONFIG.PERFORMANCE.maximumScreenSpaceError);
  console.log('  tileCacheSize:', CONFIG.PERFORMANCE.tileCacheSize, 'MB');
}

// ============================================================================
// MODULE-LEVEL VARIABLES (must be declared before functions use them)
// ============================================================================
// Store label references for visibility updates
const cityLabels = [];

// High Fix #10: Cache city marker images to avoid creating 300+ identical markers
const markerCache = {};

// Intervals and event listener cleanup references
let sunPositionInterval = null;
let weatherUpdateInterval = null;
let decelerateInterval = null;
let postRenderRemoveCallback = null;
let preRenderRemoveCallback = null;

// Country interaction
let countryInteractionHandler = null;

// Performance monitoring
let performanceStatsEnabled = false;
let renderCount = 0;
let lastFrameTime = performance.now();
let frameTimeSum = 0;
let frameTimeCount = 0;

// News box DOM elements and drag state
const newsBox = document.getElementById('newsBox');
const newsBoxTitle = document.getElementById('newsBoxTitle');
const newsBoxContent = document.getElementById('newsBoxContent');
const newsBoxClose = document.getElementById('newsBoxClose');
const newsBoxHeader = document.getElementById('newsBoxHeader');

let isDraggingNewsBox = false;
let dragOffsetX = 0;
let dragOffsetY = 0;

// ============================================================================
// PERFORMANCE MONITORING
// ============================================================================
function updatePerformanceStats() {
  if (!performanceStatsEnabled) return;

  renderCount++;

  const now = performance.now();
  const frameTime = now - lastFrameTime;
  lastFrameTime = now;

  frameTimeSum += frameTime;
  frameTimeCount++;

  // Update stats every 30 frames (~0.5 seconds at 60 FPS)
  if (frameTimeCount >= 30) {
    const avgFrameTime = frameTimeSum / frameTimeCount;
    const fps = Math.round(1000 / avgFrameTime);

    document.getElementById('fpsCounter').textContent = fps;
    document.getElementById('frameTimeCounter').textContent = avgFrameTime.toFixed(1) + 'ms';
    document.getElementById('renderCounter').textContent = renderCount;

    frameTimeSum = 0;
    frameTimeCount = 0;
  }
}

// ============================================================================
// NEWS BOX DRAG HANDLERS (defined at module level for cleanup access)
// ============================================================================
// High Fix #11: Define handlers outside initializeGlobeFeatures to enable proper cleanup
function handleNewsBoxDrag(e) {
  if (!isDraggingNewsBox) return;

  try {
    const newX = e.clientX - dragOffsetX;
    const newY = e.clientY - dragOffsetY;

    // Keep within viewport bounds with safe fallback values
    const boxWidth = newsBox.offsetWidth || 400;
    const boxHeight = newsBox.offsetHeight || 600;
    const viewportWidth = window.innerWidth || 1920;
    const viewportHeight = window.innerHeight || 1080;

    const maxX = Math.max(0, viewportWidth - boxWidth);
    const maxY = Math.max(0, viewportHeight - boxHeight);

    const clampedX = Math.max(0, Math.min(newX, maxX));
    const clampedY = Math.max(0, Math.min(newY, maxY));

    newsBox.style.left = clampedX + 'px';
    newsBox.style.top = clampedY + 'px';
    e.stopPropagation(); // Prevent globe rotation while dragging
  } catch (error) {
    console.error('[News Box] Drag error:', error);
    // Stop dragging on error
    isDraggingNewsBox = false;
    newsBox.style.cursor = 'move';
    document.removeEventListener('mousemove', handleNewsBoxDrag);
    document.removeEventListener('mouseup', handleNewsBoxDragEnd);
  }
}

function handleNewsBoxDragEnd(e) {
  if (isDraggingNewsBox) {
    isDraggingNewsBox = false;
    newsBox.style.cursor = 'move';
    // High Fix #11: Remove listeners when dragging ends
    document.removeEventListener('mousemove', handleNewsBoxDrag);
    document.removeEventListener('mouseup', handleNewsBoxDragEnd);
    e.stopPropagation(); // Prevent globe rotation after drag
  }
}

// Draggable functionality - only active when news box is open
function attachNewsBoxDragListeners() {
  newsBoxHeader.addEventListener('mousedown', handleNewsBoxHeaderMouseDown);
}

function detachNewsBoxDragListeners() {
  newsBoxHeader.removeEventListener('mousedown', handleNewsBoxHeaderMouseDown);
  // Also clean up any active drag listeners
  document.removeEventListener('mousemove', handleNewsBoxDrag);
  document.removeEventListener('mouseup', handleNewsBoxDragEnd);
  isDraggingNewsBox = false;
}

function handleNewsBoxHeaderMouseDown(e) {
  if (e.target === newsBoxClose || e.target.tagName === 'A') return;

  isDraggingNewsBox = true;
  dragOffsetX = e.clientX - newsBox.offsetLeft;
  dragOffsetY = e.clientY - newsBox.offsetTop;
  newsBox.style.cursor = 'grabbing';

  // Only attach listeners when actually dragging
  document.addEventListener('mousemove', handleNewsBoxDrag);
  document.addEventListener('mouseup', handleNewsBoxDragEnd);

  e.preventDefault();
  e.stopPropagation(); // Prevent globe rotation
}

// ============================================================================
// GLOBE FEATURES INITIALIZATION
// ============================================================================
// This function is called after the viewer is created and scene is set up
function initializeGlobeFeatures() {
  console.log('[Globe] Initializing globe features...');

  // ============================================================================
  // CITY LABELS (Capitals and Secondary Cities)
  // ============================================================================
  // High Fix #8: Removed duplicate CITIES array - now imported from cities.js at top of file

  // Create label collection for cities
  const labelCollection = viewer.scene.primitives.add(new Cesium.LabelCollection());
  const billboardCollection = viewer.scene.primitives.add(new Cesium.BillboardCollection());

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
  // High Fix #10: Return cached marker if already created
  const cacheKey = isCapital ? 'capital' : 'city';
  if (markerCache[cacheKey]) {
    return markerCache[cacheKey];
  }

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

  // High Fix #10: Cache the marker for reuse
  const dataUrl = canvas.toDataURL();
  markerCache[cacheKey] = dataUrl;
  return dataUrl;
}

// High Fix #7: Throttle label visibility updates to reduce render loop overhead
let lastCameraHeight = 0;
let lastLabelUpdateTime = Date.now();

// Update label visibility based on camera distance
function updateLabelVisibility() {
  const now = Date.now();
  const cameraHeight = viewer.camera.positionCartographic.height;

  // High Fix #7: Only update if camera moved significantly or 100ms passed
  // This reduces 60 updates/second (18,000 ops/sec) to ~10 updates/second (3,000 ops/sec)
  if (Math.abs(cameraHeight - lastCameraHeight) < 100000 &&
      now - lastLabelUpdateTime < 100) {
    return;
  }

  lastCameraHeight = cameraHeight;
  lastLabelUpdateTime = now;

  cityLabels.forEach(({ label, billboard, isCapital, population }) => {
    // At default zoom (15M+ km), only show capitals
    // As user zooms in, show major cities, then all cities
    let shouldShow = false;

    if (isCapital) {
      shouldShow = cameraHeight <= CONFIG.LABELS.CAPITAL_MAX_DISTANCE;
    } else if (population >= CONFIG.LABELS.MAJOR_CITY_POPULATION) {
      shouldShow = cameraHeight <= CONFIG.LABELS.MAJOR_CITY_MAX_DISTANCE;
    } else {
      shouldShow = cameraHeight <= CONFIG.LABELS.SECONDARY_CITY_MAX_DISTANCE;
    }

    label.show = shouldShow;
    billboard.show = shouldShow;
  });

  // Request render after label visibility changes
  viewer.scene.requestRender();
}

// Update labels periodically
// Fix #4: Store event listener reference for cleanup
postRenderRemoveCallback = viewer.scene.postRender.addEventListener(updateLabelVisibility);

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

  // Request render after sun position update
  viewer.scene.requestRender();
}

// Update sun position every minute
// Fix #1: Store interval ID for cleanup
sunPositionInterval = setInterval(updateSunPosition, 60000);
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

  // Request render after camera movement
  viewer.scene.requestRender();
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
// Critical Fix #4: decelerateInterval declared at module level (line 260)

// News box dragging state now declared at module level (lines 281-283)

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

  // Request render during drag
  viewer.scene.requestRender();
});

canvas.addEventListener('mouseup', () => {
  isDragging = false;

  // Critical Fix #4: Clear any existing deceleration interval before creating new one
  if (decelerateInterval) {
    clearInterval(decelerateInterval);
    decelerateInterval = null;
  }

  // Apply momentum
  decelerateInterval = setInterval(() => {
    if (Math.abs(dragVelocity) < 0.0001) {
      clearInterval(decelerateInterval);
      decelerateInterval = null;
      autoRotate = true;
      return;
    }
    viewer.camera.rotateRight(-dragVelocity);
    dragVelocity *= 0.95; // Friction

    // Request render during deceleration
    viewer.scene.requestRender();
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
// ISO-3 to ISO-2 country code mapping (from GeoJSON id to NewsAPI country code)
const ISO3_TO_ISO2 = {
  'USA': 'us', 'GBR': 'gb', 'DEU': 'de', 'FRA': 'fr', 'JPN': 'jp',
  'CHN': 'cn', 'IND': 'in', 'BRA': 'br', 'AUS': 'au', 'CAN': 'ca',
  'RUS': 'ru', 'ITA': 'it', 'ESP': 'es', 'MEX': 'mx', 'KOR': 'kr',
  'NLD': 'nl', 'CHE': 'ch', 'SWE': 'se', 'NOR': 'no', 'DNK': 'dk',
  'FIN': 'fi', 'POL': 'pl', 'AUT': 'at', 'BEL': 'be', 'PRT': 'pt',
  'GRC': 'gr', 'IRL': 'ie', 'NZL': 'nz', 'SGP': 'sg', 'ISR': 'il',
  'ZAF': 'za', 'ARG': 'ar', 'EGY': 'eg', 'TUR': 'tr', 'SAU': 'sa',
  'ARE': 'ae', 'IDN': 'id', 'MYS': 'my', 'THA': 'th', 'PHL': 'ph',
  'VNM': 'vn', 'NGA': 'ng', 'KEN': 'ke', 'UKR': 'ua', 'SDN': 'sd',
  'ROM': 'ro', 'HUN': 'hu', 'CZE': 'cz', 'BGR': 'bg', 'SRB': 'rs',
  'HRV': 'hr', 'SVK': 'sk', 'SVN': 'si', 'LTU': 'lt', 'LVA': 'lv',
  'EST': 'ee', 'PAK': 'pk', 'BGD': 'bd', 'IRN': 'ir', 'IRQ': 'iq',
  'SYR': 'sy', 'LBN': 'lb', 'JOR': 'jo', 'YEM': 'ye', 'OMN': 'om',
  'KWT': 'kw', 'QAT': 'qa', 'BHR': 'bh', 'COL': 'co', 'VEN': 've',
  'CHL': 'cl', 'PER': 'pe', 'ECU': 'ec', 'BOL': 'bo', 'PRY': 'py',
  'URY': 'uy', 'CUB': 'cu', 'DOM': 'do', 'PAN': 'pa', 'CRI': 'cr',
  'GTM': 'gt', 'HND': 'hn', 'SLV': 'sv', 'NIC': 'ni', 'MAR': 'ma',
  'DZA': 'dz', 'TUN': 'tn', 'LBY': 'ly', 'ETH': 'et', 'GHA': 'gh',
  'CIV': 'ci', 'CMR': 'cm', 'UGA': 'ug', 'TZA': 'tz', 'AGO': 'ao',
  'MOZ': 'mz', 'ZWE': 'zw', 'BWA': 'bw', 'NAM': 'na', 'ZMB': 'zm',
  'MDG': 'mg', 'SEN': 'sn', 'MLI': 'ml', 'BFA': 'bf', 'NER': 'ne',
  'TCD': 'td', 'SOM': 'so', 'LKA': 'lk', 'NPL': 'np', 'AFG': 'af',
  'KAZ': 'kz', 'UZB': 'uz', 'TKM': 'tm', 'KGZ': 'kg', 'TJK': 'tj',
  'MNG': 'mn', 'PRK': 'kp', 'MMR': 'mm', 'KHM': 'kh', 'LAO': 'la',
  'BRN': 'bn', 'TWN': 'tw', 'HKG': 'hk', 'MAC': 'mo',
  // Additional 60 countries previously missing
  'ALB': 'al', 'ARM': 'am', 'AZE': 'az', 'BIH': 'ba', 'BLR': 'by',
  'BRB': 'bb', 'BDI': 'bi', 'BEN': 'bj', 'BHS': 'bs', 'BTN': 'bt',
  'CAF': 'cf', 'COD': 'cd', 'COG': 'cg', 'CYP': 'cy', 'DJI': 'dj',
  'ERI': 'er', 'ESH': 'eh', 'FJI': 'fj', 'GAB': 'ga', 'GEO': 'ge',
  'GIN': 'gn', 'GMB': 'gm', 'GNB': 'gw', 'GNQ': 'gq', 'GRL': 'gl',
  'GUF': 'gf', 'GUY': 'gy', 'HTI': 'ht', 'ISL': 'is', 'JAM': 'jm',
  'LBR': 'lr', 'LSO': 'ls', 'LUX': 'lu', 'MDA': 'md', 'MKD': 'mk',
  'MLT': 'mt', 'MNE': 'me', 'MRT': 'mr', 'MWI': 'mw', 'PNG': 'pg',
  'PRI': 'pr', 'PSE': 'ps', 'RWA': 'rw', 'SLE': 'sl', 'SLB': 'sb',
  'SSD': 'ss', 'SUR': 'sr', 'SWZ': 'sz', 'TGO': 'tg', 'TLS': 'tl',
  'TTO': 'tt', 'VUT': 'vu'
};

function resolveCountryCode(countryName, iso3Code) {
  if (!iso3Code) {
    console.warn('[Country Mapping] No ISO code found for country:', countryName);
    return null;
  }

  // Clean ISO-3 code: remove numeric suffixes like "_2" from "GBR_2", "FRA_2"
  // These suffixes appear in GeoJSON for territories/dependencies
  const cleanIso3Code = iso3Code.split('_')[0];

  // Try ISO-3 to ISO-2 conversion first
  if (ISO3_TO_ISO2[cleanIso3Code]) {
    return ISO3_TO_ISO2[cleanIso3Code];
  }

  // If ISO-3 code exists but not in our mapping, convert to lowercase 2-letter
  // This is a fallback for countries we haven't mapped yet
  if (cleanIso3Code.length === 3) {
    console.warn('[Country Mapping] ISO-3 code not in mapping, attempting conversion:', cleanIso3Code, 'for', countryName);
    return cleanIso3Code.substring(0, 2).toLowerCase();
  }

  console.warn('[Country Mapping] No ISO code found for country:', countryName);
  return null;
}

// Add GeoJSON country boundaries for hover highlighting
let countriesDataSource;
// countryInteractionHandler declared at module level (line 195)
let highlightedEntity = null;
const originalStyleByEntity = new Map();

async function loadCountryBoundaries() {
  try {
    // High Fix #9: Load country boundaries from local GeoJSON file instead of remote URL
    // This eliminates network latency on every app start and removes external dependency
    const geoJsonDataSource = await Cesium.GeoJsonDataSource.load(
      '../data/countries.geo.json'
    );

    // Create manual entities from GeoJSON data for reliable picking
    const entities = geoJsonDataSource.entities.values;
    console.log(`[EarthScreensaver] Creating ${entities.length} manual country entities`);

    // Fix #3: Batch entity creation to avoid blocking UI thread
    const BATCH_SIZE = 20;
    let createdCount = 0;

    for (let i = 0; i < entities.length; i += BATCH_SIZE) {
      const batchEnd = Math.min(i + BATCH_SIZE, entities.length);

      // Process batch synchronously
      for (let j = i; j < batchEnd; j++) {
        const entity = entities[j];
        if (entity.polygon && entity.polygon.hierarchy) {
          const coords = entity.polygon.hierarchy.getValue();
          const countryName = entity.name || entity.properties?.ADMIN?.getValue() || `Country ${j}`;
          const countryId = entity.id || null; // Extract ISO-3 code from entity id (e.g., "UKR")

          // High Fix #5: Removed expensive nested loop debug code that was O(n*m)
          // Original debug code iterated through all property names for each entity

          // Extract positions if it's a PolygonHierarchy object
          const hierarchyPositions = coords?.positions || coords;

          // Create manual entity in viewer.entities for reliable picking
          viewer.entities.add({
            name: countryName,
            id: countryId, // Preserve the ISO-3 country code
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

      // Yield to UI thread between batches
      if (i + BATCH_SIZE < entities.length) {
        await new Promise(resolve => setTimeout(resolve, 0));
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

  // Click to focus on country, stop rotation, and show news
  countryInteractionHandler.setInputAction((click) => {
    console.log('[EarthScreensaver] Click detected at position:', click.position);

    const entity = pickCountryEntity(click.position);
    console.log('[EarthScreensaver] Picked entity:', entity);

    // If clicked on a country
    if (entity && entity.polygon) {
      const countryLabel = entity.name || entity.properties?.ADMIN?.getValue();
      const iso3Code = entity.id; // ISO-3 code (e.g., "UKR", "USA")

      console.log('[EarthScreensaver] Clicked on country:', countryLabel, 'ISO-3:', iso3Code);

      // Restore previous entity's original style
      if (highlightedEntity && highlightedEntity.polygon) {
        const original = originalStyleByEntity.get(highlightedEntity);
        if (original) {
          highlightedEntity.polygon.outlineColor = original.outlineColor;
          highlightedEntity.polygon.outlineWidth = original.outlineWidth;
          highlightedEntity.polygon.material = original.material;
          // Critical Fix #3: Clean up Map entry to prevent memory leak
          originalStyleByEntity.delete(highlightedEntity);
        }
      }

      // Highlight new entity
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

      // Focus camera on country with more vertical (top-down) view
      viewer.flyTo(entity, {
        duration: 2.0, // 2 second flight
        offset: new Cesium.HeadingPitchRange(
          0,           // heading: 0 = north
          -1.2,        // pitch: -1.2 radians = more vertical/top-down view (closer to -π/2)
          3000000      // range: 3000km altitude
        )
      }).then(() => {
        // After camera arrives, show news
        showNewsBox(countryLabel, iso3Code);

        // Request render after camera movement completes
        viewer.scene.requestRender();
      });

      // Stop auto-rotation immediately
      autoRotate = false;
      if (autoRotateBtn) {
        autoRotateBtn.classList.remove('active');
      }

      console.log('[EarthScreensaver] Focusing on and showing news for:', countryLabel);
    }
  }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
}

// Load country boundaries for hover highlighting
loadCountryBoundaries();

// ============================================================================
// DRAGGABLE NEWS BOX
// ============================================================================
// News box DOM elements now declared at module level (lines 275-279)

let currentNewsData = null;
let currentView = 'feed'; // 'feed' or 'article'

// Critical Fix #1: News API caching to prevent N+1 queries
const newsCache = new Map();
const statsCache = new Map();
let currentTab = 'news'; // 'news' or 'stats'

// High Fix #11: Drag handlers are now defined at module level (see lines 307-377)

// Close button
newsBoxClose.addEventListener('click', () => {
  hideNewsBox();
});

// Tab switching handlers
const newsTab = document.getElementById('newsTab');
const statsTab = document.getElementById('statsTab');

newsTab.addEventListener('click', async () => {
  if (currentTab === 'news') return;

  currentTab = 'news';
  newsTab.classList.add('active');
  statsTab.classList.remove('active');

  // Re-render news view or fetch if not loaded
  if (currentNewsData && currentNewsData.articles && currentNewsData.articles.length > 0) {
    // Articles already loaded, just render them
    if (currentView === 'feed') {
      const articlesSource = (translationEnabled && currentNewsData.translatedArticles)
        ? currentNewsData.translatedArticles
        : currentNewsData.articles;
      renderNewsFeed(articlesSource);
    }
  } else if (currentNewsData && currentNewsData.countryCode) {
    // Need to fetch news for this country
    newsBoxContent.innerHTML = '<div class="loading">Loading headlines...</div>';

    try {
      const countryCode = currentNewsData.countryCode;

      // Check cache first
      if (newsCache.has(countryCode)) {
        const cachedArticles = newsCache.get(countryCode);
        currentNewsData.articles = cachedArticles;
        renderNewsFeed(cachedArticles);
        return;
      }

      // Fetch from API
      const response = await window.electronAPI.fetchNews(countryCode);

      if (response.status === 'ok' && response.articles && response.articles.length > 0) {
        currentNewsData.articles = response.articles;
        newsCache.set(countryCode, response.articles);

        // Translate if enabled
        if (translationEnabled && userLanguage !== 'en') {
          const translatedArticles = await translateArticles(response.articles);
          currentNewsData.translatedArticles = translatedArticles;
          renderNewsFeed(translatedArticles);
        } else {
          renderNewsFeed(response.articles);
        }
      } else {
        newsBoxContent.innerHTML = '<div class="loading">No News<br><br>News coverage is not available for this country.</div>';
      }
    } catch (error) {
      console.error('[News] Failed to fetch news:', error);
      newsBoxContent.innerHTML = '<div class="loading">Error<br><br>Failed to load news. Please try again.</div>';
    }
  }
});

statsTab.addEventListener('click', () => {
  if (currentTab === 'stats') return;

  currentTab = 'stats';
  statsTab.classList.add('active');
  newsTab.classList.remove('active');

  // Load and render stats
  showStatsView();
});

// Title click to open in browser
newsBoxTitle.addEventListener('click', (e) => {
  e.preventDefault();
  if (currentNewsData && currentNewsData.countryCode && window.electronAPI) {
    const newsUrl = `https://news.google.com/search?q=${encodeURIComponent(currentNewsData.countryName)}&hl=en-US&gl=US&ceid=US:en`;
    window.electronAPI.openExternal(newsUrl);
  }
});

// Map country codes to their primary language
const COUNTRY_LANGUAGES = {
  // Western Europe
  'es': 'es', // Spain - Spanish
  'fr': 'fr', // France - French
  'de': 'de', // Germany - German
  'it': 'it', // Italy - Italian
  'pt': 'pt', // Portugal - Portuguese
  'nl': 'nl', // Netherlands - Dutch
  'pl': 'pl', // Poland - Polish
  'ro': 'ro', // Romania - Romanian
  'gr': 'el', // Greece - Greek
  'tr': 'tr', // Turkey - Turkish
  'cz': 'cs', // Czech Republic - Czech
  'hu': 'hu', // Hungary - Hungarian
  'se': 'sv', // Sweden - Swedish
  'no': 'no', // Norway - Norwegian
  'dk': 'da', // Denmark - Danish
  'fi': 'fi', // Finland - Finnish
  'be': 'nl', // Belgium - Dutch (also French, but nl is primary)
  'ch': 'de', // Switzerland - German (also French/Italian, but de is primary)
  'at': 'de', // Austria - German

  // Eastern Europe & Russia
  'ua': 'uk', // Ukraine - Ukrainian
  'ru': 'ru', // Russia - Russian
  'rs': 'sr', // Serbia - Serbian
  'hr': 'hr', // Croatia - Croatian
  'bg': 'bg', // Bulgaria - Bulgarian
  'sk': 'sk', // Slovakia - Slovak
  'si': 'sl', // Slovenia - Slovenian
  'lt': 'lt', // Lithuania - Lithuanian
  'lv': 'lv', // Latvia - Latvian
  'ee': 'et', // Estonia - Estonian

  // Asia
  'cn': 'zh', // China - Chinese
  'jp': 'ja', // Japan - Japanese
  'kr': 'ko', // Korea - Korean
  'tw': 'zh', // Taiwan - Chinese
  'hk': 'zh', // Hong Kong - Chinese
  'th': 'th', // Thailand - Thai
  'vn': 'vi', // Vietnam - Vietnamese
  'id': 'id', // Indonesia - Indonesian
  'my': 'ms', // Malaysia - Malay
  'ph': 'tl', // Philippines - Tagalog
  'pk': 'ur', // Pakistan - Urdu
  'bd': 'bn', // Bangladesh - Bengali
  'in': 'hi', // India - Hindi

  // Middle East
  'sa': 'ar', // Saudi Arabia - Arabic
  'ae': 'ar', // UAE - Arabic
  'eg': 'ar', // Egypt - Arabic
  'il': 'he', // Israel - Hebrew
  'ir': 'fa', // Iran - Farsi/Persian
  'iq': 'ar', // Iraq - Arabic
  'sy': 'ar', // Syria - Arabic
  'lb': 'ar', // Lebanon - Arabic
  'jo': 'ar', // Jordan - Arabic
  'ye': 'ar', // Yemen - Arabic

  // Latin America
  'mx': 'es', // Mexico - Spanish
  'ar': 'es', // Argentina - Spanish
  'co': 'es', // Colombia - Spanish
  've': 'es', // Venezuela - Spanish
  'cl': 'es', // Chile - Spanish
  'pe': 'es', // Peru - Spanish
  'br': 'pt', // Brazil - Portuguese
  'uy': 'es', // Uruguay - Spanish
  'py': 'es', // Paraguay - Spanish
  'bo': 'es', // Bolivia - Spanish
  'ec': 'es', // Ecuador - Spanish
  'cu': 'es', // Cuba - Spanish

  // Africa
  'za': 'en', // South Africa - English (also Afrikaans, but en is widely used)
  'ma': 'ar', // Morocco - Arabic
  'dz': 'ar', // Algeria - Arabic
  'tn': 'ar', // Tunisia - Arabic
  'ly': 'ar', // Libya - Arabic

  // English-speaking countries (explicit for clarity)
  'us': 'en', // United States
  'gb': 'en', // United Kingdom
  'ca': 'en', // Canada (also French)
  'au': 'en', // Australia
  'nz': 'en', // New Zealand
  'ie': 'en', // Ireland

  // Default to English for all others
};

// Translate text using Google Translate API (via mymemory.translated.net - free alternative)
async function translateText(text, sourceLang, targetLang) {
  if (!text || !targetLang) return text;

  // If source and target are the same, no translation needed
  if (sourceLang === targetLang) return text;

  // If target is the likely source language, no translation needed
  if (sourceLang && targetLang === sourceLang) return text;

  try {
    // MyMemory API has a 500 character limit for the ENCODED query
    // We need to truncate based on encoded length, not raw text length
    let textToTranslate = text;
    let encodedText = encodeURIComponent(textToTranslate);

    // If encoded text exceeds limit, progressively shorten until it fits
    const maxEncodedLength = 450; // Conservative limit to be safe
    while (encodedText.length > maxEncodedLength && textToTranslate.length > 10) {
      // Remove ~10% of text each iteration
      const newLength = Math.floor(textToTranslate.length * 0.9);
      textToTranslate = textToTranslate.substring(0, newLength) + '...';
      encodedText = encodeURIComponent(textToTranslate);
    }

    // MyMemory API requires format: sourceLang|targetLang
    // If no source language, auto-detect by using empty string before pipe
    const langPair = sourceLang ? `${sourceLang}|${targetLang}` : `|${targetLang}`;
    const url = `https://api.mymemory.translated.net/get?q=${encodedText}&langpair=${langPair}`;

    console.log(`[Translation] Translating "${text.substring(0, 50)}..." from ${sourceLang || 'auto'} to ${targetLang} (encoded: ${encodedText.length} chars)`);

    const response = await fetch(url);

    // Check if response is JSON before parsing
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      console.warn('[Translation] Non-JSON response received, using original text');
      return text;
    }

    const data = await response.json();

    if (data.responseStatus === 200 && data.responseData && data.responseData.translatedText) {
      console.log('[Translation] Success:', data.responseData.translatedText.substring(0, 50) + '...');
      return data.responseData.translatedText;
    }

    // Log translation failure details
    if (data.responseStatus !== 200) {
      console.warn('[Translation] API returned status', data.responseStatus, ':', data.responseDetails || 'No details');
    }

    return text; // Return original if translation fails
  } catch (error) {
    console.warn('[Translation] Failed to translate:', error.message);
    return text; // Return original text on error
  }
}

// Translate long text by splitting into sentences and translating in chunks
async function translateLongText(text, sourceLang, targetLang) {
  if (!text || !targetLang) return text;
  if (sourceLang === targetLang) return text;

  try {
    // Split text into sentences (split on ., !, ?, but keep the punctuation)
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    const chunkSize = 400; // Safe size per request
    const translatedChunks = [];

    let currentChunk = '';

    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i];

      // If adding this sentence would exceed chunk size, translate current chunk first
      if (currentChunk.length + sentence.length > chunkSize && currentChunk.length > 0) {
        const translated = await translateText(currentChunk.trim(), sourceLang, targetLang);
        translatedChunks.push(translated);
        currentChunk = sentence;

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      } else {
        currentChunk += sentence;
      }
    }

    // Translate remaining chunk
    if (currentChunk.length > 0) {
      const translated = await translateText(currentChunk.trim(), sourceLang, targetLang);
      translatedChunks.push(translated);
    }

    return translatedChunks.join(' ');
  } catch (error) {
    console.error('[Translation] Failed to translate long text:', error.message);
    return text; // Return original on error
  }
}

// Translate article object (only title and description for feed view)
async function translateArticle(article, sourceLang, targetLang) {
  // Always return a valid article object, even if input is invalid
  if (!article) {
    console.warn('[Translation] Invalid article provided to translateArticle');
    return null;
  }

  if (!translationEnabled) return article;

  // If source and target are the same, no translation needed
  if (sourceLang === targetLang) return article;

  try {
    const translated = { ...article };

    // Translate title
    if (article.title) {
      translated.title = await translateText(article.title, sourceLang, targetLang);
    }

    // Translate description
    if (article.description) {
      translated.description = await translateText(article.description, sourceLang, targetLang);
    }

    // Don't translate content here - only translate when user clicks "more"
    // This saves API calls and speeds up initial loading

    return translated;
  } catch (error) {
    console.error('[Translation] Failed to translate article:', error.message);
    // Return original article if translation fails
    return article;
  }
}

async function showNewsBox(countryName, iso3Code) {
  console.log('[News Debug] showNewsBox called with:', { countryName, iso3Code });

  // Resolve ISO-3 to ISO-2 country code
  const countryCode = resolveCountryCode(countryName, iso3Code);

  // Clean ISO-3 code for display (remove numeric suffixes like "_2")
  const cleanIso3Code = iso3Code ? iso3Code.split('_')[0] : null;

  // Display country name with code in parentheses (e.g., "Ukraine (UKR)")
  const displayTitle = cleanIso3Code
    ? `${countryName} (${cleanIso3Code.toUpperCase()})`
    : countryName;

  newsBoxTitle.textContent = displayTitle;
  newsBox.classList.add('active');
  currentView = 'feed';

  // Attach drag listeners when news box opens
  attachNewsBoxDragListeners();

  // Store previous tab selection
  const previousTab = currentTab;

  // Only reset to stats tab if newsBox was not already active
  if (!currentNewsData) {
    currentTab = 'stats';
    document.getElementById('statsTab').classList.add('active');
    document.getElementById('newsTab').classList.remove('active');
  }

  // Store both ISO-3 (cleaned) and ISO-2 codes for stats and news APIs
  currentNewsData = { countryName, iso3Code: cleanIso3Code, countryCode };

  console.log('[News Debug] Resolved country code:', countryCode);
  console.log('[Translation] User language:', userLanguage, '| Translation enabled:', translationEnabled);

  // If Stats tab was selected, load stats for new country
  if (currentTab === 'stats') {
    showStatsView();
    return;
  }

  // Check if country has no news coverage
  if (!countryCode) {
    console.log('[News Debug] No country code available');
    newsBoxContent.innerHTML = '<div class="loading">No News<br><br>News coverage is not available for this country.</div>';
    return;
  }

  // Critical Fix #1: Check cache before making API call
  if (newsCache.has(countryCode)) {
    console.log('[News Debug] Using cached news for:', countryCode);
    const cachedArticles = newsCache.get(countryCode);
    currentNewsData.articles = cachedArticles;
    renderNewsFeed(cachedArticles);
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
      // Critical Fix #1: Cache the news data
      newsCache.set(countryCode, data.articles);
      currentNewsData.articles = data.articles;

      // Detect source language from country code
      const sourceLang = COUNTRY_LANGUAGES[countryCode] || 'en';
      console.log('[Translation] Source language:', sourceLang, '| Target language:', userLanguage);

      // Translate articles if translation is enabled and languages differ
      if (translationEnabled && sourceLang !== userLanguage) {
        console.log('[Translation] Translating articles from', sourceLang, 'to', userLanguage);
        newsBoxContent.innerHTML = '<div class="loading">Translating headlines...</div>';

        const articlesToTranslate = data.articles.slice(0, 10);
        const translatedArticles = await Promise.all(
          articlesToTranslate.map((article, index) =>
            translateArticle(article, sourceLang, userLanguage)
              .then(translated => translated || article) // Fall back to original if translation returns null
          )
        );

        // Check if at least some translations succeeded (not all are identical to originals)
        const hasTranslations = translatedArticles.some((translated, index) =>
          translated.title !== articlesToTranslate[index].title
        );

        if (hasTranslations) {
          currentNewsData.translatedArticles = translatedArticles;
          currentNewsData.sourceLang = sourceLang;
          renderNewsFeed(translatedArticles);
        } else {
          console.warn('[Translation] All translations failed, showing original articles');
          currentNewsData.sourceLang = sourceLang;
          renderNewsFeed(articlesToTranslate);
        }
      } else {
        console.log('[Translation] No translation needed - same language or translation disabled');
        renderNewsFeed(data.articles);
      }
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

  // Fix #6: Use DocumentFragment for efficient DOM manipulation
  const fragment = document.createDocumentFragment();
  const articlesToShow = articles.slice(0, 10);

  articlesToShow.forEach((article, index) => {
    const headline = escapeHtml(article.title);
    const description = article.description ? escapeHtml(article.description) : '';
    const source = escapeHtml(article.source?.name || 'Unknown');
    const author = article.author ? escapeHtml(article.author) : '';
    const publishedAt = article.publishedAt ? new Date(article.publishedAt).toLocaleDateString() : '';

    // Get first 2 lines of description
    const descriptionLines = description.split('\n').slice(0, 2).join('\n');

    const articleDiv = document.createElement('div');
    articleDiv.className = 'news-article';
    articleDiv.innerHTML = `
      <h3 class="news-headline">${headline}</h3>
      ${description ? `<p class="news-byline">${descriptionLines}</p>` : ''}
      <p class="news-meta">${source}${author ? ` • ${author}` : ''}${publishedAt ? ` • ${publishedAt}` : ''}</p>
      <a class="news-more" data-article-index="${index}">more →</a>
    `;

    fragment.appendChild(articleDiv);
  });

  // Clear and append in one operation
  newsBoxContent.innerHTML = '';
  newsBoxContent.appendChild(fragment);

  // Critical Fix #2: Remove old listener before adding new one (event delegation)
  newsBoxContent.removeEventListener('click', handleNewsArticleClick);
  newsBoxContent.addEventListener('click', handleNewsArticleClick);
}

// Critical Fix #2: Event delegation handler to avoid memory leaks
function handleNewsArticleClick(e) {
  if (e.target.classList.contains('news-more')) {
    e.preventDefault();
    const articleIndex = parseInt(e.target.dataset.articleIndex);
    showArticle(articleIndex);
  }
}

async function showArticle(articleIndex) {
  if (!currentNewsData || !currentNewsData.articles) return;

  // Use translated articles if translation is enabled and they exist, otherwise use originals
  const articlesSource = (translationEnabled && currentNewsData.translatedArticles)
    ? currentNewsData.translatedArticles
    : currentNewsData.articles;

  const article = articlesSource[articleIndex];

  // Safety check in case article is undefined (shouldn't happen with new logic)
  if (!article) {
    console.error('[News] Article not found at index:', articleIndex);
    return;
  }

  currentView = 'article';

  // Get title and description (already translated if applicable)
  const headline = escapeHtml(article.title);
  const description = article.description ? escapeHtml(article.description) : '';
  const source = escapeHtml(article.source?.name || 'Unknown');
  const author = article.author ? escapeHtml(article.author) : '';
  const publishedAt = article.publishedAt ? new Date(article.publishedAt).toLocaleDateString() : '';
  const url = article.url || '#';

  // Translate content on-demand if translation is enabled and content exists
  let content = '';
  if (article.content) {
    if (translationEnabled && currentNewsData.sourceLang && currentNewsData.sourceLang !== userLanguage) {
      // Show loading message while translating
      newsBoxContent.innerHTML = `
        <a class="news-back">← Back to feed</a>
        <div class="news-article">
          <h3 class="news-headline">${headline}</h3>
          ${description ? `<p class="news-byline">${description}</p>` : ''}
          <p class="news-meta">${source}${author ? ` • ${author}` : ''}${publishedAt ? ` • ${publishedAt}` : ''}</p>
          <div class="loading">Translating article...</div>
        </div>
      `;

      // Translate the content
      const translatedContent = await translateLongText(article.content, currentNewsData.sourceLang, userLanguage);
      content = escapeHtml(translatedContent);
    } else {
      content = escapeHtml(article.content);
    }
  }

  // Display the article with translated content
  newsBoxContent.innerHTML = `
    <a class="news-back">← Back to feed</a>
    <div class="news-article">
      <h3 class="news-headline">${headline}</h3>
      ${description ? `<p class="news-byline">${description}</p>` : ''}
      <p class="news-meta">${source}${author ? ` • ${author}` : ''}${publishedAt ? ` • ${publishedAt}` : ''}</p>
      ${content ? `<p class="news-body">${content}</p>` : ''}
      <a class="news-more" href="${url}" data-external-url="${url}">Read full article →</a>
    </div>
  `;

  // Add back button handler - use the same articles source for consistency
  document.querySelector('.news-back').addEventListener('click', (e) => {
    e.preventDefault();
    renderNewsFeed(articlesSource);
  });

  // Add external link handler - open in browser and close screensaver
  document.querySelector('.news-more').addEventListener('click', (e) => {
    e.preventDefault();
    const externalUrl = e.target.dataset.externalUrl;
    if (externalUrl && externalUrl !== '#' && window.electronAPI) {
      // Open URL in default browser
      window.electronAPI.openExternal(externalUrl);
      // Close the screensaver
      window.electronAPI.exitScreensaver();
    }
  });
}

function hideNewsBox() {
  newsBox.classList.remove('active');
  currentNewsData = null;
  currentView = 'feed';
  currentTab = 'news';

  // Detach drag listeners when news box closes
  detachNewsBoxDragListeners();

  // Remove news content click listener
  newsBoxContent.removeEventListener('click', handleNewsArticleClick);

  // Deselect all countries
  if (highlightedEntity && highlightedEntity.polygon) {
    const original = originalStyleByEntity.get(highlightedEntity);
    if (original) {
      highlightedEntity.polygon.outlineColor = original.outlineColor;
      highlightedEntity.polygon.outlineWidth = original.outlineWidth;
      highlightedEntity.polygon.material = original.material;
      // Critical Fix #3: Clean up Map entry to prevent memory leak
      originalStyleByEntity.delete(highlightedEntity);
    }
    highlightedEntity = null;
  }

  // Zoom back out to default view
  viewer.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(
      CONFIG.INITIAL_CAMERA.longitude,
      CONFIG.INITIAL_CAMERA.latitude,
      CONFIG.INITIAL_CAMERA.height
    ),
    duration: 2.0, // 2 second flight back
    complete: () => {
      // Resume auto-rotation after zoom completes
      autoRotate = true;
      if (autoRotateBtn) {
        autoRotateBtn.classList.add('active');
      }

      // Request render after camera movement completes
      viewer.scene.requestRender();
    }
  });
}

// ESC key handler to close news box
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && newsBox.classList.contains('active')) {
    hideNewsBox();
  }
});

// ============================================================================
// COUNTRY STATS FUNCTIONS
// ============================================================================

async function showStatsView() {
  if (!currentNewsData || !currentNewsData.iso3Code) {
    newsBoxContent.innerHTML = '<div class="loading">No country selected</div>';
    return;
  }

  const iso3Code = currentNewsData.iso3Code;
  const iso2Code = currentNewsData.countryCode; // This is the resolved ISO-2 code

  // Show loading state
  newsBoxContent.innerHTML = '<div class="loading">Loading country statistics...</div>';

  try {
    let stats;

    // Check cache first (use ISO-3 as cache key)
    if (statsCache.has(iso3Code)) {
      console.log('[Stats] Using cached stats for:', iso3Code);
      stats = statsCache.get(iso3Code);
    } else {
      console.log('[Stats] Fetching stats for ISO-3:', iso3Code, 'ISO-2:', iso2Code);

      // Fetch from API via IPC
      if (window.electronAPI && window.electronAPI.fetchCountryStats) {
        stats = await window.electronAPI.fetchCountryStats(iso3Code, iso2Code);

        if (stats) {
          statsCache.set(iso3Code, stats);
        } else {
          throw new Error('No stats returned from API');
        }
      } else {
        // Fallback for testing in browser
        stats = {
          name: currentNewsData.countryName,
          flag: `https://flagcdn.com/w320/${iso2Code}.png`,
          currency: { code: 'USD', name: 'US Dollar', symbol: '$' },
          population: 331000000,
          gdp: 63000,
          birthRate: 11.0,
          deathRate: 8.9,
          lastUpdated: '2024-01-01'
        };
        statsCache.set(iso3Code, stats);
      }
    }

    renderStatsGrid(stats, iso3Code, iso2Code);

  } catch (error) {
    console.error('[Stats] Failed to load stats:', error);
    newsBoxContent.innerHTML = `
      <div class="loading">
        Failed to load statistics<br><br>
        ${escapeHtml(error.message || 'Unknown error')}
      </div>
    `;
  }
}

function renderStatsGrid(stats, iso3Code, iso2Code) {
  // Format data with fallbacks
  const flagUrl = stats.flag || `https://flagcdn.com/w320/${iso2Code}.png`;

  const currencyCode = stats.currency?.code || 'N/A';
  const currencyName = stats.currency?.name || '';
  const currencySymbol = stats.currency?.symbol || '';

  const populationDisplay = stats.population
    ? stats.population.toLocaleString()
    : 'N/A';

  const gdpDisplay = stats.gdp
    ? `$${stats.gdp.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : 'N/A';

  const birthRateDisplay = stats.birthRate
    ? `${stats.birthRate.toFixed(1)} per 1,000`
    : 'N/A';

  const deathRateDisplay = stats.deathRate
    ? `${stats.deathRate.toFixed(1)} per 1,000`
    : 'N/A';

  const lastUpdated = stats.lastUpdated
    ? new Date(stats.lastUpdated).toLocaleDateString()
    : 'Unknown';

  // Render grid
  newsBoxContent.innerHTML = `
    <div class="stats-grid">
      <div class="stats-card full-width">
        <img src="${escapeHtml(flagUrl)}"
             alt="Flag of ${escapeHtml(stats.name || currentNewsData.countryName)}"
             class="stats-flag"
             onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
        <div style="display:none; text-align:center; padding:20px; color:rgba(255,255,255,0.4);">Flag unavailable</div>
        <div class="stats-card-label">Country</div>
        <div class="stats-card-value">${escapeHtml(stats.name || currentNewsData.countryName)}</div>
      </div>

      <div class="stats-card">
        <div class="stats-card-label">Currency</div>
        <div class="stats-card-value">${escapeHtml(currencyCode)}</div>
        ${currencyName ? `<div class="stats-card-subtext">${escapeHtml(currencySymbol)} ${escapeHtml(currencyName)}</div>` : ''}
      </div>

      <div class="stats-card">
        <div class="stats-card-label">Population</div>
        <div class="stats-card-value">${populationDisplay}</div>
      </div>

      <div class="stats-card">
        <div class="stats-card-label">GDP per Capita</div>
        <div class="stats-card-value">${gdpDisplay}</div>
        ${stats.gdp ? '<div class="stats-card-subtext">Current USD</div>' : ''}
      </div>

      <div class="stats-card">
        <div class="stats-card-label">Birth Rate</div>
        <div class="stats-card-value">${birthRateDisplay}</div>
      </div>

      <div class="stats-card">
        <div class="stats-card-label">Death Rate</div>
        <div class="stats-card-value">${deathRateDisplay}</div>
      </div>

      <div class="stats-card full-width">
        <button class="stats-refresh-btn" id="statsRefreshBtn">
          🔄 Refresh Data
        </button>
        <div class="stats-card-subtext" style="text-align: center; margin-top: 8px;">
          Last updated: ${lastUpdated}
        </div>
      </div>
    </div>
  `;

  // Add refresh button handler
  const refreshBtn = document.getElementById('statsRefreshBtn');
  refreshBtn.addEventListener('click', async () => {
    refreshBtn.disabled = true;
    refreshBtn.textContent = '⏳ Refreshing...';

    try {
      // Clear cache for this country (use ISO-3 as cache key)
      statsCache.delete(iso3Code);

      // Re-fetch
      await showStatsView();
    } catch (error) {
      console.error('[Stats] Refresh failed:', error);
      refreshBtn.disabled = false;
      refreshBtn.textContent = '❌ Refresh Failed';
      setTimeout(() => {
        refreshBtn.textContent = '🔄 Refresh Data';
      }, 2000);
    }
  });
}

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

    if (!API_KEY || API_KEY === 'YOUR_OPENWEATHER_API_KEY') {
      console.warn('[Weather] OpenWeather API key not configured. Weather overlay disabled.');
      return;
    }

    // High Fix #6: Only create layer if it doesn't exist, avoid recreating
    if (!weatherLayer) {
      console.log('[Weather] Initializing cloud layer...');
      weatherLayer = viewer.imageryLayers.addImageryProvider(
        new Cesium.UrlTemplateImageryProvider({
          url: `https://tile.openweathermap.org/map/clouds_new/{z}/{x}/{y}.png?appid=${API_KEY}`,
          minimumLevel: 0,
          maximumLevel: 6
        })
      );

      // Make clouds semi-transparent
      weatherLayer.alpha = 0.6;

      // Apply initial visibility based on saved settings
      weatherLayer.show = weatherEnabled;

      // Request render after adding imagery layer
      viewer.scene.requestRender();

      console.log('[Weather] Cloud layer initialized successfully');
    }
    // If layer exists, tiles will auto-update from the server

  } catch (error) {
    console.error('[Weather] Failed to update weather layer:', error);
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
    // High Fix #6: Only remove and recreate if storm data actually changed
    // For now, keep original behavior but optimize by reusing entities when possible

    // Remove old storm entities
    stormEntities.forEach(entity => viewer.entities.remove(entity));
    stormEntities = [];

    // Fix #5: Use API key from environment instead of hardcoding
    const API_KEY = await window.electronAPI.getApiKey('openweather');

    // Storm tracking requires specialized API like NOAA or paid OpenWeather One Call API
    // One Call API is no longer available in free tier, so we skip storm tracking
    // In production, you'd use a specialized API like NOAA hurricane tracking services
    const activeStorms = [];

    // Note: OpenWeather One Call API (onecall) requires paid subscription
    // Free tier only supports tile layers and current weather endpoints
    // Storm/alert data would need NOAA or similar specialized weather service

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

// Weather initialization happens after settings are loaded (see below)

// ============================================================================
// RENDER LOOP
// ============================================================================
// Fix #4: Store event listener reference for cleanup
preRenderRemoveCallback = viewer.scene.preRender.addEventListener(() => {
  rotateGlobe();
  updatePerformanceStats();
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
// SETTINGS PERSISTENCE
// ============================================================================
function loadSettings() {
  try {
    const savedSettings = localStorage.getItem('earthScreensaverSettings');
    if (savedSettings) {
      const settings = JSON.parse(savedSettings);
      console.log('[Settings] Loaded saved settings:', settings);
      return settings;
    }
  } catch (error) {
    console.warn('[Settings] Failed to load settings:', error.message);
  }
  // Default settings
  return {
    weatherEnabled: true,
    autoRotate: true,
    dayNightEnabled: true,
    translationEnabled: true,
    qualityPreset: 'balanced'  // Default quality preset
  };
}

function saveSettings() {
  try {
    const settings = {
      weatherEnabled: weatherEnabled,
      autoRotate: autoRotate,
      dayNightEnabled: viewer.scene.globe.enableLighting,
      translationEnabled: translationEnabled
    };
    localStorage.setItem('earthScreensaverSettings', JSON.stringify(settings));
    console.log('[Settings] Saved settings:', settings);
  } catch (error) {
    console.warn('[Settings] Failed to save settings:', error.message);
  }
}

// ============================================================================
// ICON TOGGLE BUTTONS
// ============================================================================
const weatherBtn = document.getElementById('weatherBtn');
const autoRotateBtn = document.getElementById('autoRotateBtn');
const dayNightBtn = document.getElementById('dayNightBtn');
const translateBtn = document.getElementById('translateBtn');

// Weather toggle
weatherBtn.addEventListener('click', (e) => {
  weatherBtn.classList.toggle('active');
  weatherEnabled = weatherBtn.classList.contains('active');

  if (weatherLayer) {
    weatherLayer.show = weatherEnabled;
  } else if (weatherEnabled) {
    // If weather is being enabled for the first time, initialize it
    updateWeatherLayer();
    updateStorms();
  }
  saveSettings();

  // Request render after settings change
  viewer.scene.requestRender();
});

// Auto-rotate toggle
autoRotateBtn.addEventListener('click', (e) => {
  autoRotateBtn.classList.toggle('active');
  autoRotate = autoRotateBtn.classList.contains('active');

  if (autoRotate) {
    lastRotateTime = Date.now(); // Reset timer to prevent jumps
  }
  saveSettings();

  // Request render when toggling rotation
  viewer.scene.requestRender();
});

// Day/night toggle
dayNightBtn.addEventListener('click', (e) => {
  dayNightBtn.classList.toggle('active');
  viewer.scene.globe.enableLighting = dayNightBtn.classList.contains('active');
  saveSettings();

  // Request render after lighting change
  viewer.scene.requestRender();
});

// Translation toggle
translateBtn.addEventListener('click', async (e) => {
  translateBtn.classList.toggle('active');
  translationEnabled = translateBtn.classList.contains('active');
  console.log('[Translation] Translation', translationEnabled ? 'enabled' : 'disabled');

  // If news is currently showing, refresh it with new translation setting
  if (newsBox.classList.contains('active') && currentNewsData && currentNewsData.articles) {
    console.log('[Translation] Refreshing news feed with translation:', translationEnabled);
    await renderNewsFeed(currentNewsData.articles);
  }

  saveSettings();
});

// ============================================================================
// PERFORMANCE STATS TOGGLE
// ============================================================================
const showStatsCheckbox = document.getElementById('showStatsCheckbox');
const performanceStatsDiv = document.getElementById('performanceStats');

showStatsCheckbox.addEventListener('change', (e) => {
  performanceStatsEnabled = e.target.checked;
  performanceStatsDiv.style.display = performanceStatsEnabled ? 'block' : 'none';

  if (performanceStatsEnabled) {
    // Reset counters when enabling
    renderCount = 0;
    lastFrameTime = performance.now();
    frameTimeSum = 0;
    frameTimeCount = 0;
  }
});

// ============================================================================
// QUALITY PRESET SELECTOR
// ============================================================================
const qualityPresetSelect = document.getElementById('qualityPreset');

qualityPresetSelect.addEventListener('change', (e) => {
  const preset = e.target.value;
  let settings;

  switch(preset) {
    case 'high_quality':
      settings = CONFIG.PERFORMANCE.PRESETS.HIGH_QUALITY;
      break;
    case 'high_performance':
      settings = CONFIG.PERFORMANCE.PRESETS.HIGH_PERFORMANCE;
      break;
    default:
      settings = CONFIG.PERFORMANCE.PRESETS.BALANCED;
  }

  // Apply settings to globe
  viewer.scene.globe.maximumScreenSpaceError = settings.maximumScreenSpaceError;
  viewer.scene.globe.tileCacheSize = settings.tileCacheSize;

  console.log('[Performance] Applied', preset, 'preset:', settings);

  // Save to localStorage
  try {
    const savedSettings = JSON.parse(localStorage.getItem('earthScreensaverSettings') || '{}');
    savedSettings.qualityPreset = preset;
    localStorage.setItem('earthScreensaverSettings', JSON.stringify(savedSettings));
  } catch (error) {
    console.warn('[Settings] Failed to save quality preset:', error);
  }

  // Request render to show changes
  viewer.scene.requestRender();
});

// ============================================================================
// APPLY SAVED SETTINGS ON STARTUP
// ============================================================================
const savedSettings = loadSettings();

// Apply to icon toggle buttons
if (savedSettings.weatherEnabled) {
  weatherBtn.classList.add('active');
} else {
  weatherBtn.classList.remove('active');
}

if (savedSettings.autoRotate) {
  autoRotateBtn.classList.add('active');
} else {
  autoRotateBtn.classList.remove('active');
}

if (savedSettings.dayNightEnabled) {
  dayNightBtn.classList.add('active');
} else {
  dayNightBtn.classList.remove('active');
}

if (savedSettings.translationEnabled) {
  translateBtn.classList.add('active');
} else {
  translateBtn.classList.remove('active');
}

// Apply to global variables
weatherEnabled = savedSettings.weatherEnabled;
autoRotate = savedSettings.autoRotate;
translationEnabled = savedSettings.translationEnabled;

// Apply saved quality preset
if (savedSettings.qualityPreset && qualityPresetSelect) {
  qualityPresetSelect.value = savedSettings.qualityPreset;
  // Trigger change event to apply the preset
  qualityPresetSelect.dispatchEvent(new Event('change'));
}

// Apply day/night lighting to viewer (if viewer is already initialized)
if (viewer && viewer.scene && viewer.scene.globe) {
  viewer.scene.globe.enableLighting = savedSettings.dayNightEnabled;
}

console.log('[Settings] Applied saved settings on startup');

// ============================================================================
// INITIALIZE WEATHER (after settings loaded)
// ============================================================================
// Initial weather load - only if weather is enabled
if (weatherEnabled) {
  updateWeatherLayer();
  updateStorms();
}

// Update weather and storms hourly - only if weather is enabled
// Fix #2: Store interval ID for cleanup
weatherUpdateInterval = setInterval(() => {
  if (weatherEnabled) {
    updateWeatherLayer();
    updateStorms();
  }
}, CONFIG.WEATHER_UPDATE_INTERVAL);

// Translation toggle event handler now defined with icon buttons above (lines 1993-2005)

// ============================================================================
// CONTROLS PANEL DRAGGING
// ============================================================================
const controlsPanel = document.getElementById('controlsPanel');
const controlsPanelHeader = controlsPanel.querySelector('h3');
let isDraggingControls = false;
let controlsDragOffsetX = 0;
let controlsDragOffsetY = 0;

function handleControlsDrag(e) {
  if (!isDraggingControls) return;

  try {
    const newX = e.clientX - controlsDragOffsetX;
    const newY = e.clientY - controlsDragOffsetY;

    // Keep within viewport bounds with safe fallback values
    const panelWidth = controlsPanel.offsetWidth || 250;
    const panelHeight = controlsPanel.offsetHeight || 400;
    const viewportWidth = window.innerWidth || 1920;
    const viewportHeight = window.innerHeight || 1080;

    const maxX = Math.max(0, viewportWidth - panelWidth);
    const maxY = Math.max(0, viewportHeight - panelHeight);

    const clampedX = Math.max(0, Math.min(newX, maxX));
    const clampedY = Math.max(0, Math.min(newY, maxY));

    controlsPanel.style.left = clampedX + 'px';
    controlsPanel.style.top = clampedY + 'px';
    controlsPanel.style.right = 'auto'; // Override right positioning
    e.stopPropagation(); // Prevent globe rotation while dragging
  } catch (error) {
    console.error('[Controls Panel] Drag error:', error);
    // Stop dragging on error
    isDraggingControls = false;
    controlsPanel.style.cursor = 'move';
    document.removeEventListener('mousemove', handleControlsDrag);
    document.removeEventListener('mouseup', handleControlsDragEnd);
  }
}

function handleControlsDragEnd(e) {
  if (isDraggingControls) {
    isDraggingControls = false;
    controlsPanel.style.cursor = 'move';
    document.removeEventListener('mousemove', handleControlsDrag);
    document.removeEventListener('mouseup', handleControlsDragEnd);
    e.stopPropagation(); // Prevent globe rotation after drag
  }
}

// Make controls panel draggable by clicking on header
controlsPanelHeader.addEventListener('mousedown', (e) => {
  isDraggingControls = true;

  // Calculate offset from panel's current position
  const rect = controlsPanel.getBoundingClientRect();
  controlsDragOffsetX = e.clientX - rect.left;
  controlsDragOffsetY = e.clientY - rect.top;
  controlsPanel.style.cursor = 'grabbing';

  document.addEventListener('mousemove', handleControlsDrag);
  document.addEventListener('mouseup', handleControlsDragEnd);

  e.preventDefault();
  e.stopPropagation(); // Prevent globe rotation
});

// Also allow dragging by clicking anywhere on the panel
controlsPanel.addEventListener('mousedown', (e) => {
  // Don't start drag if clicking on interactive elements
  if (e.target.tagName === 'INPUT' ||
      e.target.tagName === 'BUTTON' ||
      e.target.tagName === 'LABEL' ||
      e.target.tagName === 'SELECT' ||
      e.target.tagName === 'OPTION') {
    return;
  }

  isDraggingControls = true;

  const rect = controlsPanel.getBoundingClientRect();
  controlsDragOffsetX = e.clientX - rect.left;
  controlsDragOffsetY = e.clientY - rect.top;
  controlsPanel.style.cursor = 'grabbing';

  document.addEventListener('mousemove', handleControlsDrag);
  document.addEventListener('mouseup', handleControlsDragEnd);

  e.preventDefault();
  e.stopPropagation(); // Prevent globe rotation
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

  // End of initializeGlobeFeatures()
}

// ============================================================================
// COMPANY LOGO LOADER
// ============================================================================
function loadCompanyLogo() {
  const logoContainer = document.getElementById('companyLogo');
  const logoImg = logoContainer.querySelector('img');
  const controlsPanel = document.getElementById('controlsPanel');

  // Try to load logo from src/logo/logo.png
  logoImg.src = '../logo/logo.png';

  logoImg.onload = function() {
    console.log('[Logo] Company logo loaded successfully');
    logoContainer.classList.add('loaded');

    // Reposition controls panel underneath logo with 50px gap
    const logoHeight = logoContainer.offsetHeight;
    controlsPanel.style.top = (20 + logoHeight + 50) + 'px';
  };

  logoImg.onerror = function() {
    console.log('[Logo] No company logo found - using default layout');
    // Keep logo hidden, controls stay at default position
    logoContainer.style.display = 'none';
  };
}

// ============================================================================
// CLEANUP FUNCTION
// ============================================================================
// Fix #4: Cleanup function to prevent memory leaks when viewer is destroyed
function cleanup() {
  // Clear intervals
  if (sunPositionInterval) {
    clearInterval(sunPositionInterval);
    sunPositionInterval = null;
  }
  if (weatherUpdateInterval) {
    clearInterval(weatherUpdateInterval);
    weatherUpdateInterval = null;
  }
  if (decelerateInterval) {
    clearInterval(decelerateInterval);
    decelerateInterval = null;
  }

  // Remove event listeners
  if (postRenderRemoveCallback) {
    postRenderRemoveCallback();
  }
  if (preRenderRemoveCallback) {
    preRenderRemoveCallback();
  }

  // Cleanup country interaction handler
  if (countryInteractionHandler) {
    countryInteractionHandler.destroy();
    countryInteractionHandler = null;
  }

  // Cleanup news box drag listeners
  detachNewsBoxDragListeners();

  // Cleanup news content click listener
  newsBoxContent.removeEventListener('click', handleNewsArticleClick);

  // Clear news and stats caches to free memory
  newsCache.clear();
  statsCache.clear();

  // Clear original style map to prevent memory leaks
  originalStyleByEntity.clear();

  console.log('[EarthScreensaver] Cleanup completed');
}

// Cleanup on window unload
window.addEventListener('beforeunload', cleanup);
