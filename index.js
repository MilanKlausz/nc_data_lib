document.addEventListener('alpine:init', () => {
  // Define the store
  Alpine.store('db', {
    _db: null,
    init() {
      this._db = new PouchDB('ncrystal_db');
      this._db.info().then((result) => {
        if (result.doc_count === 0) {
          // If empty, fetch and populate the database
          return fetch('autogen_db/db.json')
            .then(response => response.json())
            .then(data => this._db.bulkDocs(data.map((material, index) => ({ _id: index.toString(), ...material }))))
            .then(() => this._db.allDocs({ include_docs: true }));
        } else {
          return this._db.allDocs({ include_docs: true });
        }
      }).catch(function (err) {
        console.error(err);
      });
    },
    getAll() {
      return this._db.allDocs({ include_docs: true });
    },
    async getBySafeKey(safeKey) {
      return await this._db.allDocs({ include_docs: true }).then((result) => { //TODO refactor to proper db query?
        return result.rows.map(row => row.doc).filter(el => el.safekey === safeKey)[0];
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
    updateURL(materialSafeKey) {
      let params = new URLSearchParams();
      params.set('material', materialSafeKey);
      history.pushState(null, null, materialSafeKey ? "?"+params.toString(): '/');
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
window.searchApp = () => {
  let searchInput = ''; //input of the search field
  let searchInProgress = false;
  let materialsToShow = []; //short list of materials to show
  let searchTextResponse = ''; //Text to indicate errors (e.g. too many or no results)
  let suggestion = '';

  async function filterMaterialsByName(searchText) {
    await new Promise(resolve => setTimeout(resolve, 1000));//Just for testing
    return await Alpine.store('db').getAll().then((result) => {
      return result.rows.map(row => row.doc).filter(el => el.key.includes(searchText));
    });
  }
  async function filterMaterialsByDumpText(searchText) {
    return await Alpine.store('db').getAll().then((result) => {
      return result.rows.map(row => row.doc).filter(el => el.dump.includes(searchText));
    });
  }

  function searchBegin() {
    this.materialsToShow = [];
    this.searchInProgress = true;
  }
  function searchEnd() {
    this.searchInProgress = false;
    //TODO handle 'no results' here?
  }

  function showSearchResults(materialResults) {
    // console.log(materialResults)
    this.searchInProgress = false;
    this.searchTextResponse = '';

    if (materialResults.length == 0) {
      this.searchTextResponse = "No materials found."
    }
    else if (materialResults.length <= 10) {
      this.materialsToShow = materialResults;
    }
    else {
      this.searchTextResponse = "Too many results."
    }
  }

  function peakNcmatHeader(fullHeader) {
    let shortHeaderHtml = '';
    if(fullHeader.length <= 10)
      shortHeaderHtml = fullHeader.join('<br>');
    else{
      shortHeaderHtml = fullHeader.slice(0, 9).join('<br>') + '<br>(...)';
    }
    return shortHeaderHtml;
  }

  function handleSuggestion(searchInput) {
    if(searchInput.includes('gas')){
      this.suggestion = `If you are interested in defining gas mixtures, you can read more about how to do it easily in the <a href='https://github.com/mctools/ncrystal/wiki/Announcement-Release3.2.0'>Announcement of Release3.2.0</a>.`;
      console.log('found GAS in input', suggestion);
    }
    else{
      this.suggestion='';
    }
  }

  async function handleSearchInput() {
    this.searchBegin();
    let searchResults = [];

    this.handleSuggestion(this.searchInput);

    const filteredByName = await filterMaterialsByName(this.searchInput);
    filteredByName.forEach(mat => { !(searchResults.some(m => m.shortkey === mat.shortkey)) && searchResults.push(mat) });

    let filteredByDumpText = await filterMaterialsByDumpText(this.searchInput);
    filteredByDumpText.forEach(mat => { !(searchResults.some(m => m.shortkey === mat.shortkey)) && searchResults.push(mat) });

    this.showSearchResults(searchResults);
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
  };
};


document.addEventListener('alpine:init', () => {
	Alpine.data('materialPage', () => ({
  }));
});
