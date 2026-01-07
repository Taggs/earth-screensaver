/**
 * Three.js + three-globe implementation for Earth Screensaver
 * Replaces Cesium with a lightweight globe using Natural Earth data
 *
 * Dependencies loaded via script tags in index.html:
 * - THREE (from three.min.js)
 * - ThreeGlobe (from three-globe.min.js)
 * - cities (from cities-ne.js)
 */

(function() {
  'use strict';

  console.log('[Globe] Script loaded, waiting for libraries...');

// ============================================================================
// CONFIGURATION
// ============================================================================
const CONFIG = {
  // Rotation speed (radians per frame)
  ROTATION_SPEED: 0.01,

  // Initial camera position
  INITIAL_CAMERA: {
    position: { x: 0, y: 0, z: 250 },  // Distance from center (closer)
    lookAt: { x: 0, y: 0, z: 0 }
  },

  // Label visibility settings (distance-based)
  LABELS: {
    CAPITAL_MAX_DISTANCE: 600,      // Capitals visible from far
    MAJOR_CITY_MAX_DISTANCE: 300,   // Major cities (pop > 5M)
    SECONDARY_CITY_MAX_DISTANCE: 150, // Secondary cities
    MAJOR_CITY_POPULATION: 5000000
  },

  // Colors
  COLORS: {
    BACKGROUND: '#000000',
    CAPITAL_LABEL: '#FFD700',
    CITY_LABEL: '#FFFFFF',
    COUNTRY_FILL: 'rgba(200, 200, 200, 0.05)',
    COUNTRY_STROKE: '#ffffff'
  }
};

// ============================================================================
// GLOBAL STATE
// ============================================================================
let scene, camera, renderer, globe;
let animationFrameId = null;
let isRotating = true;
let countries = null;
let selectedCountry = null;

// ============================================================================
// TILE LOADING
// ============================================================================
/**
 * Custom tile provider that loads from local tiles directory
 * Tiles are in format: tiles/{z}/{x}/{y}.png
 */
function createTileTextureUrl(zoom, x, y) {
  // For now, use a single base tile (zoom 0)
  // We'll enhance this later with proper LOD
  const maxZoom = 7;
  const clampedZoom = Math.min(zoom, maxZoom);

  // Convert tile path to file:// URL for Electron
  // In Electron, we need to use the correct path
  return `../../tiles/${clampedZoom}/${x}/${y}.png`;
}

/**
 * Load a composite texture from our generated tiles
 * For initial implementation, we'll use zoom level 0 as base texture
 */
async function loadGlobeTexture() {
  return new Promise((resolve, reject) => {
    const loader = new THREE.TextureLoader();

    // Load the base tile (zoom 0, which is the entire world in one tile)
    loader.load(
      '../../tiles/0/0/0.png',
      (texture) => {
        console.log('[Globe] Base texture loaded successfully');
        resolve(texture);
      },
      undefined,
      (error) => {
        console.error('[Globe] Failed to load base texture:', error);
        // Create a fallback solid color texture
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');

        // Ocean color
        ctx.fillStyle = '#144780';
        ctx.fillRect(0, 0, 256, 256);

        const texture = new THREE.CanvasTexture(canvas);
        console.log('[Globe] Using fallback texture');
        resolve(texture);
      }
    );
  });
}

// ============================================================================
// INITIALIZATION
// ============================================================================
async function initializeGlobe() {
  console.log('[Globe] Initializing three-globe...');

  try {
    // Get container
    const container = document.getElementById('globeContainer');
    if (!container) {
      throw new Error('Globe container not found');
    }

    // Create scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(CONFIG.COLORS.BACKGROUND);

    // Create camera
    const aspect = window.innerWidth / window.innerHeight;
    camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 10000);
    camera.position.set(
      CONFIG.INITIAL_CAMERA.position.x,
      CONFIG.INITIAL_CAMERA.position.y,
      CONFIG.INITIAL_CAMERA.position.z
    );
    camera.lookAt(
      CONFIG.INITIAL_CAMERA.lookAt.x,
      CONFIG.INITIAL_CAMERA.lookAt.y,
      CONFIG.INITIAL_CAMERA.lookAt.z
    );

    // Create renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);

    // Create globe with tile URL (three-globe expects a URL string, not a Texture)
    globe = new ThreeGlobe()
      .globeImageUrl('../../tiles/0/0/0.png'); // Pass URL directly

    console.log('[Globe] Globe object created:', globe);
    console.log('[Globe] Globe position:', globe.position);
    console.log('[Globe] Globe scale:', globe.scale);

    // Wait a bit for globe to initialize its internal geometry
    await new Promise(resolve => setTimeout(resolve, 100));

    // Add globe to scene
    scene.add(globe);

    // Add ambient light to illuminate the globe
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
    scene.add(ambientLight);

    // Add directional light (sun) - very bright
    const sunLight = new THREE.DirectionalLight(0xffffff, 1.5);
    sunLight.position.set(5, 3, 5);
    scene.add(sunLight);

    // Add another light from opposite side
    const backLight = new THREE.DirectionalLight(0xffffff, 0.5);
    backLight.position.set(-5, -3, -5);
    scene.add(backLight);

    console.log('[Globe] Three-globe initialized successfully');
    console.log('[Globe] Lights added - ambient:', ambientLight.intensity, 'sun:', sunLight.intensity);

    // Load countries data
    await loadCountriesData();

    // Load cities data
    loadCitiesData();

    // Setup event listeners
    setupEventListeners();

    // Start animation loop
    animate();

    console.log('[Globe] Initialization complete');

  } catch (error) {
    console.error('[Globe] Initialization failed:', error);
    throw error;
  }
}

// ============================================================================
// DATA LOADING
// ============================================================================
async function loadCountriesData() {
  try {
    console.log('[Globe] Loading countries data...');

    const response = await fetch('../data/countries-ne.geo.json');
    const geojson = await response.json();

    countries = geojson.features;

    // Add countries as polygons to globe
    globe.polygonsData(countries)
      .polygonCapColor(() => CONFIG.COLORS.COUNTRY_FILL)
      .polygonSideColor(() => CONFIG.COLORS.COUNTRY_FILL)
      .polygonStrokeColor(() => CONFIG.COLORS.COUNTRY_STROKE)
      .polygonAltitude(0.001);

    console.log(`[Globe] Loaded ${countries.length} countries`);

  } catch (error) {
    console.error('[Globe] Failed to load countries:', error);
  }
}

function loadCitiesData() {
  try {
    console.log('[Globe] Loading cities data...');

    // Convert cities array to format expected by three-globe
    // Cities format: [name, lat, lon, population, isCapital, country]
    const cityLabels = cities.map(city => ({
      lat: city[1],
      lng: city[2],
      text: city[0],
      population: city[3],
      isCapital: city[4],
      country: city[5],
      size: city[4] ? 1.5 : 1.0,  // Larger for capitals
      color: city[4] ? CONFIG.COLORS.CAPITAL_LABEL : CONFIG.COLORS.CITY_LABEL
    }));

    // Add labels to globe
    globe.labelsData(cityLabels)
      .labelLat(d => d.lat)
      .labelLng(d => d.lng)
      .labelText(d => d.text)
      .labelSize(d => d.size)
      .labelColor(d => d.color)
      .labelResolution(2)
      .labelAltitude(0.01);

    console.log(`[Globe] Loaded ${cityLabels.length} cities`);

  } catch (error) {
    console.error('[Globe] Failed to load cities:', error);
  }
}

// ============================================================================
// EVENT HANDLING
// ============================================================================
function setupEventListeners() {
  // Window resize
  window.addEventListener('resize', onWindowResize);

  // Mouse events for interaction
  const canvas = renderer.domElement;

  canvas.addEventListener('mousedown', onMouseDown);
  canvas.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('mouseup', onMouseUp);
  canvas.addEventListener('wheel', onMouseWheel);

  console.log('[Globe] Event listeners initialized');
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

let isDragging = false;
let previousMousePosition = { x: 0, y: 0 };

function onMouseDown(event) {
  isDragging = true;
  isRotating = false; // Stop auto-rotation when user interacts
  previousMousePosition = {
    x: event.clientX,
    y: event.clientY
  };
}

function onMouseMove(event) {
  if (!isDragging) return;

  const deltaX = event.clientX - previousMousePosition.x;
  const deltaY = event.clientY - previousMousePosition.y;

  // Rotate globe based on mouse movement
  globe.rotation.y += deltaX * 0.005;
  globe.rotation.x += deltaY * 0.005;

  // Clamp X rotation to prevent flipping
  globe.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, globe.rotation.x));

  previousMousePosition = {
    x: event.clientX,
    y: event.clientY
  };
}

function onMouseUp() {
  isDragging = false;
  // Resume auto-rotation after a delay
  setTimeout(() => {
    if (!isDragging) {
      isRotating = true;
    }
  }, 3000);
}

function onMouseWheel(event) {
  event.preventDefault();

  // Zoom in/out
  const delta = event.deltaY * 0.1;
  camera.position.z += delta;

  // Clamp zoom
  camera.position.z = Math.max(150, Math.min(800, camera.position.z));
}

// ============================================================================
// ANIMATION LOOP
// ============================================================================
function animate() {
  animationFrameId = requestAnimationFrame(animate);

  // Auto-rotate globe
  if (isRotating) {
    globe.rotation.y += CONFIG.ROTATION_SPEED;
  }

  // Render scene
  renderer.render(scene, camera);
}

// ============================================================================
// PUBLIC API
// ============================================================================
function init() {
  // Check dependencies before initializing
  if (typeof THREE === 'undefined') {
    throw new Error('THREE.js not loaded');
  }
  if (typeof ThreeGlobe === 'undefined') {
    throw new Error('three-globe not loaded');
  }
  if (typeof cities === 'undefined') {
    throw new Error('cities data not loaded');
  }

  console.log('[Globe] All dependencies loaded, initializing...');
  return initializeGlobe();
}

function dispose() {
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
  }

  if (renderer) {
    renderer.dispose();
  }

  console.log('[Globe] Disposed');
}

// ============================================================================
// AUTO-INITIALIZE
// ============================================================================
// Wait for libraries to load before initializing
if (typeof window !== 'undefined') {
  function tryInit() {
    try {
      init();
    } catch (error) {
      console.error('[Globe] Failed to initialize:', error);
      document.getElementById('globeContainer').innerHTML =
        '<div style="color: white; padding: 40px; text-align: center;">' +
        '<h1>Error Loading Globe</h1>' +
        '<p>' + error.message + '</p>' +
        '</div>';
    }
  }

  // Wait for both DOM and libraries to be ready
  let domReady = document.readyState !== 'loading';
  let libsReady = typeof THREE !== 'undefined' && typeof ThreeGlobe !== 'undefined';

  if (domReady && libsReady) {
    tryInit();
  } else {
    if (!domReady) {
      document.addEventListener('DOMContentLoaded', function() {
        domReady = true;
        if (libsReady) tryInit();
      });
    }

    if (!libsReady) {
      window.addEventListener('libraries-loaded', function() {
        libsReady = true;
        if (domReady) tryInit();
      });
    }
  }
}

})(); // End IIFE
