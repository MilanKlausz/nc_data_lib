'use strict';

function applySearchRules(searchPhrases, materials, modifyResult) {
  // Increment the score if any of the searchPhrases match part of the name of the material
  const nameHitScore = 100;
  materials.filter(mat => {
    return searchPhrases.some(phrase => mat.key.toLowerCase().includes(phrase.toLowerCase()));
  }).forEach(mat => {
    modifyResult(mat, nameHitScore, '');
  });
}

export { applySearchRules };
