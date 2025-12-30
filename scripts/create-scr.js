const fs = require('fs');
const path = require('path');

// Path to the built executable
const distPath = path.join(__dirname, '..', 'dist', 'win-unpacked');
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

  // Copy config.json template to dist folder
  const configTemplatePath = path.join(__dirname, '..', 'config.template.json');
  const configDestPath = path.join(distPath, 'config.json');

  if (fs.existsSync(configTemplatePath)) {
    fs.copyFileSync(configTemplatePath, configDestPath);
    console.log('✓ Copied config.json to distribution folder');
  } else {
    console.warn('⚠ Warning: config.template.json not found - you\'ll need to create config.json manually');
  }

  console.log('\nTo install the screensaver:');
  console.log('1. Right-click EarthScreensaver.scr');
  console.log('2. Select "Install"');
  console.log('   OR');
  console.log('1. Copy the entire folder to a permanent location');
  console.log('2. Copy EarthScreensaver.scr to C:\\Windows\\System32\\');
  console.log('3. Open Windows Settings → Personalization → Lock screen');
  console.log('4. Click "Screen saver settings"');
  console.log('5. Select "EarthScreensaver" from the dropdown');
  console.log('\nIMPORTANT: Keep config.json in the same folder as EarthScreensaver.exe');

} catch (error) {
  console.error('Error creating .scr file:', error.message);
  process.exit(1);
}
