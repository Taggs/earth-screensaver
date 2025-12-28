const electron = require('electron');
console.log('Type of electron:', typeof electron);
console.log('Electron value:', electron);
console.log('Electron keys:', Object.keys(electron || {}));
