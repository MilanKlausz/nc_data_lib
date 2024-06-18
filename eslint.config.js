import globals from "globals";
import pluginJs from "@eslint/js";

export default [
  {
    ignores: ["**/src/material_database_decoder.js"], //autogenerated file
  },
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.jasmine,
      }
    },
    rules: {
      'eol-last': 'warn',
      eqeqeq: 'warn',
      "indent": ["warn", 2, { SwitchCase: 1 }],
      'keyword-spacing': ['warn'],
      'no-async-promise-executor': 'off',
      'no-console': 'off',
      'object-curly-spacing': ['warn', 'always'],
      "no-unused-vars": ["warn", {
        "argsIgnorePattern": "^_", //ignore variables named '_'
        "ignoreRestSiblings": true //ignore unused vars in object destructuring
      }],
      quotes: ['warn', 'single', { "avoidEscape": true, "allowTemplateLiterals": true }],
      semi: ['warn', 'always'],
      'space-before-blocks': 'warn',
    }
  },
  pluginJs.configs.recommended,
];