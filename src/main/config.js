const fs = require('fs');
const path = require('path');

/**
 * Load configuration from config.json or environment variables
 * In packaged app, reads from config.json in the app directory
 * In development, uses .env file via dotenv
 */
function loadConfig() {
  const { app } = require('electron');

  // Try to load from config.json first (for packaged app)
  let config = {};

  if (app && app.isPackaged) {
    // In packaged app, look for config.json next to the executable
    const configPath = path.join(path.dirname(app.getPath('exe')), 'config.json');
    console.log('[Config] Looking for config file at:', configPath);

    try {
      if (fs.existsSync(configPath)) {
        const configContent = fs.readFileSync(configPath, 'utf8');
        config = JSON.parse(configContent);
        console.log('[Config] Loaded config from:', configPath);
      } else {
        console.warn('[Config] config.json not found, using defaults');
      }
    } catch (error) {
      console.error('[Config] Error reading config.json:', error.message);
    }
  } else {
    // In development, use environment variables from .env
    console.log('[Config] Development mode - using .env file');
    config = {
      CESIUM_ION_TOKEN: process.env.CESIUM_ION_TOKEN,
      OPENWEATHER_API_KEY: process.env.OPENWEATHER_API_KEY,
      NEWS_API_KEY: process.env.NEWS_API_KEY,
      WORLDNEWS_API_KEY: process.env.WORLDNEWS_API_KEY
    };
  }

  return config;
}

// Load and cache config
const appConfig = loadConfig();

/**
 * Get a configuration value by key
 * @param {string} key - Configuration key
 * @param {string} defaultValue - Default value if key not found
 * @returns {string} Configuration value
 */
function getConfig(key, defaultValue = '') {
  return appConfig[key] || defaultValue;
}

module.exports = {
  loadConfig,
  getConfig,
  appConfig
};
