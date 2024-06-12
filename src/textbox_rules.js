'use strict';

//Rules to be applied to each search phrase independently
const singlePhraseRules = [
  {
    'title': 'gas in the text',
    'condition': function (phrase) {
      return phrase.toLowerCase().includes('gas');
    },
    'message': `If you are interested in defining gas mixtures, you can read more about how to do it easily in the <a href='https://github.com/mctools/ncrystal/wiki/Announcement-Release3.2.0'>Announcement of Release3.2.0</a>.`,
    'type': 'infobox',
    'score': 200
  },
  {
    'title': 'TEST warning',
    'condition': function (phrase) {
      return phrase.toLowerCase().includes('warning');
    },
    'message': `You've searched for a warning, so here's one.`,
    'type': 'warnbox',
    'score': 210,
  },
];

//Rules to be applied to multiple search phrases together
const multiPhraseRules = [
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
]

export { singlePhraseRules, multiPhraseRules };
