'use strict';

const { testMat1, testMat2, testMatArray1, testMatArray2 } = require('../test-helpers/material-data.js');
const { serverDbDataInfo1, serverDbDataInfo2 } = require('../test-helpers/material-data.js');

const fetch = require('node-fetch');
global.fetch = fetch;
let fetchSpy;

function extractActualDataFromDbResponse(allDocs) {
  // Extract the actual document data without _id, _rev, type, and the versionInfo document
  return allDocs.rows.filter(row => row.doc.type === 'material').map(row => row.doc.data);
}

const { dbStore } = require('./db.js');

describe('db.js', () => {
  let dbStoreInstance;
  beforeEach(async () => {
    dbStoreInstance = Object.assign({}, dbStore);
    fetchSpy = spyOn(global, 'fetch');
  });

  afterEach(async () => {
    if (dbStoreInstance._db != null) {
      await dbStoreInstance._db.destroy(); // Clean up the database after each test
    }
  });

  describe('fetchDataAndPopulateDatabase', () => {
    it('should populate the database with the given data', async () => {
      dbStoreInstance._initDb();
      const serverDbDataInfo = serverDbDataInfo1;
      const serverDbData = testMatArray2;
      const mockResponse = new Response(JSON.stringify(serverDbData), { status: 200, statusText: 'OK' });
      fetchSpy.and.callFake((url, options) => {
        if (url.includes(dbStoreInstance._serverDataLocation)) {
          return Promise.resolve(mockResponse);
        }
      });
      await dbStoreInstance.fetchDataAndPopulateDatabase(serverDbDataInfo);
      const allDocs = await dbStoreInstance._db.allDocs({ include_docs: true });
      expect(allDocs.rows.length).toBeGreaterThan(0);
      const dbData = extractActualDataFromDbResponse(allDocs);
      expect(dbData).toEqual(serverDbData);
    });
    it('should store the checksum and timestamp in the database', async () => {
      dbStoreInstance._initDb();
      const serverDbDataInfo = serverDbDataInfo2;
      const serverDbData = testMatArray2;
      const mockResponse = new Response(JSON.stringify(serverDbData), { status: 200, statusText: 'OK' });
      fetchSpy.and.callFake((url, options) => {
        if (url.includes(dbStoreInstance._serverDataLocation)) {
          return Promise.resolve(mockResponse);
        }
      });
      await dbStoreInstance.fetchDataAndPopulateDatabase(serverDbDataInfo);
      dbStoreInstance._db.get('versionInfo').then(versionInfo => {
        expect(versionInfo.checksum).toEqual(serverDbDataInfo.checksum);
        expect(versionInfo.timestamp).toEqual(serverDbDataInfo.timestamp);
      });
    });
  });

  describe('checkAndUpdateDatabase', () => {
    it('should not update the db if the checksum of the new data matches the one stored in the db', async () => {
      dbStoreInstance._initDb();
      //store some data to the database
      const serverDbDataInfo = serverDbDataInfo1;
      const serverDbData = testMatArray1;
      const mockResponse = new Response(JSON.stringify(serverDbData), { status: 200, statusText: 'OK' });
      fetchSpy.and.callFake((url, options) => {
        if (url.includes(dbStoreInstance._serverDataLocation)) {
          return Promise.resolve(mockResponse);
        }
      });
      await dbStoreInstance.fetchDataAndPopulateDatabase(serverDbDataInfo);
      const allDocsBeforeUpdate = await dbStoreInstance._db.allDocs({ include_docs: true });
      //run checkAndUpdateDatabase with the same serverDbDataInfo that is already stored
      spyOn(dbStoreInstance, 'fetchDataAndPopulateDatabase');
      await dbStoreInstance.checkAndUpdateDatabase(serverDbDataInfo);
      const allDocsAfterUpdate = await dbStoreInstance._db.allDocs({ include_docs: true });
      expect(allDocsBeforeUpdate).toEqual(allDocsAfterUpdate);
      expect(dbStoreInstance.fetchDataAndPopulateDatabase).not.toHaveBeenCalled();
    });
    it('should update the database if the checksums do not match', async () => {
      dbStoreInstance._initDb();
      //store some data to the database
      const serverDbDataInfo = serverDbDataInfo1;
      const serverDbData = testMatArray1;
      const mockResponse = new Response(JSON.stringify(serverDbData), { status: 200, statusText: 'OK' });
      fetchSpy.and.callFake((url, options) => {
        if (url.includes(dbStoreInstance._serverDataLocation)) {
          return Promise.resolve(mockResponse);
        }
      });
      await dbStoreInstance.fetchDataAndPopulateDatabase(serverDbDataInfo);
      const allDocsBeforeUpdate = await dbStoreInstance._db.allDocs({ include_docs: true });
      const dbDataBeforeUpdate = extractActualDataFromDbResponse(allDocsBeforeUpdate);

      // change the mocking of the global fetch function, and call the checkAndUpdateDatabase with new data
      const newServerDbDataInfo = serverDbDataInfo2;
      const newServerDbData = testMatArray2;
      const newMockResponse = new Response(JSON.stringify(newServerDbData), { status: 200, statusText: 'OK' });
      fetchSpy.and.callFake((url, options) => {
        if (url.includes(dbStoreInstance._serverDataLocation)) {
          return Promise.resolve(newMockResponse);
        }
      });
      await dbStoreInstance.checkAndUpdateDatabase(newServerDbDataInfo);
      const allDocs = await dbStoreInstance._db.allDocs({ include_docs: true });
      const dbData = extractActualDataFromDbResponse(allDocs);
      expect(dbData).not.toEqual(dbDataBeforeUpdate);
      expect(dbData).toEqual(newServerDbData);
    });
  });

  describe('init', () => {
    it('should fail if database initialisation fails', async () => {
      fetchSpy.and.callFake((url, options) => {
        if (url.includes(dbStoreInstance._serverChecksumLocation)) {
          return Promise.resolve({
            status: 404,
            statusText: 'Not Found',
            ok: false,
            json: () => Promise.resolve({
              error: "Not Found",
              message: "The requested resource could not be found on the server."
            }),
          });
        }
      });
      try {
        await dbStoreInstance.init();
        fail('Expected init to throw an error.');
      } catch (error) {
        expect(error).toBeTruthy;
      }
    });
    it('should initialise the db with data fetched from the (mocked) server', async () => {
      const serverDbDataInfo = serverDbDataInfo2;
      const serverDbData = testMatArray2;
      const mockResponse = new Response(JSON.stringify(serverDbData), { status: 200, statusText: 'OK' });
      const checksumMockResponse = new Response(JSON.stringify(serverDbDataInfo), { status: 200, statusText: 'OK' });
      fetchSpy.and.callFake((url, options) => {
        if (url.includes(dbStoreInstance._serverDataLocation)) {
          return Promise.resolve(mockResponse);
        }
        else if (url.includes(dbStoreInstance._serverChecksumLocation)) {
          return Promise.resolve(checksumMockResponse);
        }
      });
      spyOn(dbStoreInstance, 'checkAndUpdateDatabase');
      await dbStoreInstance.init();
      expect(dbStoreInstance.checkAndUpdateDatabase).not.toHaveBeenCalled();

      const allDocs = await dbStoreInstance._db.allDocs({ include_docs: true });
      expect(allDocs.rows.length).toBeGreaterThan(0);

      const dbData = extractActualDataFromDbResponse(allDocs);
      expect(dbData).toEqual(serverDbData);
    });
  });
  describe('getAll', () => {
    it('should return all documents excluding the versionInfo', async () => {
      const serverDbDataInfo = serverDbDataInfo1;
      const serverDbData = testMatArray1;
      const mockResponse = new Response(JSON.stringify(serverDbData), { status: 200, statusText: 'OK' });
      const checksumMockResponse = new Response(JSON.stringify(serverDbDataInfo), { status: 200, statusText: 'OK' });
      fetchSpy.and.callFake((url, options) => {
        if (url.includes(dbStoreInstance._serverDataLocation)) {
          return Promise.resolve(mockResponse);
        }
        else if (url.includes(dbStoreInstance._serverChecksumLocation)) {
          return Promise.resolve(checksumMockResponse);
        }
      });
      await dbStoreInstance.init();

      return dbStoreInstance.getAll().then((result) => {
        expect(result.some(row => row._id === "versionInfo")).toBe(false);
        expect(result.map(row => { const { _id, _rev, ...materialData } = row; return materialData; })).toEqual(serverDbData);
      });
    });
  });

  describe('getBySafeKey', () => {
    it('should return the document (material) with the matching safeKey', async () => {
      const serverDbDataInfo = serverDbDataInfo1;
      const safeKeyToLookFor = "stdlib__favoriteMaterialdncmat";
      const materialToLookFor = { ...testMat1, safekey: safeKeyToLookFor };
      const serverDbData = [materialToLookFor, testMat2];
      const mockResponse = new Response(JSON.stringify(serverDbData), { status: 200, statusText: 'OK' });
      const checksumMockResponse = new Response(JSON.stringify(serverDbDataInfo), { status: 200, statusText: 'OK' });
      fetchSpy.and.callFake((url, options) => {
        if (url.includes(dbStoreInstance._serverDataLocation)) {
          return Promise.resolve(mockResponse);
        }
        else if (url.includes(dbStoreInstance._serverChecksumLocation)) {
          return Promise.resolve(checksumMockResponse);
        }
      });

      await dbStoreInstance.init();
      dbStoreInstance.getBySafeKey(safeKeyToLookFor).then((result) => {
        const { _id, _rev, ...materialData } = result;
        expect(materialData).toEqual(materialToLookFor);
        expect(materialData).not.toEqual(otherMaterial);
      });
    });
  });
});
