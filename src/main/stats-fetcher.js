const fs = require('fs');
const path = require('path');

/**
 * Fetch country statistics from REST Countries API and World Bank API with bundled data fallback
 * @param {string} iso3Code - ISO-3 country code (e.g., 'USA', 'GBR')
 * @param {string} iso2Code - ISO-2 country code for bundled data lookup (e.g., 'us', 'gb')
 * @returns {Promise<Object>} Country statistics object
 */
async function fetchCountryStats(iso3Code, iso2Code) {
  console.log('[Stats Fetcher] Fetching stats for ISO-3:', iso3Code, 'ISO-2:', iso2Code);

  try {
    // 1. Fetch from REST Countries API using ISO-3 code (supports both ISO-2 and ISO-3)
    const apiUrl = `https://restcountries.com/v3.1/alpha/${iso3Code}`;
    console.log('[Stats Fetcher] API URL:', apiUrl);

    const response = await fetch(apiUrl);

    if (!response.ok) {
      throw new Error(`REST Countries API returned ${response.status}`);
    }

    const data = await response.json();

    if (!Array.isArray(data) || data.length === 0) {
      throw new Error('Invalid API response format');
    }

    const countryData = data[0];

    // 2. Load bundled data as fallback
    const bundledPath = getBundledDataPath();
    let bundled = {};
    try {
      const bundledContent = fs.readFileSync(bundledPath, 'utf8');
      bundled = JSON.parse(bundledContent);
    } catch (error) {
      console.warn('[Stats Fetcher] Failed to load bundled data:', error.message);
    }

    // 3. Extract currency data
    const currencies = countryData.currencies || {};
    const currencyCode = Object.keys(currencies)[0] || null;
    const currency = currencyCode ? {
      code: currencyCode,
      name: currencies[currencyCode].name || '',
      symbol: currencies[currencyCode].symbol || ''
    } : null;

    // 4. Try to fetch GDP, birth rate, death rate from World Bank API (hybrid approach)
    let gdp = bundled[iso2Code]?.gdp || null;
    let birthRate = bundled[iso2Code]?.birthRate || null;
    let deathRate = bundled[iso2Code]?.deathRate || null;

    try {
      const worldBankData = await fetchWorldBankData(iso2Code);
      if (worldBankData.gdp !== null) gdp = worldBankData.gdp;
      if (worldBankData.birthRate !== null) birthRate = worldBankData.birthRate;
      if (worldBankData.deathRate !== null) deathRate = worldBankData.deathRate;
      console.log('[Stats Fetcher] World Bank data fetched successfully');
    } catch (error) {
      console.warn('[Stats Fetcher] World Bank API failed, using bundled data:', error.message);
    }

    // 5. Merge all data
    const stats = {
      name: countryData.name.common,
      flag: countryData.flags.png,
      currency: currency,
      population: countryData.population,
      gdp: gdp,
      birthRate: birthRate,
      deathRate: deathRate,
      lastUpdated: bundled[iso2Code]?.lastUpdated || new Date().toISOString().split('T')[0]
    };

    console.log('[Stats Fetcher] Successfully fetched and merged stats for:', iso3Code);
    return stats;

  } catch (error) {
    console.error('[Stats Fetcher] Error fetching from API:', error.message);
    throw error;
  }
}

/**
 * Fetch GDP per capita, birth rate, and death rate from World Bank API
 * @param {string} iso2Code - ISO-2 country code (e.g., 'us', 'gy')
 * @returns {Promise<Object>} Object with gdp, birthRate, deathRate (or null if not available)
 */
async function fetchWorldBankData(iso2Code) {
  const upperCode = iso2Code.toUpperCase();

  // World Bank API indicator codes
  const indicators = {
    gdp: 'NY.GDP.PCAP.CD',        // GDP per capita (current US$)
    birthRate: 'SP.DYN.CBRT.IN',  // Birth rate, crude (per 1,000 people)
    deathRate: 'SP.DYN.CDRT.IN'   // Death rate, crude (per 1,000 people)
  };

  const result = {
    gdp: null,
    birthRate: null,
    deathRate: null
  };

  // Fetch most recent data (try 2023, 2022, 2021)
  const years = '2023:2021';

  try {
    // World Bank API doesn't support multiple indicators in one call
    // We need to fetch each indicator separately
    const fetchPromises = [
      fetchWorldBankIndicator(upperCode, indicators.gdp, years),
      fetchWorldBankIndicator(upperCode, indicators.birthRate, years),
      fetchWorldBankIndicator(upperCode, indicators.deathRate, years)
    ];

    // Fetch all indicators in parallel with timeout
    const results = await Promise.race([
      Promise.all(fetchPromises),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 8000))
    ]);

    // Extract values from results
    if (results[0] !== null) result.gdp = Math.round(results[0] * 100) / 100;
    if (results[1] !== null) result.birthRate = Math.round(results[1] * 10) / 10;
    if (results[2] !== null) result.deathRate = Math.round(results[2] * 10) / 10;

    console.log('[World Bank API] Fetched data:', result);
    return result;

  } catch (error) {
    console.warn('[World Bank API] Failed to fetch data:', error.message);
    throw error;
  }
}

/**
 * Fetch a single indicator from World Bank API
 * @param {string} countryCode - ISO-2 country code (uppercase)
 * @param {string} indicator - Indicator code
 * @param {string} years - Year range (e.g., '2023:2021')
 * @returns {Promise<number|null>} Indicator value or null
 */
async function fetchWorldBankIndicator(countryCode, indicator, years) {
  const url = `https://api.worldbank.org/v2/country/${countryCode}/indicator/${indicator}?format=json&date=${years}&per_page=10`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    // Check for error response
    if (Array.isArray(data) && data[0] && data[0].message) {
      console.warn('[World Bank API] Error response for', indicator, ':', data[0].message[0]?.value);
      return null;
    }

    // Response format: [metadata, data_array]
    if (!Array.isArray(data) || data.length < 2 || !Array.isArray(data[1])) {
      return null;
    }

    // Get the most recent non-null value
    for (const item of data[1]) {
      if (item.value !== null && item.value !== undefined) {
        return item.value;
      }
    }

    return null;

  } catch (error) {
    console.warn('[World Bank API] Failed to fetch indicator', indicator, ':', error.message);
    return null;
  }
}

/**
 * Get the path to bundled country-stats.json
 * @returns {string} Absolute path to bundled data file
 */
function getBundledDataPath() {
  try {
    const { app } = require('electron');

    if (app && app.isPackaged) {
      // In packaged app, extraResources are in resources/data/
      return path.join(process.resourcesPath, 'data', 'country-stats.json');
    }
  } catch (error) {
    // Not in Electron context, fall through to development path
  }

  // In development or Node.js context, use src/data/
  return path.join(__dirname, '..', 'data', 'country-stats.json');
}

module.exports = {
  fetchCountryStats
};
