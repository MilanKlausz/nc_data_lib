'use strict';

import { singlePhraseRules, multiPhraseRules } from './textbox_rules.js';

const searchManager = {
  db: null, //getSearchManager should define it
  searchResults: [],
  nameHitScore: 100,
  dumpHitScore: 10,
  performQuery: async function (searchInput) {
    if (/\S/.test(searchInput)) { //non-whitespace character is required in the input
      const searchPhrases = this.separateSearchPhrases(searchInput);
      await this.processSearchPhrases(searchPhrases);
      return this.getSortedResults().map(res => ({ 'score': res.score, 'entry': res }));
    }
    else { return []; }
  },
  separateSearchPhrases: function (searchInput) {
    //Example: keyword1 "double quoted keyphrase" 'single quoted keyphrase2' keyword3's, keyword4,keyword5
    const regex = /"[^"]*"|'[^']*'|\S+/g; //note: it doesn't handle commas or semicolons
    let parts = searchInput.match(regex).map(keyword => keyword.trim());
    let phrases = [];
    parts.forEach(part => {
      if ((part.startsWith('"') && part.endsWith('"')) ||
        (part.startsWith("'") && part.endsWith("'"))) {
        phrases.push(part.slice(1, -1)); //remove quotes
      }
      else if (/[,;]/.test(part)) { //split by comma/semicolon, filter empty results in case of separators on either end
        Array.prototype.push.apply(phrases, part.split(/[,;]/).filter(e => e));
      }
      else {
        phrases.push(part);
      }
    });
    return phrases;
  },
  processSearchPhrases: async function (searchPhrases) {
    for (const phrase of searchPhrases) {
      const filteredByName = await this.filterMaterialsByName(phrase);
      filteredByName.forEach(mat => {
        this.addMaterialToSearchResults(mat);
        this.modifyScoreOfSearchResult(mat.shortkey, this.nameHitScore);
      });

      const filteredByDumpText = await this.filterMaterialsByDumpText(phrase);
      filteredByDumpText.forEach(mat => {
        this.addMaterialToSearchResults(mat);
        this.modifyScoreOfSearchResult(mat.shortkey, this.dumpHitScore);
      });
    }
    const textBoxes = this.getTextBoxes(searchPhrases);
    textBoxes.forEach(textBox => {
      this.addTextBoxToSearchResults(textBox);
      this.modifyScoreOfSearchResult(textBox.title, textBox.score);
    })
  },
  filterMaterialsByName: async function (searchText) {
    // await new Promise(resolve => setTimeout(resolve, 1000));// TODO Just for testing
    return await this.db.getAll().then((result) => {
      return result.filter(el => el.key.toLowerCase().includes(searchText.toLowerCase()));
    });
  },
  filterMaterialsByDumpText: async function (searchText) {
    return await this.db.getAll().then((result) => {
      return result.filter(el => el.dump.toLowerCase().includes(searchText.toLowerCase()));
    });
  },
  getTextBoxes: function (searchPhrases) {
    let textBoxes = [];
    singlePhraseRules.forEach(rule => {
      searchPhrases.forEach(phrase => {
        if (rule.condition(phrase)) {
          textBoxes.push(rule);
        }
      });
    });
    multiPhraseRules.forEach(rule => {
      if (rule.condition(searchPhrases)) {
        textBoxes.push(rule)
      }
    });
    return textBoxes;
  },
  addMaterialToSearchResults: function (material) {
    if (!this.searchResults.some(e => e.data.title === material.shortkey)) {
      this.searchResults.push({
        'score': 0,
        'type': "mat",
        'data': {
          'title': material.shortkey,
          'message': "TODO search context",//TODO
          'db_info': material
        }
      });
    }
  },
  addTextBoxToSearchResults: function (textBox) {
    if (!this.searchResults.some(e => e.data.title === textBox.title)) {
      this.searchResults.push({
        'score': 0,
        'type': textBox.type, //"infobox" or "warnbox"
        'data': {
          'title': textBox.title,
          'message': textBox.message,
          'is_warning': (textBox.type === "warnbox")
        }
      });
    }
  },
  modifyScoreOfSearchResult: function (key, score) {
    this.searchResults.forEach(e => {
      if (e.data.title === key) {
        e.score += score;
      }
    });
  },
  getSortedResults: function () {
    return this.searchResults.sort((a, b) => b.score - a.score);
  },
  reset: function () {
    this.searchResults = [];
  },
};

function getSearchManager(db) {
  return {...searchManager, db}
}

export { getSearchManager };
