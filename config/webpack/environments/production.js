'use strict';

module.exports = function(_path) {
  return {
    context: _path,
    debug: false,
    devtool: 'cheap-inline-module-source-map',
    output: {
      publicPath: '/',
      filename: '[name].[chunkhash].js'
    }
  }
}
