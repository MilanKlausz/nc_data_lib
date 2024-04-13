'use strict';

const PouchDB = require('pouchdb').default;

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
  // Generate the checksum for the fetched db.json
  return generateChecksum(serverDbData)
    .then(checksum => {
      console.log("new checksum is generated:", checksum);
      // Store the checksum in the database
      return this._db.put({ _id: 'versionInfo', checksum: checksum })
        .then(() => {
          // Populate the database
          console.log("Populate database");
          return this._db.bulkDocs(serverDbData.map((material, index) => ({ _id: index.toString(), ...material })))
            .then(() => this._db.allDocs({ include_docs: true }));
        });
    });
}

async function checkAndUpdateDatabase(serverDbData) {
  // Fetch the versionInfo document
  return this._db.get('versionInfo').then(versionInfo => {
    // Generate the current checksum for the db.json file
    return generateChecksum(serverDbData).then(currentChecksum => {
      // Compare the stored checksum with the current checksum
      console.log("local checksum:", versionInfo.checksum, " serverChecksum:", currentChecksum)
      if (versionInfo.checksum !== currentChecksum) {
        console.log("different checksum, clearing the db and repopulating it");
        // If different, clear the database and repopulate
        return this._db.destroy().then(() => {
          this._db = new PouchDB('ncrystal_db');
          return this.populateDatabase(serverDbData);
        });
      } else {
        console.log("checksum is the same, no need to update")
        // If the same, just fetch all documents
        return this._db.allDocs({ include_docs: true });
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
  _db: null,
  init() {
    this._db = new PouchDB('ncrystal_db');
    this._db.info().then((localDbInfo) => {
      // Fetch the data and process it
      fetch('autogen_db/db.json')
        .then(response => response.json())
        .then(serverDbData => {
          // Now, serverDbData contains the fetched and parsed JSON data
          if (localDbInfo.doc_count === 0) { // If empty, fetch and populate the database
            // Pass the fetched data to populateDatabase
            return this.populateDatabase(serverDbData);
          } else { // Check if the database needs to be updated
            console.log("Database exists, checking if it needs to be updated.");
            // Pass the fetched data to checkAndUpdateDatabase
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
