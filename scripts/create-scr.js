const fs = require('fs');
const path = require('path');

// Path to the built executable
const distPath = path.join(__dirname, '..', 'dist');
const exePath = path.join(distPath, 'EarthScreensaver.exe');
const scrPath = path.join(distPath, 'EarthScreensaver.scr');

console.log('Creating Windows screensaver (.scr) file...');
console.log('Source:', exePath);
console.log('Destination:', scrPath);

try {
  // Check if the exe exists
  if (!fs.existsSync(exePath)) {
    console.error('Error: EarthScreensaver.exe not found in dist folder');
    console.error('Please run "npm run build:win" first');
    process.exit(1);
  }

  // Copy the exe to .scr
  fs.copyFileSync(exePath, scrPath);

  console.log('✓ Successfully created EarthScreensaver.scr');
  console.log('\nTo install the screensaver:');
  console.log('1. Right-click EarthScreensaver.scr');
  console.log('2. Select "Install"');
  console.log('   OR');
  console.log('1. Copy EarthScreensaver.scr to C:\\Windows\\System32\\');
  console.log('2. Open Windows Settings → Personalization → Lock screen');
  console.log('3. Click "Screen saver settings"');
  console.log('4. Select "EarthScreensaver" from the dropdown');

} catch (error) {
  console.error('Error creating .scr file:', error.message);
  process.exit(1);
}
