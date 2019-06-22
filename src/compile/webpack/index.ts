import * as webpack from 'webpack'
import { Md5 } from '../update/md5'
import { Copy } from '../update/copy'
import { Ready } from '../update/ready'
import { WatchConfig } from './watch.config'
import DevelopConfig from './develop.config'
import TestConfig from './test.config'
import PreReleaseConfig from './preRelease.config'
import ReleaseConfig from './release.config'
import { emptyDirSync } from 'fs-extra'
import { Context } from '../update/context'

export class Compile {

  static build(name: string) {
    let weexConfig: any
    switch (name) {
      case 'develop':
        weexConfig = new DevelopConfig().weexConfig
        break
      case 'test':
        weexConfig = new TestConfig().weexConfig
        break
      case 'preRelease':
        weexConfig = new PreReleaseConfig().weexConfig
        break
      case 'release':
        weexConfig = new ReleaseConfig().weexConfig
        break
      default:
        break
    }
    // console.log(JSON.stringify(weexConfig))
    webpack(weexConfig, (err, stats) => {
      process.stdout.write(
        stats.toString({
          colors: true,
          modules: false,
          warnings: false,
          entrypoints: false,
          assets: false,
          hash: false,
          version: false,
          timings: false,
          builtAt: false,
        }),
      )
      if (err == null) {
        this.update(name)
      }
    })
  }

  static watch(name: string) {
    const context = new Context()
    emptyDirSync(context.distPath)
    const weexConfig = new WatchConfig(name).weexConfig
    webpack(weexConfig, (err, stats) => {
      process.stdout.write(
        stats.toString({
          colors: true,
          modules: false,
          warnings: false,
          entrypoints: false,
          assets: false,
          hash: false,
          version: false,
          timings: false,
          builtAt: false,
        }),
      )
    })
  }

  static update(name: string) {
    Md5.calculate()
    Copy.copy(name)
    Ready.ready()
  }
}
