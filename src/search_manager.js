'use strict';

import { textBoxRules } from './text_box_rules.js';
import { applySearchRules } from './search_rules.js';

const searchManager = {
  db: null, //getSearchManager should define it
  searchResults: [],
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
    // handle text boxes
    const textBoxes = this.getTextBoxes(searchPhrases);
    textBoxes.forEach(textBox => {
      this.addTextBoxToSearchResults(textBox, textBox.score);
    });

    // handle materials
    await this.db.getAllMaterials().then((materials) => {
      //note: passing an arrow function as an argument to preserve the 'this' context
      applySearchRules(searchPhrases, materials, (material, score, context) => {
        this.addMaterialToSearchResults(material, score, context);
      });
    });
  },
  getTextBoxes: function (searchPhrases) {
    let textBoxes = [];
    textBoxRules.forEach(rule => {
      if (rule.condition(searchPhrases)) {
        textBoxes.push(rule);
      }
    });
    return textBoxes;
  },
  addMaterialToSearchResults: function (material, score=0, message='') {
    if (!this.searchResults.some(e => e.data.title === material.shortkey)) {
      this.addNewMaterialToSearchResults(material, score, message);
    } else {
      this.modifySearchResults(material.shortkey, score, message);
    }
  },
  addTextBoxToSearchResults: function (textBox, score=0) {
    if (!this.searchResults.some(e => e.data.title === textBox.title)) {
      this.addNewTextBoxToSearchResults(textBox, score);
    } else {
      this.modifySearchResults(textBox.title, score);
    }
  },
  addNewMaterialToSearchResults(material, score=0, message='') {
    this.searchResults.push({
      'score': score,
      'type': 'mat',
      'data': {
        'title': material.shortkey,
        'message': message, //should contain the context of the search hit
        'db_info': material
      }
    });
  },
  addNewTextBoxToSearchResults(textBox, score=0) {
    this.searchResults.push({
      'score': score,
      'type': textBox.type, //"infobox" or "warnbox"
      'data': {
        'title': textBox.title,
        'message': textBox.message,
        'is_warning': (textBox.type === 'warnbox')
      }
    });
  },
  modifySearchResults(key, score, message='') {
    const searchResults = this.searchResults.find(e => e.data.title === key);
    searchResults.score += score;
    if (message !=='') {
      searchResults.data.message += message; //This simple addition is probably not OK, but i'm unsure about multiple contexts..would be better with a list and then decide what to do with it on the frontend
    }
  },
  getSortedResults: function () {
    return this.searchResults.sort((a, b) => b.score - a.score);
  },
  reset: function () {
    this.searchResults = [];
  },
};


function getSearchManager(db) {
  //returns a searchManager object with the db field overridden by the provided database
  return { ...searchManager, db };
}

export { getSearchManager };
