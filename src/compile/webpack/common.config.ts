import * as WebpackBar from 'webpackbar'
const CleanWebpackPlugin = require('clean-webpack-plugin').default
import { Util } from '../util'
import { Context } from '../update/context'
import { vueLoader } from './vueLoader'

export class CommonConfig {
  context = new Context()
  plugins = [
    new WebpackBar({
      name: 'WeexBox',
    }),
    new CleanWebpackPlugin(),
  ]

  weexConfig = {
    mode: 'none',
    entry: Util.entries(),
    output: {
      path: this.context.distPath,
      filename: `${this.context.wwwDic}/[name].js`,
    },
    resolve: {
      extensions: ['.mjs', '.js', '.vue', '.json'],
    },
    module: {
      rules: [
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
      ],
    },
    plugins: this.plugins,
    node: this.context.nodeConfiguration,
  }
}
