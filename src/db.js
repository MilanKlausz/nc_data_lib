'use strict';

import PouchDB from 'pouchdb';

async function generateChecksum(fileUrl) {
  // Fetch the file
  const response = await fetch(fileUrl);
  const fileContent = await response.text();

  // Encode the file content as UTF-8
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(fileContent);

  // Generate the SHA-256 hash
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', dataBuffer);

  // Convert the hash to a hexadecimal string
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  return hashHex;
}

function populateDatabase() {
  // Fetch the db.json file and its checksum
  return fetch('autogen_db/db.json')
    .then(response => response.json())
    .then(data => {
      // Generate the checksum for the fetched db.json
      return generateChecksum('autogen_db/db.json')
        .then(checksum => {
          console.log("new checksum is generated:", checksum);
          // Store the checksum in the database
          return this._db.put({ _id: 'versionInfo', checksum: checksum })
            .then(() => {
              // Populate the database
              console.log("Populate database");
              return this._db.bulkDocs(data.map((material, index) => ({ _id: index.toString(), ...material })))
                .then(() => this._db.allDocs({ include_docs: true }));
            });
        });
    });
}

function checkAndUpdateDatabase() {
  // Fetch the versionInfo document
  return this._db.get('versionInfo').then(versionInfo => {
    // Generate the current checksum for the db.json file
    return generateChecksum('autogen_db/db.json').then(currentChecksum => {
      // Compare the stored checksum with the current checksum
      if (versionInfo.checksum !== currentChecksum) {
        console.log("different checksum, clearing the db and repopulating it");
        // If different, clear the database and repopulate
        return this._db.destroy().then(() => {
          this._db = new PouchDB('ncrystal_db');
          return this.populateDatabase();
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
    this._db.info().then((result) => {
      if (result.doc_count === 0) { // If empty, fetch and populate the database
        return this.populateDatabase();
      } else { // Check if the database needs to be updated
        console.log("Database exist, checking if it needs to be updated.");
        return this.checkAndUpdateDatabase();
      }
    }).catch(function (err) {
      console.error(err);
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

export default dbStore;
