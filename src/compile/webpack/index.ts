import * as webpack from 'webpack'
import Md5 from '../update/md5'
import Copy from '../update/copy'
import Ready from '../update/ready'
import WatchConfig from './watch.config'
import DevelopConfig from './develop.config'
import TestConfig from './test.config'
import PreReleaseConfig from './preRelease.config'
import ReleaseConfig from './release.config'

export default class Compile {

  static build(name: string) {
    let weexConfig: any
    switch (name) {
      case 'watch':
        weexConfig = new WatchConfig().weexConfig
        break
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
      if (err == null && name !== 'watch') {
        this.update(name)
      }
    })
  }

  static update(name: string) {
    Md5.calculate()
    Copy.copy(name)
    Ready.ready()
  }
}
