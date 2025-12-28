const path = require('path');
const fs = require('fs');

let cachedConfig = null;
let lastLoadTime = 0;
const CACHE_DURATION = 60000; // Cache for 1 minute

/**
 * Get the path to the bundled news-feeds.json config
 * @returns {string} Absolute path to bundled config
 */
function getBundledConfigPath() {
  const { app } = require('electron');
  if (app.isPackaged) {
    // In packaged app, extraResources are in resources/data/
    return path.join(process.resourcesPath, 'data', 'news-feeds.json');
  } else {
    // In development, use src/data/
    return path.join(__dirname, '..', 'data', 'news-feeds.json');
  }
}

/**
 * Get the path to the external override news-feeds.json
 * @returns {string} Absolute path to external config (same dir as .exe/.scr)
 */
function getExternalConfigPath() {
  const { app } = require('electron');
  if (app.isPackaged) {
    // In packaged app, look in same directory as the .exe/.scr
    const exePath = app.getPath('exe');
    const exeDir = path.dirname(exePath);
    return path.join(exeDir, 'news-feeds.json');
  } else {
    // In development, look in project root
    return path.join(app.getAppPath(), 'news-feeds.json');
  }
}

/**
 * Load and parse a JSON config file
 * @param {string} filePath - Path to JSON file
 * @returns {Object|null} Parsed config or null if error
 */
function loadConfigFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      return null;
    }

    const content = fs.readFileSync(filePath, 'utf8');
    const config = JSON.parse(content);

    // Validate basic structure
    if (!config.default || typeof config.default !== 'object') {
      console.error(`[Feed Loader] Invalid config at ${filePath}: missing 'default' object`);
      return null;
    }

    console.log(`[Feed Loader] Successfully loaded config from: ${filePath}`);
    return config;

  } catch (error) {
    console.error(`[Feed Loader] Failed to load config from ${filePath}:`, error.message);
    return null;
  }
}

/**
 * Merge external config overrides into bundled config
 * @param {Object} bundled - The bundled default config
 * @param {Object} external - The external override config
 * @returns {Object} Merged config
 */
function mergeConfigs(bundled, external) {
  const merged = {
    default: external.default || bundled.default,
    countries: { ...bundled.countries }
  };

  // Merge country overrides
  if (external.countries && typeof external.countries === 'object') {
    Object.keys(external.countries).forEach(countryCode => {
      merged.countries[countryCode.toLowerCase()] = external.countries[countryCode];
      console.log(`[Feed Loader] External override applied for country: ${countryCode}`);
    });
  }

  return merged;
}

/**
 * Load the complete feed configuration (bundled + external override)
 * @returns {Object} Complete feed configuration
 */
function loadFeedConfig() {
  const now = Date.now();

  // Return cached config if still valid
  if (cachedConfig && (now - lastLoadTime) < CACHE_DURATION) {
    console.log('[Feed Loader] Using cached config');
    return cachedConfig;
  }

  console.log('[Feed Loader] Loading feed configuration...');

  // Load bundled config (required)
  const bundledPath = getBundledConfigPath();
  const bundledConfig = loadConfigFile(bundledPath);

  if (!bundledConfig) {
    throw new Error('Failed to load bundled news-feeds.json - this file is required');
  }

  // Try to load external override (optional)
  const externalPath = getExternalConfigPath();
  const externalConfig = loadConfigFile(externalPath);

  let finalConfig;
  if (externalConfig) {
    console.log('[Feed Loader] Merging external config overrides');
    finalConfig = mergeConfigs(bundledConfig, externalConfig);
  } else {
    console.log('[Feed Loader] No external config found, using bundled config');
    finalConfig = bundledConfig;
  }

  // Cache the result
  cachedConfig = finalConfig;
  lastLoadTime = now;

  console.log(`[Feed Loader] Config loaded with ${Object.keys(finalConfig.countries).length} country feeds`);
  return finalConfig;
}

/**
 * Get feed configuration for a specific country
 * @param {string} countryCode - ISO-2 country code (e.g., 'us', 'gb')
 * @returns {Object} Feed configuration object
 */
function getFeedForCountry(countryCode) {
  const config = loadFeedConfig();
  const code = countryCode.toLowerCase();

  if (config.countries[code]) {
    console.log(`[Feed Loader] Using custom feed for ${code}: ${config.countries[code].name}`);
    return config.countries[code];
  }

  console.log(`[Feed Loader] No custom feed for ${code}, using default`);
  return config.default;
}

/**
 * Replace placeholders in feed URL with actual values
 * @param {string} feedUrl - Feed URL with placeholders
 * @param {string} countryCode - Country code to substitute
 * @param {string} apiKey - API key to substitute (optional)
 * @returns {string} URL with placeholders replaced
 */
function prepareFeedUrl(feedUrl, countryCode, apiKey = '') {
  return feedUrl
    .replace(/{COUNTRY_CODE}/g, countryCode)
    .replace(/{API_KEY}/g, apiKey);
}

/**
 * Clear the cached config (useful for testing or forcing reload)
 */
function clearCache() {
  cachedConfig = null;
  lastLoadTime = 0;
  console.log('[Feed Loader] Cache cleared');
}

module.exports = {
  loadFeedConfig,
  getFeedForCountry,
  prepareFeedUrl,
  clearCache,
  getBundledConfigPath,
  getExternalConfigPath
};
