require('dotenv').config();
const { app, BrowserWindow, ipcMain, powerMonitor, screen } = require('electron');
const path = require('path');

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

  // Dev tools in development
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

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
      return process.env.CESIUM_ION_TOKEN || 'YOUR_CESIUM_ION_TOKEN';
    case 'openweather':
      return process.env.OPENWEATHER_API_KEY || 'YOUR_OPENWEATHER_API_KEY';
    case 'news':
      return process.env.NEWS_API_KEY || 'YOUR_NEWS_API_KEY';
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
  
  // WorldNewsAPI - replace with your API key
  const API_KEY = process.env.WORLDNEWS_API_KEY || 'YOUR_WORLDNEWS_API_KEY';
  console.log('[Main Process] API_KEY configured:', API_KEY !== 'YOUR_WORLDNEWS_API_KEY' ? 'Yes' : 'No (using placeholder)');
  
  const apiUrl = `https://api.worldnewsapi.com/search-news?api-key=${API_KEY}&source-country=${countryCode}`;
  console.log('[Main Process] Full API URL:', apiUrl);
  
  try {
    console.log('[Main Process] Making fetch request...');
    const response = await fetch(apiUrl);
    console.log('[Main Process] Response status:', response.status);
    console.log('[Main Process] Response ok:', response.ok);
    
    const data = await response.json();
    console.log('[Main Process] Response data:', data);
    
    // Transform WorldNewsAPI response to match expected format
    if (data && data.news) {
      const transformedData = {
        status: 'ok',
        totalResults: data.available || data.news.length,
        articles: data.news.map(article => ({
          title: article.title,
          description: article.summary || article.text?.substring(0, 200) + '...',
          source: { name: 'World News API' },
          author: article.authors ? article.authors.join(', ') : 'Unknown',
          publishedAt: article.publish_date,
          url: article.url,
          content: article.text
        }))
      };
      console.log('[Main Process] Transformed response:', transformedData);
      return transformedData;
    }
    
    return data;
  } catch (error) {
    console.error('[Main Process] News fetch failed:', error);
    return null;
  }
});
