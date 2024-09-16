'use strict';

import fs from 'fs';
import { dbStore } from '../src/db.js';
import { getSearchManager } from '../src/search_manager.js';
const defaultServerBaseUrl = 'https://milanklausz.github.io/nc_data_lib/'; //TODO store somewhere else?

function parseJsonFromFile(filePath) {
  const fileContent = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(fileContent);
}

function createMockResponseFromFile(filePath) {
  return Promise.resolve({
    ok: true, status: 200, statusText: 'OK',
    json: () => Promise.resolve(parseJsonFromFile(filePath)),
  });
}

async function setupDatabase(localDb = null) {
  if (localDb === null) { //fetch db files from online server
    dbStore._dbName = 'ncrystal_db_online';
    const baseUrl = process.env.DEFAULT_SERVER_BASE_URL || defaultServerBaseUrl;
    //add base url to locations from where data will be attempted to be fetched
    dbStore._serverDataLocation = `${baseUrl}${dbStore._serverDataLocation}`;
    dbStore._serverChecksumLocation = `${baseUrl}${dbStore._serverChecksumLocation}`;
  }
  else { //use local db files
    dbStore._dbName = 'ncrystal_db_local';
    global.fetch = (url, _) => { // Override the global fetch function before dbStore.init()
      if (url === dbStore._serverDataLocation) {
        return createMockResponseFromFile(localDb.dbPath);
      }
      else if (url === dbStore._serverChecksumLocation) {
        return createMockResponseFromFile(localDb.dbChecksumPath);
      }
    };
  }

  await dbStore.init();
  return getSearchManager(dbStore);
}
// async function deleteDatabase(searchManager) {
//   return await searchManager.db._db.destroy();
// }

function logToFile(message) {
  const logFilePath = './performQueryError.txt';
  fs.appendFile(logFilePath, `${new Date().toISOString()} - ${message}\n`, err => {
    if (err) throw err;
  });
}

async function performQuery(queryString, localDb = null) {
  const searchManager = await setupDatabase(localDb);
  try {
    return await searchManager.performQuery(queryString);
  } catch (error) {
    logToFile(error);
  }
}

async function runPerformQuery() {
  try {
    const inputs = JSON.parse(process.argv[2]);
    const localDb = (inputs?.dbPath && inputs?.dbChecksumPath)
      ? { dbPath: inputs.dbPath, dbChecksumPath: inputs.dbChecksumPath }
      : null;
    const result = await performQuery(inputs.queryString, localDb);

    console.log(JSON.stringify(result)); //output the result
  } catch (error) {
    console.error(error);
  }
}

runPerformQuery();
