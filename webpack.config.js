const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const UglifyJSPlugin = require('uglifyjs-webpack-plugin');

const buildPath = 'docs';

module.exports = {
  entry: ['babel-polyfill', './app.js'],
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, buildPath)
  },
  plugins: [
    new HtmlWebpackPlugin({
      filename: 'index.html',
      template: 'src/index.html',
      inject: 'head'
    }),
    new CleanWebpackPlugin(),
    new UglifyJSPlugin(),
  ],
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /(node_modules|bower_components)/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['env']
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
