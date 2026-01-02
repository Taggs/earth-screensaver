require('dotenv').config();
const { app, BrowserWindow, ipcMain, powerMonitor, screen, shell } = require('electron');
const path = require('path');
const feedLoader = require('./feed-loader');
const feedParser = require('./feed-parser');
const config = require('./config');
// const statsFetcher = require('./stats-fetcher');

let mainWindow = null;
let configWindow = null;
let idleTimeout = null;
const IDLE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

// ============================================================================
// WINDOWS SCREENSAVER ARGUMENT PARSING
// ============================================================================
// Windows screensaver command-line arguments:
// /s - Run screensaver (fullscreen)
// /c - Show configuration dialog
// /p <hwnd> - Preview mode (in Windows screensaver settings)
// No args - Also run as screensaver

const args = process.argv.slice(1);
const isConfig = args.some(arg => arg.toLowerCase() === '/c');
const isPreview = args.some(arg => arg.toLowerCase().startsWith('/p'));
const isScreensaver = args.some(arg => arg.toLowerCase() === '/s') || (!isConfig && !isPreview);
const isDev = args.includes('--dev');

console.log('[Screensaver] Launch mode:', { isConfig, isPreview, isScreensaver, isDev });

// ============================================================================
// WINDOW CREATION FUNCTIONS
// ============================================================================

function createWindow() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;

  mainWindow = new BrowserWindow({
    fullscreen: true,
    frame: false,
    autoHideMenuBar: true,
    backgroundColor: '#000000',
    alwaysOnTop: true,
    skipTaskbar: true,
    width,
    height,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

  // Exit on window blur (when user clicks away)
  mainWindow.on('blur', () => {
    if (!isDev && isScreensaver) {
      setTimeout(() => {
        if (mainWindow && !mainWindow.isFocused()) {
          mainWindow.close();
        }
      }, 100);
    }
  });

  // Only open dev tools in development mode
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  // Log any console messages from renderer
  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log(`[Renderer] ${message} (${sourceId}:${line})`);
  });

  // Handle renderer crashes or hangs
  mainWindow.webContents.on('render-process-gone', (event, details) => {
    console.error('[Main] Renderer process crashed:', details);
  });

  mainWindow.webContents.on('unresponsive', () => {
    console.error('[Main] Renderer process is unresponsive');
  });

  // Global keyboard shortcuts to force quit (for debugging)
  mainWindow.webContents.on('before-input-event', (event, input) => {
    // Alt+F4 or Ctrl+Q to force quit
    if ((input.key === 'F4' && input.alt) || (input.key === 'q' && input.control)) {
      console.log('[Main] Force quit requested');
      app.quit();
    }
    // ESC to close window
    if (input.key === 'Escape') {
      console.log('[Main] ESC pressed, closing window');
      mainWindow.close();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createConfigWindow() {
  configWindow = new BrowserWindow({
    width: 500,
    height: 400,
    title: 'Earth Screensaver Settings',
    frame: true,
    autoHideMenuBar: true,
    resizable: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // Create a simple config page (we'll create this file next)
  configWindow.loadFile(path.join(__dirname, '../renderer/config.html')).catch(() => {
    // Fallback: show a simple message if config.html doesn't exist
    configWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Earth Screensaver Settings</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              padding: 40px;
              background: #1a1a1a;
              color: #fff;
            }
            h1 { font-size: 24px; margin-bottom: 20px; }
            p { line-height: 1.6; margin-bottom: 15px; }
            .info { background: #2a2a2a; padding: 20px; border-radius: 8px; }
            button {
              background: #007acc;
              color: white;
              border: none;
              padding: 10px 20px;
              border-radius: 4px;
              cursor: pointer;
              font-size: 14px;
              margin-top: 20px;
            }
            button:hover { background: #005a9e; }
          </style>
        </head>
        <body>
          <h1>🌍 Earth Screensaver</h1>
          <div class="info">
            <p><strong>Features:</strong></p>
            <ul>
              <li>Real-time globe with day/night cycle</li>
              <li>Live weather data overlay</li>
              <li>Interactive country news on click</li>
              <li>Realistic lighting and atmosphere</li>
            </ul>
            <p><strong>Controls:</strong></p>
            <ul>
              <li>Click and drag to rotate the globe</li>
              <li>Click a country twice to view news</li>
              <li>Press ESC or click X to exit</li>
            </ul>
            <p><strong>Configuration:</strong></p>
            <p>API keys are managed in the .env file in the installation directory.</p>
          </div>
          <button onclick="window.close()">OK</button>
        </body>
      </html>
    `));
  });

  configWindow.on('closed', () => {
    configWindow = null;
  });
}

function createPreviewWindow() {
  // Preview mode is complex and not fully supported
  // Just show a message and exit
  console.log('[Screensaver] Preview mode not implemented - exiting');
  app.quit();
}

// Screensaver-like idle detection
function startIdleMonitor() {
  setInterval(() => {
    const idleTime = powerMonitor.getSystemIdleTime() * 1000;
    if (idleTime >= IDLE_THRESHOLD_MS && !mainWindow) {
      createWindow();
    }
  }, 10000);
}

// Handle mouse/keyboard to exit screensaver mode
function setupExitHandlers() {
  ipcMain.on('exit-screensaver', () => {
    if (mainWindow) {
      mainWindow.close();
      mainWindow = null;
    }
  });
}

// ============================================================================
// APP INITIALIZATION - HANDLE SCREENSAVER MODES
// ============================================================================

app.whenReady().then(() => {
  setupExitHandlers();

  if (isConfig) {
    // Windows screensaver configuration mode (/c)
    console.log('[Screensaver] Opening configuration window');
    createConfigWindow();
  } else if (isPreview) {
    // Windows screensaver preview mode (/p)
    console.log('[Screensaver] Preview mode requested');
    createPreviewWindow();
  } else {
    // Normal screensaver mode (/s or no args)
    console.log('[Screensaver] Starting fullscreen screensaver');
    createWindow();
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0 && !isPreview) {
      if (isConfig) {
        createConfigWindow();
      } else {
        createWindow();
      }
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Handle API key requests from renderer
ipcMain.handle('get-api-key', async (event, keyName) => {
  switch (keyName) {
    case 'cesium':
      return config.getConfig('CESIUM_ION_TOKEN', process.env.CESIUM_ION_TOKEN || '');
    case 'openweather':
      return config.getConfig('OPENWEATHER_API_KEY', process.env.OPENWEATHER_API_KEY || '');
    case 'news':
      return config.getConfig('NEWS_API_KEY', process.env.NEWS_API_KEY || '');
    case 'worldnews':
      return config.getConfig('WORLDNEWS_API_KEY', process.env.WORLDNEWS_API_KEY || '');
    default:
      throw new Error(`Unknown API key: ${keyName}`);
  }
});

// Handle weather API requests from renderer
ipcMain.handle('fetch-weather', async () => {
  // Weather.com requires API key - using OpenWeatherMap as fallback
  // Replace with your actual API key
  const API_KEY = process.env.OPENWEATHER_API_KEY || 'YOUR_API_KEY';
  
  try {
    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=0&lon=0&appid=${API_KEY}`
    );
    return await response.json();
  } catch (error) {
    console.error('Weather fetch failed:', error);
    return null;
  }
});

// Handle news API requests
ipcMain.handle('fetch-news', async (event, countryCode) => {
  console.log('[Main Process] fetch-news called with countryCode:', countryCode);

  try {
    // Get feed configuration for this country
    const feedConfig = feedLoader.getFeedForCountry(countryCode);
    console.log('[Main Process] Using feed:', feedConfig.name);

    // Get API key if needed
    const API_KEY = process.env.WORLDNEWS_API_KEY || 'YOUR_WORLDNEWS_API_KEY';

    // Prepare feed URL with placeholders replaced
    const feedUrl = feedLoader.prepareFeedUrl(feedConfig.feedUrl, countryCode, API_KEY);
    console.log('[Main Process] Fetching from:', feedUrl);

    // Fetch the feed
    const response = await fetch(feedUrl);
    console.log('[Main Process] Response status:', response.status, response.ok);

    if (!response.ok) {
      throw new Error(`Feed fetch failed with status ${response.status}`);
    }

    const contentType = response.headers.get('content-type') || '';
    console.log('[Main Process] Content-Type:', contentType);

    // Get response content (could be XML or JSON)
    let content;
    if (contentType.includes('xml') || contentType.includes('rss') || contentType.includes('atom')) {
      content = await response.text();
    } else {
      content = await response.json();
    }

    // Parse the feed using the appropriate parser
    const articles = await feedParser.parseFeed(content, contentType, feedConfig.type);
    console.log('[Main Process] Parsed', articles.length, 'articles');

    // Return in expected format
    return {
      status: 'ok',
      totalResults: articles.length,
      articles: articles
    };

  } catch (error) {
    console.error('[Main Process] News fetch failed:', error);

    // Try fallback to default feed
    try {
      console.log('[Main Process] Attempting fallback to default feed...');
      const defaultConfig = feedLoader.loadFeedConfig().default;
      const API_KEY = process.env.WORLDNEWS_API_KEY || 'YOUR_WORLDNEWS_API_KEY';
      const feedUrl = feedLoader.prepareFeedUrl(defaultConfig.feedUrl, countryCode, API_KEY);

      const response = await fetch(feedUrl);
      if (!response.ok) throw new Error('Default feed also failed');

      const contentType = response.headers.get('content-type') || '';
      const content = contentType.includes('xml') ? await response.text() : await response.json();
      const articles = await feedParser.parseFeed(content, contentType, defaultConfig.type);

      return {
        status: 'ok',
        totalResults: articles.length,
        articles: articles
      };

    } catch (fallbackError) {
      console.error('[Main Process] Fallback also failed:', fallbackError);
      return {
        status: 'error',
        message: 'Failed to fetch news from both configured and default feeds',
        articles: []
      };
    }
  }
});

// Handle country stats requests
ipcMain.handle('fetch-country-stats', async (event, iso3Code, iso2Code) => {
  console.log('[Main Process] fetch-country-stats called with ISO-3:', iso3Code, 'ISO-2:', iso2Code);

  // Lazy load stats-fetcher to avoid initialization issues
  const statsFetcher = require('./stats-fetcher');

  try {
    const stats = await statsFetcher.fetchCountryStats(iso3Code, iso2Code);
    return stats;
  } catch (error) {
    console.error('[Main Process] Stats fetch failed:', error);

    // Fallback to bundled data only
    try {
      const fs = require('fs');
      const bundledPath = path.join(__dirname, '../data/country-stats.json');
      const bundledContent = fs.readFileSync(bundledPath, 'utf8');
      const bundled = JSON.parse(bundledContent);

      if (bundled[iso2Code]) {
        return {
          name: iso3Code.toUpperCase(),
          flag: `https://flagcdn.com/w320/${iso2Code}.png`,
          currency: null,
          population: null,
          ...bundled[iso2Code]
        };
      }
    } catch (fallbackError) {
      console.error('[Main Process] Fallback also failed:', fallbackError);
    }

    throw new Error(`No stats available for: ${iso3Code}`);
  }
});

// Open external URL in default browser
ipcMain.on('open-external', (event, url) => {
  console.log('[Main Process] Opening external URL:', url);
  if (url && typeof url === 'string') {
    shell.openExternal(url);
  }
});
