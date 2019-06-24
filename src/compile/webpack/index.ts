import * as webpack from 'webpack'
import { Md5 } from '../update/md5'
import { Copy } from '../update/copy'
import { Ready } from '../update/ready'
import { emptyDirSync } from 'fs-extra'
import { Context } from '../update/context'
import { Config } from './config'

export class Compile {

  static build(name: string) {
    const weexConfig = new Config({env: name, watch: false}).weexConfig
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
    const weexConfig = new Config({env: name, watch: true}).weexConfig
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
