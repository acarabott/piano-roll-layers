const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CleanWebpackPlugin = require('clean-webpack-plugin');
const buildPath = 'dist';

module.exports = {
  entry: ['babel-polyfill', './app.js'],
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, buildPath)
  },
  plugins: [
    new HtmlWebpackPlugin({
      filename: 'index.html',
      template: 'index.html',
      inject: 'head'
    }),
    new CleanWebpackPlugin([buildPath]),
  ],

  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /(node_modules|bower_components)/,
        use: {
          loader: 'babel-loader',
          options: {
            // presets: ['@babel/preset-env']
          }
        }
      },
      {
        test: /\.css$/,
        use: [
          'style-loader',
          'css-loader'
        ]
      },
      {
        test: /\.html$/,
        enforce: 'pre',
        use: [
          {
            loader: 'html-loader'
          },
          {
            loader: 'webpack-strip-blocks',
            options: {
                blocks: ['REMOVE'],
                start: '<!--',
                end: '-->'
            }
          }
        ]
      }
    ]
  }
};
