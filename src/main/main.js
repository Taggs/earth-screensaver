require('dotenv').config();
const { app, BrowserWindow, ipcMain, powerMonitor } = require('electron');
const path = require('path');

let mainWindow = null;
let idleTimeout = null;
const IDLE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

function createWindow() {
  mainWindow = new BrowserWindow({
    fullscreen: true,
    frame: false,
    autoHideMenuBar: true,
    backgroundColor: '#000000',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

  // Exit on any input (screensaver behavior)
  mainWindow.on('blur', () => {
    // Optional: exit when window loses focus
  });

  // Dev tools in development
  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }
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

app.whenReady().then(() => {
  createWindow();
  setupExitHandlers();
  
  // Uncomment for true idle-triggered screensaver behavior:
  // startIdleMonitor();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
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
  // NewsAPI.org - replace with your API key
  const API_KEY = process.env.NEWS_API_KEY || 'YOUR_NEWS_API_KEY';
  
  try {
    const response = await fetch(
      `https://newsapi.org/v2/top-headlines?country=${countryCode}&apiKey=${API_KEY}`
    );
    return await response.json();
  } catch (error) {
    console.error('News fetch failed:', error);
    return null;
  }
});
