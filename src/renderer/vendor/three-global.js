// Wrapper to expose THREE.js as a global variable
import * as THREE from './three.js';
window.THREE = THREE;
console.log('[Vendor] THREE.js loaded and exposed as global');
