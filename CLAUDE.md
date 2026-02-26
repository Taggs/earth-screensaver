# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm start          # Run in development mode (uses --no-sandbox flag)
npm run build      # Build installer for current platform
npm run build:win  # Build Windows NSIS installer
npm run build:mac  # Build macOS installer
```

No test or lint scripts are configured.

## Architecture

This is an **Electron + CesiumJS** desktop screensaver that renders an interactive 3D globe with real-time news and weather.

### Process Structure

**Main process** (`src/main/main.js`) — Creates a fullscreen frameless window and handles IPC:
- `get-api-key(keyName)` — Returns env vars: `CESIUM_ION_TOKEN`, `OPENWEATHER_API_KEY`, `WORLDNEWS_API_KEY`
- `fetch-news(countryCode)` — Proxies WorldNewsAPI requests to avoid CORS
- `fetch-weather()` — Proxies OpenWeatherMap requests (currently unused in renderer)

**Preload bridge** (`src/main/preload.js`) — Exposes `window.electronAPI` to the renderer with context isolation (nodeIntegration is disabled).

**Renderer** (`src/renderer/`) — Runs entirely in the browser context:
- `globe.js` (1,277 lines) — All globe logic, interaction, and API calls
- `cities.js` — Static database of 300+ cities with lat/lon/population/country, plus `COUNTRY_NAMES` ISO code mappings
- `index.html` — UI shell with Cesium container, news modal (draggable), and controls panel

### Data Flow

1. On startup, renderer calls `window.electronAPI.getApiKey()` for each token
2. Cesium Ion token is used to load Bing Maps satellite imagery (asset #3)
3. Country boundaries are loaded from Natural Earth GeoJSON via HTTP
4. On country click: renderer → `fetchNews(isoCode)` → main process → WorldNewsAPI → renderer renders articles

### Key Globe Concepts

- **Rotation**: The camera orbits the Earth (not Earth spinning) to maintain geographic accuracy
- **Day/night**: CesiumJS `enableLighting` + sun position from `suncalc` synced to system time
- **City labels**: Visibility is distance-based — capitals show up to 15,000 km, major cities (pop >5M) up to 6,000 km, others up to 2,000 km
- **Weather layer**: OpenWeatherMap cloud tile overlay (alpha 0.6), updated hourly

### Required Environment Variables

```
CESIUM_ION_TOKEN       # Required — from cesium.com/ion/tokens
OPENWEATHER_API_KEY    # Optional — for weather cloud overlay
WORLDNEWS_API_KEY      # Required for news — from worldnewsapi.com
```

These must be available in the environment when running `npm start`, or set in a `.env` file (loaded via dotenv in main process).

### CONFIG Object

All tunable constants live at the top of `src/renderer/globe.js` in a `CONFIG` object, including rotation speed, camera initial position, label distance thresholds, and update intervals.
