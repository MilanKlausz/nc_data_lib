'use strict';

//TODO abstract away Alpine.store('db').getAll()

const searchManager = {
  searchResults: [],
  nameHitScore: 100,
  dumpHitScore: 10,
  separateSearchPhrases: function(searchInput) {
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
  },
  filterMaterialsByName: async function (searchText) {
    // await new Promise(resolve => setTimeout(resolve, 1000));// TODO Just for testing
    return await Alpine.store('db').getAll().then((result) => {
      return result.filter(el => el.key.toLowerCase().includes(searchText.toLowerCase()));
    });
  },
  filterMaterialsByDumpText: async function (searchText) {
    return await Alpine.store('db').getAll().then((result) => {
      return result.filter(el => el.dump.toLowerCase().includes(searchText.toLowerCase()));
    });
  },
  addMaterialToSearchResults: function (material) {
    if (!this.searchResults.some(m => m.key === material.shortkey)) {
      this.searchResults.push({
        'key': material.shortkey,
        'material': material,
        'score': 0,
      });
    }
  },
  modifyScoreOfSearchResult: function (key, score) {
    this.searchResults.forEach(res => {
      if (res.key === key) {
        res.score += score;
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

module.exports = { searchManager };
