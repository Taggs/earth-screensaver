// High Fix #8: Import CITIES from cities.js instead of duplicating
import { CITIES } from './cities.js';

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
      infoBox: true  // enable info box
    });

    // Keep overlays visible even when clamped entities intersect terrain
    viewer.scene.globe.depthTestAgainstTerrain = false;
    viewer.scene.pickTranslucentDepth = false; // Disable to prevent WebGL bindTexture errors

    console.log('[Globe] Viewer created');

    // Now load assets that require authentication
    await loadBingMapsImagery();

    // Continue with rest of setup
    setupScene();

    // Initialize all the globe features
    initializeGlobeFeatures();

  } catch (error) {
    console.error('Failed to initialize app:', error);
    document.getElementById('cesiumContainer').innerHTML = '<div style="color: white; padding: 40px; text-align: center;"><h1>Initialization Error</h1><p>' + error.message + '</p></div>';
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
// Critical Fix #4: decelerateInterval declared at module level (line 190)

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
  'BRN': 'bn', 'TWN': 'tw', 'HKG': 'hk', 'MAC': 'mo'
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
      });

      // Stop auto-rotation immediately
      autoRotate = false;
      if (autoRotateCheckbox) {
        autoRotateCheckbox.checked = false;
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
const newsBox = document.getElementById('newsBox');
const newsBoxTitle = document.getElementById('newsBoxTitle');
const newsBoxContent = document.getElementById('newsBoxContent');
const newsBoxClose = document.getElementById('newsBoxClose');
const newsBoxHeader = document.getElementById('newsBoxHeader');

let currentNewsData = null;
let currentView = 'feed'; // 'feed' or 'article'

// Critical Fix #1: News API caching to prevent N+1 queries
const newsCache = new Map();

// High Fix #11: Define handlers outside to enable proper cleanup
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

// Draggable functionality
newsBoxHeader.addEventListener('mousedown', (e) => {
  if (e.target === newsBoxClose || e.target.tagName === 'A') return;

  isDraggingNewsBox = true;
  dragOffsetX = e.clientX - newsBox.offsetLeft;
  dragOffsetY = e.clientY - newsBox.offsetTop;
  newsBox.style.cursor = 'grabbing';

  // High Fix #11: Only attach listeners when actually dragging
  document.addEventListener('mousemove', handleNewsBoxDrag);
  document.addEventListener('mouseup', handleNewsBoxDragEnd);

  e.preventDefault();
  e.stopPropagation(); // Prevent globe rotation
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
  currentNewsData = { countryName, iso3Code, countryCode };

  console.log('[News Debug] Resolved country code:', countryCode);

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
      if (autoRotateCheckbox) {
        autoRotateCheckbox.checked = true;
      }
    }
  });
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

    // High Fix #6: Only create layer if it doesn't exist, avoid recreating
    if (!weatherLayer) {
      weatherLayer = viewer.imageryLayers.addImageryProvider(
        new Cesium.UrlTemplateImageryProvider({
          url: `https://tile.openweathermap.org/map/clouds_new/{z}/{x}/{y}.png?appid=${API_KEY}`,
          minimumLevel: 0,
          maximumLevel: 6
        })
      );

      // Make clouds semi-transparent
      weatherLayer.alpha = 0.6;
    }
    // If layer exists, tiles will auto-update from the server

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
    // High Fix #6: Only remove and recreate if storm data actually changed
    // For now, keep original behavior but optimize by reusing entities when possible

    // Remove old storm entities
    stormEntities.forEach(entity => viewer.entities.remove(entity));
    stormEntities = [];

    // Fix #5: Use API key from environment instead of hardcoding
    const API_KEY = await window.electronAPI.getApiKey('openweather');

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
// Fix #2: Store interval ID for cleanup
weatherUpdateInterval = setInterval(() => {
  updateWeatherLayer();
  updateStorms();
}, CONFIG.WEATHER_UPDATE_INTERVAL);

// ============================================================================
// RENDER LOOP
// ============================================================================
// Fix #4: Store event listener reference for cleanup
preRenderRemoveCallback = viewer.scene.preRender.addEventListener(() => {
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
      e.target.tagName === 'LABEL') {
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

  console.log('[EarthScreensaver] Cleanup completed');
}

// Cleanup on window unload
window.addEventListener('beforeunload', cleanup);
