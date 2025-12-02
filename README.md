# Earth Screensaver

A desktop globe screensaver with realistic day/night cycle, weather overlay, and country news.

## Features

- **High-res globe** with CesiumJS (Bing Maps imagery, terrain)
- **Day/night cycle** based on system time (realistic sun position)
- **Auto-rotation** around vertical axis (doesn't affect terminator line)
- **Manual spin** via mouse drag with momentum
- **Weather overlay** (cloud layer from OpenWeatherMap)
- **Country click → News** headlines from NewsAPI

## Prerequisites

1. **Node.js** 18+ 
2. **Cesium Ion token** (free): https://cesium.com/ion/tokens
3. **OpenWeatherMap API key** (free tier): https://openweathermap.org/api
4. **NewsAPI key** (free tier, 100 req/day): https://newsapi.org/

## Setup

```bash
# Install dependencies
npm install

# Configure API keys (edit these files):
# 1. src/renderer/globe.js - Line 5: CESIUM_ION_TOKEN
# 2. src/renderer/globe.js - Line 227: OpenWeatherMap API key
# 3. Set environment variables (or edit src/main/main.js):
export OPENWEATHER_API_KEY=your_key
export NEWS_API_KEY=your_key

# Run in development
npm start

# Run with dev tools
npm start -- --dev
```

## Build for Distribution

```bash
# Windows
npm run build:win

# macOS
npm run build:mac
```

Output will be in `dist/` folder.

## Configuration

Edit `CONFIG` object in `src/renderer/globe.js`:

```javascript
const CONFIG = {
  CESIUM_ION_TOKEN: 'your_token',
  ROTATION_SPEED: 0.0001,           // Radians/sec
  WEATHER_UPDATE_INTERVAL: 3600000, // 1 hour
  INITIAL_CAMERA: {
    longitude: 0,
    latitude: 20,
    height: 20000000  // 20,000 km altitude
  }
};
```

## Architecture

```
earth-screensaver/
├── src/
│   ├── main/
│   │   ├── main.js      # Electron main process
│   │   └── preload.js   # Secure IPC bridge
│   └── renderer/
│       ├── index.html   # App shell + news modal
│       └── globe.js     # CesiumJS globe logic
├── package.json
└── README.md
```

## Key Implementation Notes

### Day/Night Cycle
CesiumJS calculates sun position from `viewer.clock.currentTime`. We sync this with system time every minute. The globe's `enableLighting` renders the terminator line.

### Rotation Model
The camera rotates around Earth (not Earth spinning). This means:
- Day/night terminator stays geographically accurate
- User sees different parts of Earth over time
- Feels like orbiting the planet

### Weather Layer
Uses OpenWeatherMap tile server for cloud coverage. Updates hourly in background. Layer is semi-transparent (alpha: 0.6) to not obscure geography.

### Country Detection
GeoJSON boundaries loaded from Natural Earth dataset. Click detection via Cesium's `ScreenSpaceEventHandler` + entity picking.

## True Screensaver Mode (Optional)

The app currently runs as a fullscreen application. For true OS-level screensaver integration:

### Windows (.scr)
Requires a native wrapper. The Electron app would be launched by a small .scr executable that handles `/s`, `/c`, `/p` command-line flags.

### macOS (.saver)
Requires bundling as a `ScreenSaverView` plugin. Consider using [electron-screensaver](https://github.com/nicholasrice/electron-screensaver) or writing a native Swift wrapper.

## License

MIT
