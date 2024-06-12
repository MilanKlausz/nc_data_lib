'use strict';

import { Alpine } from 'alpinejs';
window.Alpine = Alpine
import { dbStore } from './db.js';
import { searchManager } from './search_manager.js';

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
  let searchResultsToShow = [];
  let searchTextResponse = ''; //Text to indicate errors (e.g. too many or no results)
  function searchBegin() {
    this.searchResultsToShow = [];
    this.searchInProgress = true;
    this.displayedResultsNumber = defaultDisplayedResultsNumber;
  }
  function searchEnd() {
    this.searchInProgress = false;
  }

  function showSearchResults(searchResults) {
    console.log(searchResults)
    this.searchInProgress = false;
    this.searchTextResponse = '';
    const goodScoreThreshold = 100; //TODO move

    if (searchResults.length == 0) {
      this.searchTextResponse = "No materials found."
    }
    else {
      const goodResultsNumber = searchResults.filter(res => res.score > goodScoreThreshold).length;
      if (goodResultsNumber > 0) {
        this.displayedResultsNumber = goodResultsNumber;
      }
      this.searchResultsToShow = searchResults.map(res => res.entry);
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

  async function handleSearchInput() {
    this.searchBegin();
    searchManager.reset();
    this.showSearchResults(await searchManager.performQuery(this.searchInput));
    this.searchEnd();
  }

  return {
    searchInput,
    searchTextResponse,
    searchInProgress,
    searchResultsToShow,
    handleSearchInput,
    searchBegin,
    searchEnd,
    showSearchResults,
    peakNcmatHeader,
    displayedResultsNumber
  };
};


document.addEventListener('alpine:init', () => {
  Alpine.data('materialPage', () => ({
  }));
});

Alpine.start()
