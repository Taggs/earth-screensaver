# Windows Screensaver Setup Guide

## Quick Start

### Step 1: Build the Screensaver

```bash
npm install
npm run build:win:scr
```

This will:
- Build the Electron app as a portable .exe
- Automatically create a .scr file from the .exe
- Place both files in the `dist/` folder

### Step 2: Install the Screensaver

**Method 1: Automatic Installation (Recommended)**

Right-click `install-screensaver.bat` and select **"Run as administrator"**

**Method 2: Manual Installation**

1. Navigate to `dist/` folder
2. Right-click `EarthScreensaver.scr`
3. Select **"Install"**

**Method 3: Manual Copy**

```powershell
# Run PowerShell as Administrator
Copy-Item "dist\EarthScreensaver.scr" -Destination "C:\Windows\System32\" -Force
```

### Step 3: Activate the Screensaver

1. Press **Win + I** to open Settings
2. Go to: **Personalization → Lock screen**
3. Scroll down and click **"Screen saver settings"**
4. Select **"EarthScreensaver"** from the dropdown
5. Set wait time (e.g., 5 minutes)
6. Click **"Apply"** and **"OK"**

---

## Testing the Screensaver

Before installing, test the different modes:

```bash
# Test normal screensaver mode
npm start

# Test with dev tools
npm start -- --dev

# Test screensaver mode explicitly
dist\EarthScreensaver.exe /s

# Test configuration dialog
dist\EarthScreensaver.exe /c
```

---

## Windows Screensaver Arguments

The app now supports Windows screensaver command-line arguments:

- **`/s`** - Run screensaver (fullscreen)
- **`/c`** - Show configuration dialog
- **`/p <hwnd>`** - Preview mode (not fully implemented)
- **No args** - Also runs as screensaver

---

## Configuration

### API Keys

The screensaver requires API keys for weather and news data. Configure them in a `.env` file:

1. Create `.env` in the project root:

```env
CESIUM_ION_TOKEN=your_cesium_token_here
OPENWEATHER_API_KEY=your_openweather_key_here
WORLDNEWS_API_KEY=your_worldnews_key_here
```

2. Get free API keys:
   - **Cesium Ion**: https://cesium.com/ion/tokens
   - **OpenWeatherMap**: https://openweathermap.org/api
   - **WorldNews API**: https://worldnewsapi.com/

### Settings Dialog

When installed as a screensaver, click **"Settings"** in the Windows screensaver dialog to view:
- Feature list
- Keyboard controls
- Configuration information

---

## Uninstalling

**Method 1: Windows Settings**
1. Open screensaver settings
2. Select a different screensaver
3. Delete `C:\Windows\System32\EarthScreensaver.scr`

**Method 2: Command Line**
```powershell
# Run as Administrator
Remove-Item "C:\Windows\System32\EarthScreensaver.scr" -Force
```

---

## Troubleshooting

### Screensaver doesn't appear in list
- Make sure you copied the .scr file to `C:\Windows\System32\`
- Try restarting Windows
- Check if the file has the correct .scr extension

### Black screen only
- Check that API keys are configured in .env
- The app needs internet access for weather/news data
- Try running `dist\EarthScreensaver.exe` directly to see error messages

### Settings button doesn't work
- The configuration dialog should open automatically
- If it doesn't, check console logs: `dist\EarthScreensaver.exe /c`

### Screensaver won't exit
- Move the mouse or press any key
- Press ESC to force exit
- Press Alt+F4 as fallback

### Performance issues
- The app uses WebGL for 3D rendering
- Make sure GPU drivers are up to date
- Lower screen resolution if needed
- Close other GPU-intensive applications

---

## Development

### Building without creating .scr

```bash
npm run build:win
```

### Testing screensaver modes locally

```bash
# Screensaver mode
npm start

# Configuration mode
node -e "require('child_process').spawn('npm', ['start', '--', '/c'], {stdio: 'inherit'})"
```

### Project Structure

```
earth-screensaver/
├── src/
│   ├── main/
│   │   ├── main.js          # Main process (handles screensaver args)
│   │   └── preload.js
│   ├── renderer/
│   │   ├── index.html       # Main screensaver view
│   │   ├── globe.js         # Globe rendering logic
│   │   └── config.html      # Settings dialog (optional)
│   └── data/
│       └── countries.geo.json
├── scripts/
│   └── create-scr.js        # Build script to create .scr
├── dist/                    # Build output
├── package.json
└── .env                     # API keys (not in git)
```

---

## Advanced Configuration

### Custom Icon

1. Create an icon file: `build/icon.ico`
2. Update `package.json`:
   ```json
   "win": {
     "icon": "build/icon.ico"
   }
   ```
3. Rebuild

### Multi-Monitor Support

The screensaver currently runs on the primary display only. For multi-monitor support, modify `main.js`:

```javascript
const displays = screen.getAllDisplays();
displays.forEach(display => {
  // Create window for each display
});
```

---

## Credits

- Built with [Electron](https://www.electronjs.org/)
- Globe rendering with [Cesium](https://cesium.com/)
- Weather data from [OpenWeatherMap](https://openweathermap.org/)
- News data from [WorldNews API](https://worldnewsapi.com/)
