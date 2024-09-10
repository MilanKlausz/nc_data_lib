'use strict';

import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
import { testMaterialDb1 } from '../test-helpers/material-data.js';

async function generateTestData() {
  const outputPath = join(__dirname, '..', 'test-helpers', 'test_db.json');
  fs.writeFile(outputPath, JSON.stringify(testMaterialDb1), (error) => {
    if (error) throw error;
  });
  console.log(`Test data saved to ${outputPath}`);
}

await generateTestData();
