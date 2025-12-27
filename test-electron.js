// Test electron loading
console.log('[Test] Starting electron test...');
console.log('[Test] process.versions.electron:', process.versions.electron);
console.log('[Test] process.type:', process.type);
console.log('[Test] __dirname:', __dirname);
console.log('[Test] __filename:', __filename);

// Check if we're in Electron
if (process.versions.electron) {
  console.log('[Test] We ARE inside Electron!');
  console.log('[Test] Electron version:', process.versions.electron);
  console.log('[Test] Node version:', process.versions.node);
  console.log('[Test] Chrome version:', process.versions.chrome);
} else {
  console.log('[Test] We are NOT inside Electron (regular Node.js)');
}

try {
  const electron = require('electron');
  console.log('[Test] Electron type:', typeof electron);
  console.log('[Test] Electron value:', electron);
  console.log('[Test] Electron.app exists:', !!electron.app);

  if (electron.app) {
    console.log('[Test] SUCCESS - electron.app is available');
    electron.app.whenReady().then(() => {
      console.log('[Test] App is ready!');
      electron.app.quit();
    });
  } else {
    console.log('[Test] FAILED - electron.app is undefined');
    console.log('[Test] Electron returned:', JSON.stringify(electron));
  }
} catch (error) {
  console.error('[Test] Error loading electron:', error);
}
