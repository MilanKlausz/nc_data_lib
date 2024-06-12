'use strict';

import fs from 'fs';
import { dbStore } from '../src/db.js';
import { serverDbDataInfo2 } from '../test-helpers/material-data.js';
import { searchManager } from '../src/search_manager.js';

async function parseFromFile(filePath) {
  const fileBuffer = fs.readFileSync(filePath);
  // Convert buffer to arrayBuffer
  const arrayBuffer = Uint8Array.from(fileBuffer).buffer;
  return arrayBuffer;
}

async function setupDatabase(databasePath) {
  // Override the global fetch function
  const dbArrayBuffer = await parseFromFile(databasePath);
  global.fetch = (url, options) => {
    if (url.includes(dbStore._serverDataLocation)) {
      return Promise.resolve({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: { 'Content-Type': 'application/gzip' },
        arrayBuffer: () => Promise.resolve(dbArrayBuffer),
      });
    }
    else if (url.includes(dbStore._serverChecksumLocation)) {
      //it shouldn't matter what the content, it just needs to have valid format
      const checksumMockResponse = new Response(JSON.stringify(serverDbDataInfo2), { status: 200, statusText: 'OK' });
      return Promise.resolve(checksumMockResponse);
    }
  };

  // Mimic the database attached to the Alpine object
  global.Alpine = {};
  global.Alpine.store = () => dbStore;
  return await global.Alpine.store().init();
}
async function deleteDatabase() {
  return await global.Alpine.store()._db.destroy();
}

function logToFile(message) {
  const logFilePath = './performQueryError.txt';
  fs.appendFile(logFilePath, `${new Date().toISOString()} - ${message}\n`, err => {
    if (err) throw err;
  });
}

async function performQuery(queryString, databasePath) {
  await setupDatabase(databasePath);
  let result;

  try {
    result = await searchManager.performQuery(queryString);
  } catch (error) {
    logToFile(JSON.stringify(error));
  } finally {
    await deleteDatabase();
  }

  return result;
}

async function runPerformQuery() {
  const inputs = JSON.parse(process.argv[2]);
  try {
    const result = await performQuery(inputs.queryString, inputs.databasePath);
    console.log(JSON.stringify(result));
  } catch (error) {
    console.error(error);
  }
}

runPerformQuery();
