'use strict';

const { dbStore } = require('../src/db.js');

// Define a global window object with a crypto property to mock window.crypto for generateChecksum
const { Crypto } = require("@peculiar/webcrypto");
global.window = { crypto: new Crypto() };

function parseMsgpackFromFile(filePath) {
  const fs = require('fs');
  const fileBuffer = fs.readFileSync(filePath);
  // Convert buffer to arrayBuffer
  const arrayBuffer = Uint8Array.from(fileBuffer).buffer;
  return arrayBuffer;
}

async function setupDatabase(databasePath) {
  // Override the global fetch function
  global.fetch = (url, options) => {
    if (url.includes(dbStore._serverDataLocation)) {
      return Promise.resolve({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: { 'Content-Type': 'application/x-msgpack' },
        arrayBuffer: () => Promise.resolve(parseMsgpackFromFile(databasePath)),
      });
    }
    else if (url.includes(dbStore._serverChecksumLocation)) {
      //it shouldn't matter what the content, it just needs to have valid format
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
