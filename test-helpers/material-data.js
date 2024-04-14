'use strict';

const testMat1 = {
  "key": "stdlib::some.ncmat", "shortkey": "some.ncmat", "safekey": "some.ncmat", "ncmat_header": ["1", "2"], "dump": "", "ncmat_contents": "NCMAT...", "plot_filename_xsect": "stdlib__some.png", "extra_keywords": ""
}
const testMat2 = {
  "key": "stdlib::other.ncmat", "shortkey": "other.ncmat", "safekey": "stdlib__otherdncmat", "ncmat_header": ["3", "4"], "dump": "", "ncmat_contents": "NCMAT...", "plot_filename_xsect": "stdlib__other.png", "extra_keywords": ""
}

module.exports = {
  testMat1,
  testMat2,
  testMatArray1: [testMat1],
  testMatArray2: [testMat1, testMat2],
}
