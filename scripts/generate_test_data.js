'use strict';

import fs from 'fs';
import zlib from 'zlib';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
import { testMaterialDb1 } from '../test-helpers/material-data.js';
import { encodeDatabase } from '../src/material_database_decoder.js';

async function generateTestData() {
  const encodedData = encodeDatabase(testMaterialDb1);

  zlib.gzip(encodedData, (err, compressedData) => {
    if (err) throw err;

    const outputPath = join(__dirname, '..', 'test-helpers', 'test_db.pb.gz');
    fs.writeFile(outputPath, compressedData, (err) => {
      if (err) throw err;
      console.log(`Test data saved to ${outputPath}`);
    });
  });
}

await generateTestData();
