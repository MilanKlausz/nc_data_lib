# nc_data_lib
Develop static website for NCrystal data library

# Local development
The first time:
- Install nvm - https://www.freecodecamp.org/news/node-version-manager-nvm-install-guide/)
- Install Node.js by runnings: `nvm instal` (it will get the node version to install from .nvmrc)
- Install the dependencies in the package.json by runnings: `npm install`
- Build and serve the app locally: `npm start`
  The app should open in your browser on the http://localhost:9000/nc_data_lib/ address.
  (The 'nc_data_lib' part is actually the directory name of your cloned repo, to mimic GH Pages address.)
  
Each time:
- If you have multiple node versions installed by nvm, run `nvm use` to set the correct version for this project.
- If you've pulled a new version of the codebase, the dependencies might have changed, so run `npm install` to
  update your node modules according to the package.json/package-lock.json files.
- Build and serve the app locally: `npm start`
  (Source files are watched. Reloading is only needed when editing the html file, editing js files trigger page reload.)

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
  
