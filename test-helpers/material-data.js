'use strict';

const testMat1 = {
  "key": "stdlib::some.ncmat", "shortkey": "some.ncmat", "safekey": "some.ncmat", "ncmat_header": ["1", "2"], "dump": "", "ncmat_contents": "NCMAT...", "plot_filename_xsect": "stdlib__some.png", "extra_keywords": ""
}
const testMat2 = {
  "key": "stdlib::other.ncmat", "shortkey": "other.ncmat", "safekey": "stdlib__otherdncmat", "ncmat_header": ["3", "4"], "dump": "", "ncmat_contents": "NCMAT...", "plot_filename_xsect": "stdlib__other.png", "extra_keywords": ""
}

const serverDbDataInfo1 = { "checksum": "3f6537702719d23e3df91923d5643967a4fdd193bd4a60462bad5b4042e7919d", "timestamp": "2024-05-25 16:30:42" }

const serverDbDataInfo2 = { "checksum": "3f6537702719d23e3df91923d5643967a4fdd193bd4a60462bad5b4042e7919d", "timestamp": "2024-06-04 10:02:47" }

module.exports = {
  testMat1,
  testMat2,
  testMatArray1: [testMat1],
  testMatArray2: [testMat1, testMat2],
  serverDbDataInfo1,
  serverDbDataInfo2,
}
