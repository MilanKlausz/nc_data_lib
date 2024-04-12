'use strict';

import PouchDB from 'pouchdb';
import Alpine from 'alpinejs'
window.Alpine = Alpine

async function generateChecksum(fileUrl) {
  // Fetch the file
  const response = await fetch(fileUrl);
  const fileContent = await response.text();

  // Encode the file content as UTF-8
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(fileContent);

  // Generate the SHA-256 hash
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', dataBuffer);

  // Convert the hash to a hexadecimal string
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  return hashHex;
 }

document.addEventListener('alpine:init', () => {
  // Define the store
  Alpine.store('db', {
    _db: null,
    init() {
      this._db = new PouchDB('ncrystal_db');
      this._db.info().then((result) => {
        if (result.doc_count === 0) { // If empty, fetch and populate the database
          return this.populateDatabase();
        } else { // Check if the database needs to be updated
          console.log("Database exist, checking if it needs to be updated.");
          return this.checkAndUpdateDatabase();
        }
      }).catch(function (err) {
        console.error(err);
      });
    },
    populateDatabase() {
      // Fetch the db.json file and its checksum
      return fetch('autogen_db/db.json')
        .then(response => response.json())
        .then(data => {
          // Generate the checksum for the fetched db.json
          return generateChecksum('autogen_db/db.json')
          .then(checksum => {
            console.log("new checksum is generated:", checksum);
            // Store the checksum in the database
            return this._db.put({ _id: 'versionInfo', checksum: checksum })
            .then(() => {
              // Populate the database
              console.log("Populate database");
              return this._db.bulkDocs(data.map((material, index) => ({ _id: index.toString(), ...material })))
                .then(() => this._db.allDocs({ include_docs: true }));
            });
          });
        });
    },
    checkAndUpdateDatabase() {
      // Fetch the versionInfo document
      return this._db.get('versionInfo').then(versionInfo => {
        // Generate the current checksum for the db.json file
        return generateChecksum('autogen_db/db.json').then(currentChecksum => {
          // Compare the stored checksum with the current checksum
          if (versionInfo.checksum !== currentChecksum) {
            console.log("different checksum, clearing the db and repopulating it");
            // If different, clear the database and repopulate
            return this._db.destroy().then(() => {
              this._db = new PouchDB('ncrystal_db');
              return this.populateDatabase();
            });
          } else {
            console.log("checksum is the same, no need to update")
            // If the same, just fetch all documents
            return this._db.allDocs({ include_docs: true });
          }
        });
      }).catch(err => {
        if (err.name === 'not_found') {
          // If versionInfo document does not exist, populate the database
          return this.populateDatabase();
        } else {
          console.error(err);
        }
      });
    },
    async getAll() {
      return await this._db.allDocs({ include_docs: true }).then((result) => {
        return result.rows.map(row => row.doc).filter(el => 'safekey' in el); //exclude the versionInfo document storing the db checksum
      });
    },
    async getBySafeKey(safeKey) {
      return await this._db.allDocs({ include_docs: true }).then((result) => { //TODO refactor to proper db query?
        return result.rows.map(row => row.doc).filter(el => 'safekey' in el && el.safekey === safeKey)[0];
      });
    },
  });
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

  async function filterMaterialsByName(searchText) {
    // await new Promise(resolve => setTimeout(resolve, 1000));// TODO Just for testing
    return await Alpine.store('db').getAll().then((result) => {
      return result.filter(el => el.key.toLowerCase().includes(searchText.toLowerCase()));
    });
  }
  async function filterMaterialsByDumpText(searchText) {
    return await Alpine.store('db').getAll().then((result) => {
      return result.filter(el => el.dump.toLowerCase().includes(searchText.toLowerCase()));
    });
  }

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

  let searchResultsManager = {
    searchResults: [],
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
    }
  };
  //Add scores to the searchResultsManager?
  const nameHitScore = 100;
  const dumpHitScore = 10;

  //Example: keyword1 "double quoted keyphrase" 'single quoted keyphrase2' keyword3's, keyword4,keyword5
  function separateSearchPhrases(searchInput) {
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
  }

  async function handleSearchInput() {
    this.searchBegin();
    searchResultsManager.reset();
    if (/\S/.test(this.searchInput)) { //non-whitespace character is required in the input
      const searchPhrases = separateSearchPhrases(this.searchInput);
      console.log('searchPhrases', searchPhrases);
      this.handleSuggestion(searchPhrases);

      for (const phrase of searchPhrases) {
        const filteredByName = await filterMaterialsByName(phrase);
        filteredByName.forEach(mat => {
          searchResultsManager.addMaterialToSearchResults(mat);
          searchResultsManager.modifyScoreOfSearchResult(mat.shortkey, nameHitScore);
        });

        const filteredByDumpText = await filterMaterialsByDumpText(phrase);
        filteredByDumpText.forEach(mat => {
          searchResultsManager.addMaterialToSearchResults(mat);
          searchResultsManager.modifyScoreOfSearchResult(mat.shortkey, dumpHitScore);
        });
      }

      this.showSearchResults(searchResultsManager.getSortedResults());
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
