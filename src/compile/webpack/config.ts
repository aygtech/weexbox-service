import * as WebpackBar from 'webpackbar'
import * as webpack from 'webpack'
import { CleanWebpackPlugin } from 'clean-webpack-plugin'
import { Util } from '../util'
import { Context } from '../update/context'
import { vueLoader } from './vueLoader'
import { UglifyJsPlugin } from 'uglifyjs-webpack-plugin'

export class Config {

  weexConfig: any

  constructor(option?: any) {
    const context = new Context()
    const weexboxConfig = require(context.weexboxConfigPath)
    const env: string = option.env
    const watch: boolean = option.watch

    const watchOptions = {
      aggregateTimeout: 1000,
      ignored: /node_modules/,
    }

    const mode = 'none'
    const cache = true
    const entry = Util.entries()
    const output = {
      path: context.distPath,
      filename: `${context.wwwDic}/[name].js`,
    }
    const resolve = {
      extensions: ['.mjs', '.js', '.vue', '.json'],
    }

    const plugins = []
    if (watch === false) {
      plugins.push(new WebpackBar({
        name: 'WeexBox',
      }))
    }
    plugins.push(new CleanWebpackPlugin(), new webpack.DefinePlugin({ 'process.env.NODE_ENV': JSON.stringify(env) }))
    if (env.toLowerCase().includes('release')) {
      plugins.push(new UglifyJsPlugin({
        parallel: true,
      }))
    }
    if (watch === false) {
      plugins.push(new webpack.BannerPlugin({
        banner: '// { "framework": "Vue"} \n',
        raw: true,
        exclude: 'Vue',
      }))
    }

    const rules = [
      {
        test: /\.vue(\?[^?]+)?$/,
        use: [
          {
            loader: 'weex-loader',
            options: vueLoader({ useVue: false }),
          },
        ],
      },
      {
        test: /\.js$/,
        use: [
          {
            loader: 'babel-loader',
          },
        ],
      },
      {
        test: /\.(png|jpg|gif)$/,
        use: [
          {
            loader: 'file-loader',
            options: {
              publicPath: weexboxConfig[env].imagePublicPath + '/static/',
              name: '[name]_[hash].[ext]',
              outputPath: context.staticDir,
            },
          },
        ],
      },
    ]

    const module = { rules }
    const node = context.nodeConfiguration

    this.weexConfig = {
      watch,
      watchOptions,
      mode,
      cache,
      entry,
      output,
      resolve,
      plugins,
      module,
      node,
    }
  }
}
