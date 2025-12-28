console.log('[Test] Starting test...');
const electron = require('electron');
console.log('[Test] Electron module:', typeof electron);
console.log('[Test] Electron.app:', typeof electron.app);

const { app } = require('electron');
console.log('[Test] app variable:', typeof app, app);

if (app) {
  app.whenReady().then(() => {
    console.log('[Test] Electron is ready!');
    app.quit();
  });
} else {
  console.error('[Test] app is undefined!');
  process.exit(1);
}
