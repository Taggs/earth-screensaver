// Electron module wrapper to bypass node_modules/electron resolution issue
// This file provides access to the actual Electron API, not the npm package

if (!process.versions.electron) {
  throw new Error('electron-wrapper can only be used inside Electron');
}

// Try different methods to get the real Electron module
let electron;

// Method 1: Try using process._linkedBinding or process.electronBinding
if (typeof process.electronBinding === 'function') {
  try {
    electron = process.electronBinding('electron');
    if (electron && electron.app) {
      module.exports = electron;
      return;
    }
  } catch (e) {
    // electronBinding didn't work
  }
}

// Method 2: Try process._linkedBinding
if (typeof process._linkedBinding === 'function') {
  try {
    electron = process._linkedBinding('electron_common_features');
    if (electron && electron.app) {
      module.exports = electron;
      return;
    }
  } catch (e) {
    // _linkedBinding didn't work
  }
}

// Method 3: Last resort - manipulate the module cache
const originalElectronPath = require.resolve('electron');
const originalModule = require.cache[originalElectronPath];

// Temporarily delete from cache
delete require.cache[originalElectronPath];

// Try requiring it fresh - but intercept the module system
const Module = require('module');
const originalLoad = Module._load;

Module._load = function(request, parent, isMain) {
  if (request === 'electron' && process.versions.electron) {
    // We're in Electron and someone is requiring 'electron'
    // The CLI wrapper already loaded the binary, so electron should be available internally
    // Try to get it from global namespace or process
    if (global.require && global.require.main) {
      // Check if there's a different module resolution path
      const electronInternal = originalLoad.call(this, 'electron/js2c/browser_init', parent, isMain);
      if (electronInternal) {
        return electronInternal;
      }
    }
  }
  return originalLoad.call(this, request, parent, isMain);
};

try {
  electron = originalLoad('electron', module, false);
} finally {
  Module._load = originalLoad;
  // Restore cache if we got a string
  if (typeof electron === 'string' && originalModule) {
    require.cache[originalElectronPath] = originalModule;
  }
}

if (!electron || typeof electron === 'string') {
  throw new Error('Unable to load Electron API - all methods failed');
}

module.exports = electron;
