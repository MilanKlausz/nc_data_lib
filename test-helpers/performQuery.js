'use strict';

const { dbStore } = require('../src/db.js');

// Define a global window object with a crypto property to mock window.crypto for generateChecksum
const { Crypto } = require("@peculiar/webcrypto");
global.window = { crypto: new Crypto() };

function parseJsonFromFile(filePath) {
  const fs = require('fs');
  const fileContent = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(fileContent);
}

async function setupDatabase(databasePath) {
  // Override the global fetch function
  global.fetch = (url, options) => {
    if (url.includes(dbStore._serverDataLocation)) {
      return Promise.resolve({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: () => Promise.resolve(parseJsonFromFile(databasePath)),
      });
    }
    else if (url.includes(dbStore._serverChecksumLocation)) {
      const { serverDbDataInfo2 } = require('./material-data.js');
      const checksumMockResponse = new Response(JSON.stringify(serverDbDataInfo2), { status: 200, statusText: 'OK' });
      return Promise.resolve(checksumMockResponse);
    }
  };
  
  // Mimic the database attached to the Alpine object
  global.Alpine = {};
  global.Alpine.store = () => dbStore;
  return await global.Alpine.store().init();
}
async function deleteDatabase(){
  return await global.Alpine.store()._db.destroy();
}

async function performQuery(queryString, databasePath) {
  await setupDatabase(databasePath);

  const { searchManager } = require('../src/search_manager.js');
  const result = await searchManager.performQuery(queryString);

  await deleteDatabase();

  return result;
}

module.exports = { performQuery };
