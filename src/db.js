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
  // Generate and store the checksum along with the data in the database
  return generateChecksum(serverDbData)
    .then(checksum => {
      // Store the checksum in the database labelled as 'versionInfo'
      return this._db.put({ _id: 'versionInfo', checksum: checksum })
        .then(() => { // Populate the database
          return this._db.bulkDocs(serverDbData.map((material, index) => ({ _id: index.toString(), ...material })))
            .then(() => this._db.allDocs({ include_docs: true }));
        });
    });
}

async function checkAndUpdateDatabase(serverDbData) {
  // Compare the checksum of the server material data to the checksum of the stored data
  // re-populate the database only if the checksum is different
  return this._db.get('versionInfo').then(versionInfo => {
    return generateChecksum(serverDbData).then(serverDataChecksum => {
      if (versionInfo.checksum !== serverDataChecksum) {
        return this._db.destroy().then(() => {
          this._initDb();
          return this.populateDatabase(serverDbData);
        });
      }
    });
  }).catch(err => {
    if (err.name === 'not_found') {
      // If versionInfo document does not exist, populate the database
      return this.populateDatabase();
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
    return this._db.info().then((localDbInfo) => {
      // Fetch the material data from the server and process it
      return fetch(this._serverDataLocation)
        .then(response => response.json())
        .then(serverDbData => {
          if (localDbInfo.doc_count === 0) {
            // Local database is empty, so populate it
            return this.populateDatabase(serverDbData);
          } else {
            // Update the database if server data differs from the already stored
            return this.checkAndUpdateDatabase(serverDbData);
          }
        });
    });
  },
  populateDatabase,
  checkAndUpdateDatabase,
  async getAll() {
    return await this._db.allDocs({ include_docs: true }).then((result) => {
      return result.rows.map(row => row.doc).filter(el => 'safekey' in el); //exclude the versionInfo document storing the db checksum
    });
  },
  async getBySafeKey(safeKey) {
    return await this._db.allDocs({ include_docs: true }).then((result) => { //TODO refactor to proper db query?
      return result.rows.map(row => row.doc).filter(el => 'safekey' in el && el.safekey === safeKey)[0];
    });
  },
};

module.exports = { dbStore, generateChecksum };
