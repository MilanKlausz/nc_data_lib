'use strict';

let PouchDB;
if (process.env.NODE_ENV === 'test') {
  PouchDB = require('pouchdb');// Import PouchDB for testing environment
} else {
  PouchDB = require('pouchdb').default;
}

async function populateDatabase(serverDbDataInfo) {
  // Populate the database with data from the server
  await fetch(this._serverDataLocation).then(response => response.json())
    .then(async serverDbData => {
      return await this._db.bulkDocs(serverDbData.map(material => ({ _id: material.safekey, type: 'material', data: material })));
    });

  // Store the checksum of the database source file in the database
  return await this._db.put({ _id: 'versionInfo', checksum: serverDbDataInfo.checksum, timestamp: serverDbDataInfo.timestamp, type: 'info' });
}

async function rePopulateDatabase(serverDbDataInfo) {
  await this._db.destroy();
  this._initDb();
  return await this.populateDatabase(serverDbDataInfo);
}

async function checkAndUpdateDatabase(serverDbDataInfo) {
  // Compare the checksum of the server material data to the checksum of the stored data
  // re-populate the database only if the checksum is different
  return await this._db.get('versionInfo').then(async versionInfo => {
    if (versionInfo.checksum !== serverDbDataInfo.checksum || versionInfo.timestamp !== serverDbDataInfo.timestamp) {
      return await this.rePopulateDatabase(serverDbDataInfo);
    }
  }).catch(async err => {
    if (err.name === 'not_found') {
      // If local db exists but versionInfo cannot be found, re-populate the db
      return await this.rePopulateDatabase(serverDbDataInfo);
    } else {
      console.error(err);
    }
  });
}

const dbStore = {
  _dbName: 'ncrystal_db',
  _serverDataLocation: 'autogen_db/db.json',
  _serverChecksumLocation: 'autogen_db/db_checksum.json',
  _db: null,
  _initDb() { this._db = new PouchDB(this._dbName); },
  async init() { //automatically called by Alpine.store
    this._initDb();
    return await this._db.info().then(async (localDbInfo) => {
      // Fetch version information about the data file on the server
      return await fetch(this._serverChecksumLocation).then(response => response.json())
        .then(async serverDbDataInfo => {
          if (localDbInfo.doc_count === 0) { // Local database is empty, so populate it
            return await this.populateDatabase(serverDbDataInfo);
          } else { // Update the database if server data differs from the already stored
            return await this.checkAndUpdateDatabase(serverDbDataInfo);
          }
        });
      // .catch(async error => {
      //   //TODO handle error on frontend
      // });
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

module.exports = { dbStore };
