// Initialize Three.js and three-globe in correct order
(async function() {
  console.log('[Init] Loading Three.js...');

  // Dynamically import THREE
  const THREE = await import('../../../node_modules/three/build/three.module.js');
  window.THREE = THREE;
  console.log('[Init] THREE.js loaded:', Object.keys(THREE).length, 'exports');

  // Now load three-globe UMD script which will use the global THREE
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = '../../node_modules/three-globe/dist/three-globe.min.js';
    script.onload = () => {
      console.log('[Init] ThreeGlobe loaded:', typeof window.ThreeGlobe);
      resolve();
    };
    script.onerror = (err) => {
      console.error('[Init] Failed to load three-globe:', err);
      reject(err);
    };
    document.head.appendChild(script);
  });
})().then(() => {
  console.log('[Init] All libraries loaded successfully');
  window.dispatchEvent(new Event('libraries-loaded'));
}).catch(err => {
  console.error('[Init] Failed to initialize libraries:', err);
});
