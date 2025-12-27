const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  exitScreensaver: () => ipcRenderer.send('exit-screensaver'),
  fetchWeather: () => ipcRenderer.invoke('fetch-weather'),
  fetchNews: (countryCode) => ipcRenderer.invoke('fetch-news', countryCode),
  getApiKey: (keyName) => ipcRenderer.invoke('get-api-key', keyName),
  openExternal: (url) => ipcRenderer.send('open-external', url)
});
