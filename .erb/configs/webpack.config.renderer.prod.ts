/**
 * Build config for electron renderer process
 */
import CssMinimizerPlugin from 'css-minimizer-webpack-plugin';
import DtsBundleWebpack from 'dts-bundle-webpack';
import { writeFileSync } from 'fs';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import MiniCssExtractPlugin from 'mini-css-extract-plugin';
import path from 'path';
import TerserPlugin from 'terser-webpack-plugin';
import * as TJS from 'typescript-json-schema';
import webpack from 'webpack';
import { BundleAnalyzerPlugin } from 'webpack-bundle-analyzer';
import { merge } from 'webpack-merge';
import checkNodeEnv from '../scripts/check-node-env';
import deleteSourceMaps from '../scripts/delete-source-maps';
import baseConfig from './webpack.config.base';
import webpackPaths from './webpack.paths';

class GenerateJsonSchemaPlugin {
  constructor(
    private options: {
      inFile: string;
      outFile: string;
      type: string;
      workingDirectory: string;
    },
  ) {}

  apply(compiler: any) {
    compiler.hooks.beforeCompile.tap('GenerateJsonSchemaPlugin', () => {
      const { inFile, outFile, type, workingDirectory } = this.options;
      const program = TJS.getProgramFromFiles(
        [inFile],
        {
          strictNullChecks: true,
        },
        workingDirectory,
      );
      const schema = TJS.generateSchema(program, type, {
        required: true,
        noExtraProps: true,
        aliasRef: true,
      });
      writeFileSync(outFile, JSON.stringify(schema, null, 2));
    });
  }
}

checkNodeEnv('production');
deleteSourceMaps();

const devtoolsConfig =
  process.env.DEBUG_PROD === 'true'
    ? {
        devtool: 'source-map',
      }
    : {};

const configuration: webpack.Configuration = {
  ...devtoolsConfig,

  mode: 'production',

  target: ['web', 'electron-renderer'],

  entry: [
    'core-js',
    'regenerator-runtime/runtime',
    path.join(webpackPaths.srcRendererPath, 'index.tsx'),
  ],

  output: {
    path: webpackPaths.distRendererPath,
    publicPath: './',
    filename: 'renderer.js',
    library: {
      type: 'umd',
    },
  },

  module: {
    rules: [
      {
        test: /\.s?(a|c)ss$/,
        use: [
          MiniCssExtractPlugin.loader,
          {
            loader: 'css-loader',
            options: {
              modules: true,
              sourceMap: true,
              importLoaders: 1,
            },
          },
          'sass-loader',
        ],
        include: /\.module\.s?(c|a)ss$/,
      },
      {
        test: /\.s?(a|c)ss$/,
        use: [MiniCssExtractPlugin.loader, 'css-loader', 'sass-loader'],
        exclude: /\.module\.s?(c|a)ss$/,
      },
      // Fonts
      {
        test: /\.(woff|woff2|eot|ttf|otf)$/i,
        type: 'asset/resource',
      },
      // Images
      {
        test: /\.(png|svg|jpg|jpeg|gif)$/i,
        type: 'asset/resource',
      },
    ],
  },

  optimization: {
    minimize: true,
    minimizer: [
      new TerserPlugin({
        parallel: true,
      }),
      new CssMinimizerPlugin(),
    ],
  },

  plugins: [
    /**
     * Create global constants which can be configured at compile time.
     *
     * Useful for allowing different behaviour between development builds and
     * release builds
     *
     * NODE_ENV should be production so that modules do not perform certain
     * development checks
     */
    new webpack.EnvironmentPlugin({
      NODE_ENV: 'production',
      DEBUG_PROD: false,
    }),

    new MiniCssExtractPlugin({
      filename: 'style.css',
    }),

    new BundleAnalyzerPlugin({
      analyzerMode: process.env.ANALYZE === 'true' ? 'server' : 'disabled',
    }),

    new HtmlWebpackPlugin({
      filename: 'index.html',
      template: path.join(webpackPaths.srcRendererPath, 'index.ejs'),
      minify: {
        collapseWhitespace: true,
        removeAttributeQuotes: true,
        removeComments: true,
      },
      isBrowser: false,
      isDevelopment: process.env.NODE_ENV !== 'production',
    }),

    new DtsBundleWebpack({
      name: 'types',
      main: path.join(webpackPaths.srcPath, 'mods/types.d.ts'),
      baseDir: path.join(webpackPaths.releasePath, 'build'),
      verbose: false,
      externals: true,
    }),

    new GenerateJsonSchemaPlugin({
      inFile: path.join(webpackPaths.srcPath, 'bridge/ModConfig.d.ts'),
      outFile: path.join(
        webpackPaths.releasePath,
        'build',
        'config-schema.json',
      ),
      type: 'ModConfig',
      workingDirectory: path.resolve(webpackPaths.rootPath),
    }),
  ],
};

export default merge(baseConfig, configuration);
