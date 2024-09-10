'use strict';

import fs from 'fs';
import { dbStore } from '../src/db.js';
import { serverDbDataInfo2 } from '../test-helpers/material-data.js';
import { getSearchManager } from '../src/search_manager.js';

function parseJsonFromFile(filePath) {
  const fileContent = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(fileContent);
}

async function setupDatabase(databasePath) {
  // Override the global fetch function before dbStore.init()
  global.fetch = (url, _) => {
    if (url.includes(dbStore._serverDataLocation)) {
      return Promise.resolve({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: () => Promise.resolve(parseJsonFromFile(databasePath)),
      });
    }
    else if (url.includes(dbStore._serverChecksumLocation)) {
      //it shouldn't matter what the content, it just needs to have valid format
      const checksumMockResponse = new Response(JSON.stringify(serverDbDataInfo2), { status: 200, statusText: 'OK' });
      return Promise.resolve(checksumMockResponse);
    }
  };

  await dbStore.init();
  return getSearchManager(dbStore);
}
async function deleteDatabase(searchManager) {
  return await searchManager.db._db.destroy();
}

function logToFile(message) {
  const logFilePath = './performQueryError.txt';
  fs.appendFile(logFilePath, `${new Date().toISOString()} - ${message}\n`, err => {
    if (err) throw err;
  });
}

async function performQuery(queryString, databasePath) {
  const searchManager = await setupDatabase(databasePath);
  let result;

  try {
    result = await searchManager.performQuery(queryString);
  } catch (error) {
    logToFile(error);
  } finally {
    await deleteDatabase(searchManager);
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
