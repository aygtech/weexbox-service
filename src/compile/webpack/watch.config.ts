import * as webpackMerge from 'webpack-merge'
import DevelopConfig from './develop.config'

export default class WatchConfig {
  weexConfig = {
    watch: true,
    watchOptions: {
      aggregateTimeout: 1000,
      ignored: /node_modules/,
    },
  }
  constructor() {
    this.weexConfig = webpackMerge(this.weexConfig, new DevelopConfig().weexConfig)
  }
}
