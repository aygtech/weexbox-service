import * as webpackMerge from 'webpack-merge'

export class WatchConfig {
  weexConfig = {
    watch: true,
    watchOptions: {
      aggregateTimeout: 1000,
      ignored: /node_modules/,
    },
  }
  constructor(name: string) {
    const Config = require(`./${name}.config`).default
    this.weexConfig = webpackMerge(this.weexConfig, new Config().weexConfig)
  }
}
