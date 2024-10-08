# nc_data_lib
Develop static website for NCrystal data library

# Local development
The first time:
- Install nvm - https://www.freecodecamp.org/news/node-version-manager-nvm-install-guide/)
- Install Node.js by runnings: `nvm instal` (it will get the node version to install from .nvmrc)
- Install Node dependencies in the package.json by runnings: `npm install`
- Install other dependencies with a conda environment: `conda env create -f conda-env.yml`
- Activate the conda environment: `conda activate nc_data_lib`
- Generate the material database by running `npm run generate-data`
- Build and serve the app locally: `npm start`
  The app should open in your browser on the http://localhost:9000/nc_data_lib/ address.
  (The 'nc_data_lib' part is actually the directory name of your cloned repo, to mimic GH Pages address.)
  
Each time:
- If you have multiple node versions installed by nvm, run `nvm use` to set the correct version for this project.
- If you've pulled a new version of the codebase, the dependencies might have changed, so run `npm install` to
  update your node modules according to the package.json/package-lock.json files.
- Build and serve the app locally: `npm start`
  (Source files are watched. Reloading is only needed when editing the html file, editing js files trigger page reload.)
- If you want to re-generate the database, or do other Python related development, you also have to activate the conda environment:
  `conda activate nc_data_lib`

If the database material format is changed:
- The database file is being generated with the *database/generate_data.py* script, which is invoked
  through the *scripts/run_generate_data.js* script by the `npm run generate-data` command. The 
  *generate_data.py* script uses Protocol Buffer for serializing the material information as structured data.
  This relies on the structure being defined in the database/material_database.proto file, that describes 
  each field. This .proto file is used to generate a python and a js module for reading/writing such data. 
  This can be done by the `npm run generate-proto-python` and `npm run generate-proto-js` commands, or in a
  single step by `npm run generate-proto`. These commands will create the *database/material_database_pb2.py*
  and *src/material_database_decoder.js* modules that are used to create/read (encode/decode) the protobuffer
  file containing the material database.
- In case the material format is changed (e.g. a new field is added to all the materials), the
  *material_database.proto* file needs to be edited accordingly, and the `npm run generate-proto` command has 
  to be executed.
- For unit testing, sample material data can be found in the *test-helpers/material-data.js* file. In case the
  material format is changed, these dummy materials should be updated accordingly.
- Pre-made test data (test-helpers/test_db.pb.gz) is used for testing the Python query interface. In order to
  update the test data as well, the *scripts/generate_test_data.js* script has to be executed by invoking the 
  `npm run generate-test-data` command. The script will use test data from *test-helpers/material-data.js* and
  output a new *test-helpers/test_db.pb.gz* file.

If the Node.js version is to be updated:
- The Node version is stored in two places: in the *.nvmrc* file (used by nvm - Node Version Manager) and in the *"engines" : "node"* section of the *package.json* file (used by npm - Node Package Manager). They should be edited simultaneously, keeping in mind that the LTS versions of Node are the ones starting with an even number (possible way to check available versions: `nvm ls-remote`).
- The `nvm install` command should then be invoked to install the new version of Node.
- After a version upgrade, other developers are likely to encounter a warning including *"npm warn EBADENGINE Unsupported engine (...)"* when trying to invoke `npm install` after pulling the new version of the code. They will need install the new version of Node with the `nvm install` command.
- If not used for other projects, one can uninstall the previous version(s) of Node (see installed version with `nvm ls`) by `nvm uninstall <version>`.

# The current stack

- **Node Version Manager (NVM)**:
  A command-line utility that simplifies the management of multiple Node.js versions on a single machine, allowing developers to switch between different Node.js versions as needed for various projects, ensuring compatibility and avoiding conflicts.
  The Node.js version to use for the project is stored in the `.nvmrc` file (that is also used in the publishing GH workflow).
  
- **Node.js**:
  A JavaScript runtime built on Chrome’s V8 JavaScript engine, that makes it possible to use JavaScript outside of a browser environment (e.g., in the terminal). We are using it for building our app using node modules.
  (It also allows JavaScript to be used as a server-side language, but as GitHub Pages is a static site hosting service, we don't have a backend logic.)
  *link*: https://nodejs.org/en/about/

- **npm (Node Package Manager)**:
  Package manager for Node.js - manages and installs JS dependencies, can also run scrips defined in package.json.
  *link*: https://www.npmjs.com
  *link2*: https://www.w3schools.com/whatis/whatis_npm.asp
  
- **Webpack**:
  *short description*: "At its core, webpack is a static module bundler for modern JavaScript applications.
                        When webpack processes your application, it internally builds a dependency graph which maps every module your project
                        needs and generates one or more bundles."
  *purpose*: Packs all front-end resources into one JS file (+handles dependecies avoiding duplication) + trakcs changes in files on the client side (dev)

- **Babel**
  *short description*: "It takes your modern JavaScript code and transpiles it into an older version that is widely supported. This process allows developers to leverage the latest language features while ensuring broader compatibility."
  *link*: https://babeljs.io/

- **Jasmine**
  A popular JavaScript behavior-driven development (BDD) framework used for unit testing JavaScript applications, providing utilities for running automated tests on both synchronous and asynchronous code. 
  *link*: https://jasmine.github.io/

- **Alpine.js**:
  A lightweight JavaScript framework that enables the creation of interactive web applications with minimal code.
  It uses directives in HTML to control DOM elements based on data, improving code readability and reducing the need for JS manipulations.
  Supports reactivity for data binding and querying, allowing changes in data to be reflected throughout the application.
  Handles various events such as clicks, mouse movements, and key presses (and it allows for the creation of custom events).
  *link*: https://alpinejs.dev/

- **PouchDB**:
  A JavaScript database that enables applications to store data locally and synchronize it with CouchDB and compatible servers, ensuring data is accessible offline and up-to-date across devices. Currently we are only using it as a local database in the browser (we don't have a central db runnig on a server).
  *link*: https://pouchdb.com/

- **Pico CSS**:
  A minimal CSS framework designed for styling semantic HTML, offering a lightweight and easy-to-use solution for creating clean and simple web pages.
  It directly styles semantic HTML tags, making the elements look nice by default.
  Natively scales font sizes and spacings with screen widths, resulting in a consistent and elegant look across devices.
  *link*: https://picocss.com/
  
- **Protocol Buffers**:
  A language-neutral, platform-neutral extensible mechanisms for serializing structured data.
  This is the format used for distributing the material database (it is also gzipped).
  *link*: https://protobuf.dev/
