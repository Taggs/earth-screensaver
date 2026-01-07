// Load THREE.js as ES module and expose as global
import * as THREE from '../../../node_modules/three/build/three.module.js';
window.THREE = THREE;
console.log('[Vendor] THREE.js loaded:', typeof THREE, 'Keys:', Object.keys(THREE).length);
