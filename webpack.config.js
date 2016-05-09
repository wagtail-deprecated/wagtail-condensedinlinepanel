var path = require('path');
var webpack = require('webpack');

module.exports = {
    entry: './condensedinlinepanel/static/condensedinlinepanel/condensedinlinepanel.jsx',
    output: {
      libraryTarget: 'var',
      library: 'CondensedInlinePanel',
      path: 'condensedinlinepanel/static/condensedinlinepanel/compiled/',
      filename: 'condensedinlinepanel.bundle.js'
    },
    module: {
        loaders: [
            {
                test: /.jsx?$/,
                loader: 'babel-loader',
                exclude: /node_modules/,
                query: {
                    presets: ['es2015', 'react']
                }
            }
        ]
    }
}
