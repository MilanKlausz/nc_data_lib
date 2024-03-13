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
    read() {
      return this._db.allDocs({ include_docs: true });
    },
  });
});


window.app = () => {
  let searchInput = ''; //input of the search field
  let searchInProgress = false;
  let materialsToShow = []; //short list of materials to show
  let searchTextResponse = ''; //Text to indicate errors (e.g. too many or no results)

  async function filterMaterialsByName(searchText) {
    await new Promise(resolve => setTimeout(resolve, 1000));//Just for testing
    return await Alpine.store('db').read().then((result) => {
      return result.rows.map(row => row.doc).filter(el => el.key.includes(searchText));
    });
  }
  async function filterMaterialsByDumpText(searchText) {
    return await Alpine.store('db').read().then((result) => {
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
    else if (materialResults.length <= 6) {
      this.materialsToShow = materialResults;
    }
    else {
      this.searchTextResponse = "Too many results."
    }
  }

  async function handleSearchInput() {
    this.searchBegin();
    let searchResults = [];

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
  };
};
