'use strict';

const { testMat1, testMat2, testMatArray1, testMatArray2 } = require('../test-helpers/material-data.js');

// Define a global window object with a crypto property to mock window.crypto for generateChecksum
const { Crypto } = require("@peculiar/webcrypto");
global.window = { crypto: new Crypto() };
const fetch = require('node-fetch');
global.fetch = fetch;

function extractActualDataFromDbResponse(allDocs) {
  // Extract the actual document data without _id, _rev, type, and the versionInfo document
  return allDocs.rows.filter(row => row.doc.type === 'material').map(row => row.doc.data);
}

const { dbStore } = require('./db.js');

describe('db.js', () => {
  let dbStoreInstance;
  beforeEach(async () => {
    dbStoreInstance = Object.assign({}, dbStore);
  });

  afterEach(async () => {
    if (dbStoreInstance._db != null) {
      await dbStoreInstance._db.destroy(); // Clean up the database after each test
    }
  });

  describe('generateChecksum', () => {
    it('should generate a checksum for the given data', async () => {
      const { generateChecksum } = require('./db.js');
      const serverDbData = testMatArray1;
      const checksum = await generateChecksum(serverDbData);
      expect(checksum).toBeDefined(); // Placeholder test, replace with actual checksum validation

      const sameChecksum = await generateChecksum(serverDbData);
      expect(checksum).toEqual(sameChecksum);
    });
    it('should generate checksum consistently', async () => {
      const { generateChecksum } = require('./db.js');
      const serverDbData = testMatArray1;
      const differentServerDbData = testMatArray2;
      const checksum = await generateChecksum(serverDbData);
      const sameChecksum = await generateChecksum(serverDbData);
      const differentChecksum = await generateChecksum(differentServerDbData);
      expect(checksum).toEqual(sameChecksum);
      expect(checksum).not.toEqual(differentChecksum);
    });
  });

  describe('populateDatabase', () => {
    it('should populate the database with the given data', async () => {
      dbStoreInstance._initDb();
      const serverDbData = testMatArray2;
      await dbStoreInstance.populateDatabase(serverDbData);
      const allDocs = await dbStoreInstance._db.allDocs({ include_docs: true });
      expect(allDocs.rows.length).toBeGreaterThan(0);

      const dbData = extractActualDataFromDbResponse(allDocs);
      expect(dbData).toEqual(serverDbData);
    });
    it('should store the checksum in the database', async () => {
      dbStoreInstance._initDb();
      const serverDbData = testMatArray2;
      const { generateChecksum } = require('./db.js');
      const checksum = await generateChecksum(serverDbData);
      await dbStoreInstance.populateDatabase(serverDbData);

      dbStoreInstance._db.get('versionInfo').then(versionInfo => {
        expect(versionInfo.checksum).toEqual(checksum);
      });
    });
  });

  describe('checkAndUpdateDatabase', () => {
    it('should not update the db if the checksum of the new data matches the one stored in the db', async () => {
      dbStoreInstance._initDb();
      const serverDbData = testMatArray1;
      await dbStoreInstance.populateDatabase(serverDbData);
      const allDocsBeforeUpdate = await dbStoreInstance._db.allDocs({ include_docs: true });
      await dbStoreInstance.checkAndUpdateDatabase(serverDbData);
      const allDocsAfterUpdate = await dbStoreInstance._db.allDocs({ include_docs: true });
      expect(allDocsBeforeUpdate).toEqual(allDocsAfterUpdate);
    });
    it('should update the database if the checksums do not match', async () => {
      dbStoreInstance._initDb();
      const serverDbData = testMatArray1;
      await dbStoreInstance.populateDatabase(serverDbData);
      const newServerDbData = testMatArray2;
      await dbStoreInstance.checkAndUpdateDatabase(newServerDbData);
      const allDocs = await dbStoreInstance._db.allDocs({ include_docs: true });
      const dbData = extractActualDataFromDbResponse(allDocs);
      expect(dbData).toEqual(newServerDbData);
    });
  });

  describe('init', () => {
    it('should initialise the db with data fetched from the (mocked) server', async () => {
      const serverDbData = testMatArray2;
      const mockResponse = new Response(JSON.stringify(serverDbData), { status: 200, statusText: 'OK' });
      spyOn(global, 'fetch').and.returnValue(Promise.resolve(mockResponse));
      await dbStoreInstance.init();

      const allDocs = await dbStoreInstance._db.allDocs({ include_docs: true });
      expect(allDocs.rows.length).toBeGreaterThan(0);

      const dbData = extractActualDataFromDbResponse(allDocs);
      expect(dbData).toEqual(serverDbData);
    });
  });
  describe('getAll', () => {
    it('should return all documents excluding the versionInfo', async () => {
      const serverDbData = testMatArray2;
      const mockResponse = new Response(JSON.stringify(serverDbData), { status: 200, statusText: 'OK' });
      spyOn(global, 'fetch').and.returnValue(Promise.resolve(mockResponse));
      await dbStoreInstance.init();
      return dbStoreInstance.getAll().then((result) => {
        expect(result.some(row => row._id === "versionInfo")).toBe(false);
        expect(result.map(row => { const { _id, _rev, ...materialData } = row; return materialData; })).toEqual(serverDbData);
      });
    });
  });

  describe('getBySafeKey', () => {
    it('should return the document (material) with the matching safeKey', async () => {
      const safeKeyToLookFor = "stdlib__favoriteMaterialdncmat";
      const materialToLookFor = { ...testMat1, safekey: safeKeyToLookFor };
      const serverDbData = [materialToLookFor, testMat2];
      const mockResponse = new Response(JSON.stringify(serverDbData), { status: 200, statusText: 'OK' });
      spyOn(global, 'fetch').and.returnValue(Promise.resolve(mockResponse));

      await dbStoreInstance.init();
      dbStoreInstance.getBySafeKey(safeKeyToLookFor).then((result) => {
        const { _id, _rev, ...materialData } = result;
        expect(materialData).toEqual(materialToLookFor);
        expect(materialData).not.toEqual(otherMaterial);
      });
    });
  });
});
