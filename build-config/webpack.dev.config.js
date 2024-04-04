'use strict';

const path = require('path');
const { merge } = require('webpack-merge');
const commonConfig = require('./webpack.common.config');
const { execSync } = require('child_process');

// Function to get the repository name
function getRepoName() {
  const repoPath = execSync('git rev-parse --show-toplevel').toString().trim();
  return path.basename(repoPath);
 }

module.exports = merge(commonConfig, {
  mode: 'development',
  devtool: 'inline-source-map',
  devServer: {
    static: {
      directory: path.join(__dirname, '../dist'),
      publicPath: `/${getRepoName()}/`,
    },
    compress: true,
    port: 9000,
    hot: true,
    open: [getRepoName() ? `/${getRepoName()}/` : '/'],
  },
});
