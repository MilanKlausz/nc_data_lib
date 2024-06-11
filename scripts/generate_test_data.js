'use strict';

const path = require('path');
const fs = require('fs');
const zlib = require('zlib');
const { testMaterialDatabase } = require('../test-helpers/material-data.js');

async function generateTestData() {
  const materialDbDecoder = await import('../src/material_database_decoder.mjs');
  const encodedData = materialDbDecoder.encodeDatabase(testMaterialDatabase);

  zlib.gzip(encodedData, (err, compressedData) => {
    if (err) throw err;

    const outputPath = path.join(__dirname, '..', 'test-helpers', 'test_db.pb.gz');
    fs.writeFile(outputPath, compressedData, (err) => {
      if (err) throw err;
      console.log(`Test data saved to ${outputPath}`);
    });
  });
}

(async () => {
  await generateTestData();
})();
