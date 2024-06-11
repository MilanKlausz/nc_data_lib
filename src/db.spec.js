'use strict';

const { getCustomisedMaterialDb, testMaterialDb1, testMaterialDb2 } = require('../test-helpers/material-data.js');
const { serverDbDataInfo1, serverDbDataInfo2 } = require('../test-helpers/material-data.js');

const fetch = require('node-fetch');
global.fetch = fetch;
let fetchSpy;

const zlib = require('zlib');
function compressData(protobufEncodedData) {
  return new Promise((resolve, reject) => {
    const gzip = zlib.createGzip();
    const chunks = []; // Array to hold the chunks of compressed data
    gzip.on('data', chunk => chunks.push(chunk)); // Collect chunks of compressed data
    gzip.on('end', () => resolve(Buffer.concat(chunks))); // Resolve the promise with the full compressed data
    gzip.on('error', reject);
    gzip.write(protobufEncodedData);
    gzip.end(); // Signal the end of the stream after writing the data
  });
}

let materialDbEncoder;
async function loadMaterialDatabaseDecoder() {
  const materialDbDecoder = await import('./material_database_decoder.mjs');
  materialDbEncoder = materialDbDecoder.encodeDatabase;
}

function extractActualDataFromDbResponse(allDocs) {
  // Extract the actual document data without _id, _rev, type, and the versionInfo document
  return allDocs.rows.filter(row => row.doc.type === 'material').map(row => row.doc.data);
}

async function createMockResponse(data) {
  const protobufEncodedData = materialDbEncoder(data);
  const compressedData = await compressData(protobufEncodedData);
  return new Response(compressedData, {
    status: 200,
    statusText: 'OK',
    headers: { 'Content-Type': 'application/gzip' },
  });
}

function mockFetch(fetchResponses) {
  fetchSpy.and.callFake((url, options) => {
    const response = fetchResponses.find(resp => url.includes(resp.urlPart));
    if (response) {
      return Promise.resolve(response.data);
    } else {
      return Promise.reject(new Error('No matching response found'));
    }
  });
}

const { dbStore } = require('./db.js');
describe('db.js', () => {
  beforeAll(async () => {
    await loadMaterialDatabaseDecoder();
  });

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
      const serverDbData = testMaterialDb2;
      mockFetch([{
        urlPart: dbStoreInstance._serverDataLocation,
        data: createMockResponse(serverDbData)
      }]);

      const serverDbDataInfo = serverDbDataInfo1;
      await dbStoreInstance.fetchDataAndPopulateDatabase(serverDbDataInfo);
      const allDocs = await dbStoreInstance._db.allDocs({ include_docs: true });
      expect(allDocs.rows.length).toBeGreaterThan(0);
      const dbData = extractActualDataFromDbResponse(allDocs);
      expect(dbData).toEqual(serverDbData.materials);

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
      const serverDbData = testMaterialDb1;
      mockFetch([{
        urlPart: dbStoreInstance._serverDataLocation,
        data: createMockResponse(serverDbData)
      }]);
      const serverDbDataInfo = serverDbDataInfo1;
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
      const serverDbData = testMaterialDb1;
      mockFetch([{
        urlPart: dbStoreInstance._serverDataLocation,
        data: createMockResponse(serverDbData)
      }]);
      const serverDbDataInfo = serverDbDataInfo1;
      await dbStoreInstance.fetchDataAndPopulateDatabase(serverDbDataInfo);
      const allDocsBeforeUpdate = await dbStoreInstance._db.allDocs({ include_docs: true });
      const dbDataBeforeUpdate = extractActualDataFromDbResponse(allDocsBeforeUpdate);

      // change the mocking of the global fetch function, and call the checkAndUpdateDatabase with new data
      const newServerDbData = testMaterialDb2;
      mockFetch([{
        urlPart: dbStoreInstance._serverDataLocation,
        data: createMockResponse(newServerDbData)
      }]);
      const newServerDbDataInfo = serverDbDataInfo2;
      await dbStoreInstance.checkAndUpdateDatabase(newServerDbDataInfo);
      const allDocs = await dbStoreInstance._db.allDocs({ include_docs: true });
      const dbData = extractActualDataFromDbResponse(allDocs);
      expect(dbData).not.toEqual(dbDataBeforeUpdate);
      expect(dbData).toEqual(newServerDbData.materials);
    });
  });

  describe('init', () => {
    it('should fail if database initialisation fails', async () => {
      const mockResponse = Promise.resolve({
        status: 404,
        statusText: 'Not Found',
        ok: false,
        json: () => Promise.resolve({
          error: "Not Found",
          message: "The requested resource could not be found on the server."
        }),
      });
      const fetchResponses = [{
        urlPart: dbStoreInstance._serverChecksumLocation,
        data: mockResponse
      }];
      mockFetch(fetchResponses);
      try {
        await dbStoreInstance.init();
        fail('Expected init to throw an error.');
      } catch (error) {
        expect(error).toBeTruthy;
      }
    });

    it('should initialise the db with data fetched from the (mocked) server', async () => {
      const serverDbDataInfo = serverDbDataInfo2;
      const serverDbData = testMaterialDb2;
      mockFetch([{
        urlPart: dbStoreInstance._serverChecksumLocation,
        data: new Response(JSON.stringify(serverDbDataInfo), { status: 200, statusText: 'OK' })
      }, {
        urlPart: dbStoreInstance._serverDataLocation,
        data: createMockResponse(serverDbData)
      }]);

      spyOn(dbStoreInstance, 'checkAndUpdateDatabase');
      await dbStoreInstance.init();
      expect(dbStoreInstance.checkAndUpdateDatabase).not.toHaveBeenCalled();

      const allDocs = await dbStoreInstance._db.allDocs({ include_docs: true });
      expect(allDocs.rows.length).toBeGreaterThan(0);

      const dbData = extractActualDataFromDbResponse(allDocs);
      expect(dbData).toEqual(serverDbData.materials);
    });
  });

  describe('getAll', () => {
    it('should return all documents excluding the versionInfo', async () => {
      const serverDbDataInfo = serverDbDataInfo1;
      const serverDbData = testMaterialDb1;
      mockFetch([{
        urlPart: dbStoreInstance._serverChecksumLocation,
        data: new Response(JSON.stringify(serverDbDataInfo), { status: 200, statusText: 'OK' })
      }, {
        urlPart: dbStoreInstance._serverDataLocation,
        data: createMockResponse(serverDbData)
      }]);
      await dbStoreInstance.init();

      return dbStoreInstance.getAll().then((result) => {
        expect(result.some(row => row._id === "versionInfo")).toBe(false);
        expect(result.map(row => { const { _id, _rev, ...materialData } = row; return materialData; })).toEqual(serverDbData.materials);
      });
    });
  });

  describe('getBySafeKey', () => {
    it('should return the document (material) with the matching safeKey', async () => {
      const serverDbDataInfo = serverDbDataInfo1;
      const safeKeyToLookFor = "stdlib__favoriteMaterialdncmat";
      const serverDbData = getCustomisedMaterialDb(safeKeyToLookFor);
      mockFetch([{
        urlPart: dbStoreInstance._serverChecksumLocation,
        data: new Response(JSON.stringify(serverDbDataInfo), { status: 200, statusText: 'OK' })
      }, {
        urlPart: dbStoreInstance._serverDataLocation,
        data: createMockResponse(serverDbData)
      }]);

      await dbStoreInstance.init();
      dbStoreInstance.getBySafeKey(safeKeyToLookFor).then((result) => {
        const { _id, _rev, ...materialData } = result;
        expect(materialData).toEqual(materialToLookFor);
        expect(materialData).not.toEqual(otherMaterial);
      });
    });
  });
});
