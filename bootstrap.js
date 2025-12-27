// Bootstrap loader for Electron
// This file is loaded FIRST and handles the electron module conflict

console.log('[Bootstrap] Starting...');
console.log('[Bootstrap] Electron version:', process.versions.electron);
console.log('[Bootstrap] Node version:', process.versions.node);

// The electron npm package exports a PATH when required from Node
// But Electron's internal module system should provide the actual API
// We need to inject the real electron module into the module cache

// Step 1: Pre-load the real Electron API using internal bindings
let realElectronAPI = null;

// Try to get the electron API from process binding
if (typeof process._linkedBinding === 'function') {
  try {
    // Electron uses _linkedBinding for internal modules
    const features = process._linkedBinding('electron_common_features');
    console.log('[Bootstrap] Got features via _linkedBinding:', !!features);

    // Build the electron object from available bindings
    realElectronAPI = {};

    // List of bindings to try
    const bindings = [
      'electron_browser_app',
      'electron_browser_auto_updater',
      'electron_browser_browser_window',
      'electron_browser_content_tracing',
      'electron_browser_dialog',
      'electron_browser_menu',
      'electron_browser_power_monitor',
      'electron_browser_power_save_blocker',
      'electron_browser_protocol',
      'electron_browser_screen',
      'electron_browser_session',
      'electron_browser_system_preferences',
      'electron_browser_tray',
      'electron_browser_web_contents'
    ];

    for (const binding of bindings) {
      try {
        const module = process._linkedBinding(binding);
        if (module) {
          // Extract the class/function name from binding name
          const name = binding.replace('electron_browser_', '').replace(/_./g, m => m[1].toUpperCase());
          const capitalName = name.charAt(0).toUpperCase() + name.slice(1);
          realElectronAPI[capitalName] = module;
        }
      } catch (e) {
        // Binding not available
      }
    }

    console.log('[Bootstrap] Built electron API with keys:', Object.keys(realElectronAPI));
  } catch (e) {
    console.error('[Bootstrap] Failed to use _linkedBinding:', e);
  }
}

// If we successfully got the real API, inject it into the module system
if (realElectronAPI && Object.keys(realElectronAPI).length > 0) {
  console.log('[Bootstrap] Injecting real Electron API into require cache');

  // Get the path where electron would be resolved
  const electronModulePath = require.resolve('electron');

  // Replace the cached module with our real API
  require.cache[electronModulePath] = {
    id: electronModulePath,
    filename: electronModulePath,
    loaded: true,
    exports: realElectronAPI
  };

  console.log('[Bootstrap] Successfully injected Electron API');
} else {
  console.error('[Bootstrap] CRITICAL: Could not obtain real Electron API');
  console.error('[Bootstrap] Available globals:', Object.keys(global).filter(k => k.toLowerCase().includes('electron')));
  console.error('[Bootstrap] Available on process:', Object.keys(process).filter(k => k.toLowerCase().includes('electron')));
}

// Now load the actual main file
console.log('[Bootstrap] Loading main app...');
require('./src/main/main.js');
