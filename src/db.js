'use strict';

let PouchDB;
if (process.env.NODE_ENV === 'test') {
  PouchDB = require('pouchdb');// Import PouchDB for testing environment
} else {
  PouchDB = require('pouchdb').default;
}

async function generateChecksum(serverDbData) {
  const jsonString = JSON.stringify(serverDbData);
  // Encode the file content as UTF-8
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(jsonString);
  // Generate the SHA-256 hash
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', dataBuffer);
  // Convert the hash to a hexadecimal string
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

async function populateDatabase(serverDbData) {
  // Generate and store the checksum of the database source file in the database
  await generateChecksum(serverDbData).then(async checksum => {
    return await this._db.put({ _id: 'versionInfo', checksum: checksum, type: 'info' })
  });

  // Populate the database
  return await this._db.bulkDocs(serverDbData.map(material => ({ _id: material.safekey, type: 'material', data: material })));
}

async function rePopulateDatabase(serverDbData) {
  await this._db.destroy();
  this._initDb();
  return await this.populateDatabase(serverDbData);
}

async function checkAndUpdateDatabase(serverDbData) {
  // Compare the checksum of the server material data to the checksum of the stored data
  // re-populate the database only if the checksum is different
  return await this._db.get('versionInfo').then(async versionInfo => {
    return await generateChecksum(serverDbData).then(async serverDataChecksum => {
      if (versionInfo.checksum !== serverDataChecksum) {
        return await this.rePopulateDatabase(serverDbData)
      }
    });
  }).catch(async err => {
    if (err.name === 'not_found') {
      // If local db exists but versionInfo cannot be found, re-populate the db
      return await this.rePopulateDatabase();
    } else {
      console.error(err);
    }
  });
}

const dbStore = {
  _dbName: 'ncrystal_db',
  _serverDataLocation: 'autogen_db/db.json',
  _db: null,
  _initDb() { this._db = new PouchDB(this._dbName); },
  async init() { //automatically called by Alpine.store
    this._initDb();
    return await this._db.info().then(async (localDbInfo) => {
      // Fetch the material data from the server and process it
      return await fetch(this._serverDataLocation).then(response => response.json())
        .then(async serverDbData => {
          if (localDbInfo.doc_count === 0) {
            // Local database is empty, so populate it
            return await this.populateDatabase(serverDbData);
          } else {
            // Update the database if server data differs from the already stored
            return await this.checkAndUpdateDatabase(serverDbData);
          }
        });
    });
  },
  populateDatabase,
  rePopulateDatabase,
  checkAndUpdateDatabase,
  async getAll() {
    return await this._db.allDocs({ include_docs: true }).then((result) => {
      return result.rows.filter(row => row.doc.type === 'material').map(row => row.doc.data); //exclude the versionInfo document storing the db checksum
    });
  },
  async getBySafeKey(safekey) {
    return await this._db.get(safekey).then(function (doc) {
      return doc.data;
    });
  },
};

module.exports = { dbStore, generateChecksum };
