const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  exitScreensaver: () => ipcRenderer.send('exit-screensaver'),
  fetchWeather: () => ipcRenderer.invoke('fetch-weather'),
  fetchNews: (countryCode) => ipcRenderer.invoke('fetch-news', countryCode),
  fetchCountryStats: (iso3Code, iso2Code) => ipcRenderer.invoke('fetch-country-stats', iso3Code, iso2Code),
  getApiKey: (keyName) => ipcRenderer.invoke('get-api-key', keyName),
  openExternal: (url) => ipcRenderer.send('open-external', url)
});
