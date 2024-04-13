'use strict';

const PouchDB = require('pouchdb');

// Define a global window object with a crypto property to mock window.crypto for generateChecksum
const { Crypto } = require("@peculiar/webcrypto");
global.window = { crypto: new Crypto() };

let dbStore;
describe('db.js', () => {
  beforeEach(async () => {
    dbStore = require('./db').dbStore;
  });

  afterEach(async () => {
    if (dbStore._db != null) {
      await dbStore._db.destroy(); // Clean up the database after each test
    }
  });

  describe('generateChecksum', () => {
    it('should generate a checksum for the given data', async () => {
      const { generateChecksum } = require('./db');
      const serverDbData = [{ key1: 'value1' }, { key2: 'value2' }];
      const checksum = await generateChecksum(serverDbData);
      expect(checksum).toBeDefined(); // Placeholder test, replace with actual checksum validation

      const sameChecksum = await generateChecksum(serverDbData);
      expect(checksum).toEqual(sameChecksum);
    });
    it('should generate checksum consistently', async () => {
      const { generateChecksum } = require('./db');
      const serverDbData = [{ key1: 'value1' }, { key2: 'value2' }];
      const differentServerDbData = [{ other: 'val' }, { key2: 'value2' }];
      const checksum = await generateChecksum(serverDbData);
      const sameChecksum = await generateChecksum(serverDbData);
      const differentChecksum = await generateChecksum(differentServerDbData);
      expect(checksum).toEqual(sameChecksum);
      expect(checksum).not.toEqual(differentChecksum);
    });
  });

  describe('populateDatabase', () => {
    it('should populate the database with the given data', async () => {
      const serverDbData = [{ key1: 'value1' }, { key2: 'value2' }];
      dbStore._db = new PouchDB('ncrystal_db');
      await dbStore.populateDatabase(serverDbData);
      const allDocs = await dbStore._db.allDocs({ include_docs: true });
      expect(allDocs.rows.length).toBeGreaterThan(0);

      // Extract the actual document data without _id and _rev
      const actualDocs = allDocs.rows.map(row => {
        const { _id, _rev, ...doc } = row.doc;
        return doc;
      });
      // Filter out the versionInfo document
      const filteredActualDocs = actualDocs.filter(doc => !doc.checksum);
      expect(filteredActualDocs).toEqual(serverDbData);
    });
  });
});
