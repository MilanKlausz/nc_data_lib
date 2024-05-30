'use strict';

const { Alpine } = require('alpinejs');
window.Alpine = Alpine
const { dbStore } = require('./db');
const { searchManager } = require('./search_manager');

document.addEventListener('alpine:init', () => {
  Alpine.store('db', dbStore);
});

document.addEventListener('alpine:init', () => {
  Alpine.data('urlHandler', () => ({
    materialSafeKey: '',
    material: '',
    async init() {
      const urlParams = new URLSearchParams(window.location.search);
      const materialKey = urlParams.get('material');
      if (materialKey) {
        this.materialSafeKey = materialKey;
        this.material = await this.getMaterial(this.materialSafeKey);
      };
      window.addEventListener('popstate', async () => {
        const urlParams = new URLSearchParams(window.location.search);
        const materialKey = urlParams.get('material');
        if (materialKey) {
          this.materialSafeKey = materialKey;
          this.material = await this.getMaterial(this.materialSafeKey);
          //TODO add error handling (material not found)
        }
        else {
          this.materialSafeKey = '';
          this.material = '';
        }
      });
    },
    async getMaterial(materialSafeKey) {
      return await Alpine.store('db').getBySafeKey(materialSafeKey);
    },
    getMaterialUrlParam(key) {
      return key ? "?" + new URLSearchParams({ 'material': key }).toString() : window.location.pathname;
    },
    updateURL(materialSafeKey) {
      history.pushState(null, null, this.getMaterialUrlParam(materialSafeKey));
      window.dispatchEvent(new PopStateEvent('popstate')); //trigger event that can be listened to
    },
  }));
});

// TODO should I replace 'window.searchApp = () => {'
// with the following?
// document.addEventListener('alpine:init', () => {
// 	Alpine.data('searchApp', () => ({
// }))
// })

var defaultDisplayedResultsNumber = 10; //number of search results to display by default

window.searchApp = () => {
  let displayedResultsNumber = defaultDisplayedResultsNumber; //number of search results to display
  let searchInput = ''; //input of the search field
  let searchInProgress = false;
  let materialsToShow = []; //short list of materials to show
  let searchTextResponse = ''; //Text to indicate errors (e.g. too many or no results)
  let suggestion = '';
  function searchBegin() {
    this.materialsToShow = [];
    this.searchInProgress = true;
    this.displayedResultsNumber = defaultDisplayedResultsNumber;
  }
  function searchEnd() {
    this.searchInProgress = false;
  }

  function showSearchResults(materialResults) {
    console.log(materialResults)
    this.searchInProgress = false;
    this.searchTextResponse = '';
    const goodScoreThreshold = 100; //TODO move

    if (materialResults.length == 0) {
      this.searchTextResponse = "No materials found."
    }
    else {
      const goodResultsNumber = materialResults.filter(res => res.score > goodScoreThreshold).length;
      if (goodResultsNumber > 0) {
        this.displayedResultsNumber = goodResultsNumber;
      }
      this.materialsToShow = materialResults.map(res => res.material);
    }
  }

  function peakNcmatHeader(fullHeader) {
    let shortHeaderHtml = '';
    if (fullHeader.length <= 10)
      shortHeaderHtml = fullHeader.join('<br>');
    else {
      shortHeaderHtml = fullHeader.slice(0, 9).join('<br>') + '<br>(...)';
    }
    return shortHeaderHtml;
  }

  function handleSuggestion(searchPhrases) {
    if (searchPhrases.some(phrase => phrase.toLowerCase().includes('gas'))) {
      this.suggestion = `If you are interested in defining gas mixtures, you can read more about how to do it easily in the <a href='https://github.com/mctools/ncrystal/wiki/Announcement-Release3.2.0'>Announcement of Release3.2.0</a>.`;
      console.log('found GAS in input', suggestion);
    }
    else {
      this.suggestion = '';
    }
  }

  async function handleSearchInput() {
    this.searchBegin();
    searchManager.reset();
    if (/\S/.test(this.searchInput)) { //non-whitespace character is required in the input
      const searchPhrases = searchManager.separateSearchPhrases(this.searchInput);
      console.log('searchPhrases', searchPhrases);
      this.handleSuggestion(searchPhrases);

      await searchManager.processSearchPhrases(searchPhrases);

      this.showSearchResults(searchManager.getSortedResults());
    }
    this.searchEnd();
  }

  return {
    searchInput,
    searchTextResponse,
    searchInProgress,
    materialsToShow,
    handleSearchInput,
    searchBegin,
    searchEnd,
    showSearchResults,
    peakNcmatHeader,
    suggestion,
    handleSuggestion,
    displayedResultsNumber
  };
};


document.addEventListener('alpine:init', () => {
  Alpine.data('materialPage', () => ({
  }));
});

Alpine.start()
