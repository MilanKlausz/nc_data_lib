'use strict';

import { merge } from 'webpack-merge';
import commonConfig from './webpack.common.config.js';
import { execSync } from 'child_process';

import { fileURLToPath } from 'url';
import { dirname, basename, join } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Function to get the repository name
function getRepoName() {
  const repoPath = execSync('git rev-parse --show-toplevel').toString().trim();
  return basename(repoPath);
 }

export default merge(commonConfig, {
  mode: 'development',
  devtool: 'inline-source-map',
  output: {
    publicPath: `/${getRepoName()}/`,
  },
  devServer: {
    static: {
      directory: join(__dirname, '../dist'),
      publicPath: `/${getRepoName()}/`,
    },
    compress: true,
    port: 9000,
    hot: true,
    open: [getRepoName() ? `/${getRepoName()}/` : '/'],
  },
});
