const path = require('path');
const baseConfig = require('./webpack.electron.config');

const src = path.join(process.cwd(), 'src', 'electron');

module.exports = {
  ...baseConfig,
  mode: 'production',
  entry: {
    main: path.join(src, 'main.ts')
  },
  output: {
    path: path.join(process.cwd(), 'dist'),
    filename: 'index.js'
  }
};