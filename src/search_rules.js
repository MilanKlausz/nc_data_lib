'use strict';


function highlightText(str, phrase) {
  return str.replace(new RegExp(phrase, 'g'), '<strong>$&</strong>');
  // return str.replace(new RegExp(phrase, 'g'), '<mark>$&</mark>');
  // return str.replace(new RegExp(phrase, 'g'), '<ins>$&</ins>');
  // return str.replace(new RegExp(phrase, 'g'), '<u>$&</u>'); //not good around underscore characters
}

function getContexts(phrase, fullText) {
  // const regex = new RegExp(phrase, 'gi'); //Case insensitive
  const regex = new RegExp(phrase, 'g'); //Case sensitive
  const matches = fullText.matchAll(regex);
  const contexts = [];

  for (const match of matches) {
    console.log(match);
    const distance = 30; //TODO +-character number
    const startIndex = Math.max(0, match.index - distance);
    const endIndex = Math.min(fullText.length, match.index + match[0].length + distance);
    
    const originalContext = fullText.slice(startIndex, endIndex);
    const contextWithHighlighting = highlightText(originalContext, match[0]);

    const preText = (startIndex === 0) ? '"' : '"(...)';
    const afterText = (endIndex === fullText.length) ? '"' : '(...)"';

    contexts.push(preText + contextWithHighlighting + afterText);
  }

  return contexts;
}

function applySearchRules(searchPhrases, materials, modifyResult) {
  // Increment the score if any of the searchPhrases match part of the name of the material
  const nameHitScore = 100;
  materials.filter(mat => {
    return searchPhrases.some(phrase => mat.key.toLowerCase().includes(phrase.toLowerCase()));
  }).forEach(mat => {
    modifyResult(mat, nameHitScore, '');
  });

  // Increment the score if any of the searchPhrases match part of the name of the material
  const ncmatContentsHitScore = 11;
  materials.forEach(mat => {
    let matchedContexts = [];
    searchPhrases.forEach(phrase => {
      const ncmatContents = mat['ncmat_contents'];
      const contexts = getContexts(phrase, ncmatContents);
      if (contexts.length > 0) {
        matchedContexts.push(...contexts);
      }
    });
    if (matchedContexts.length > 0) {
      modifyResult(mat, ncmatContentsHitScore, matchedContexts.join('<br>')); //multiply score by the number of 
    }
  });
}

export { applySearchRules };
