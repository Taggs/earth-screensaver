/**
 * Three.js + three-globe implementation for Earth Screensaver
 * Replaces Cesium with a lightweight globe using Natural Earth data
 */

import ThreeGlobe from 'three-globe';
import * as THREE from 'three';
import { cities } from './data/cities-ne.js';

// ============================================================================
// CONFIGURATION
// ============================================================================
const CONFIG = {
  // Rotation speed (radians per second)
  ROTATION_SPEED: 0.001,

  // Initial camera position
  INITIAL_CAMERA: {
    position: { x: 0, y: 0, z: 400 },  // Distance from center
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

    // Create globe
    globe = new ThreeGlobe()
      .globeImageUrl(null); // We'll set texture manually

    // Load and apply texture
    const texture = await loadGlobeTexture();
    globe.globeImageUrl(null); // Clear default

    // Apply texture to globe material
    const globeMaterial = globe.children[0].material;
    globeMaterial.map = texture;
    globeMaterial.needsUpdate = true;

    // Add globe to scene
    scene.add(globe);

    // Add ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    // Add directional light (sun)
    const sunLight = new THREE.DirectionalLight(0xffffff, 0.8);
    sunLight.position.set(1, 0.5, 1);
    scene.add(sunLight);

    console.log('[Globe] Three-globe initialized successfully');

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

    const response = await fetch('../../src/data/countries-ne.geo.json');
    const geojson = await response.json();

    countries = geojson.features;

    // Add countries as polygons to globe
    globe.polygonsData(countries)
      .polygonCapColor(() => CONFIG.COLORS.COUNTRY_FILL)
      .polygonSideColor(() => CONFIG.COLORS.COUNTRY_FILL)
      .polygonStrokeColor(() => CONFIG.COLORS.COUNTRY_STROKE)
      .polygonAltitude(0.001)
      .polygonStroke(true);

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
export function init() {
  return initializeGlobe();
}

export function dispose() {
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
// Initialize when module loads
if (typeof window !== 'undefined') {
  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}
