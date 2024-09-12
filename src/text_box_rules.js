'use strict';

const textBoxRules = [
  {
    'title': 'gas in the text',
    'condition': function (phrases) {
      return phrases.some(phrase => phrase.toLowerCase().includes('gas') &&
      !phrase.includes('gAs') && !phrase.includes('GaS')); //exclude e.g. AgAs and GaSe
    },
    'message': `If you are interested in defining gas mixtures, you can read more about how to do it easily in the <a href='https://github.com/mctools/ncrystal/wiki/Announcement-Release3.2.0'>Announcement of Release3.2.0</a>.`,
    'type': 'infobox',
    'score': 1000
  },
  {
    'title': 'TEST warning',
    'condition': function (phrases) {
      return phrases.some(phrase => phrase.toLowerCase().includes('warning'));
    },
    'message': `You've searched for a warning, so here's one.`,
    'type': 'warnbox',
    'score': 210,
  },
  {
    'title': 'TEST multiPhraseRule',
    'condition': function (phrases) {
      return phrases.some(phrase => phrase.toLowerCase().startsWith('a')) &&
        phrases.some(phrase => phrase.toLowerCase().startsWith('b')) &&
        phrases.some(phrase => phrase.toLowerCase().startsWith('c'));
    },
    'message': `You're learning the alphabet, right?`,
    'type': 'infobox',
    'score': 1000,
  },
];

export { textBoxRules };
