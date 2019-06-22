#! /usr/bin/env node

const program = require('commander')
const debug = require('../lib/debug/debug')
const pack = require('../lib/compile/webpack').Compile
const run = require('../lib/run/run')

program
  .command('debug')
  .description('调试')
  .action(() => {
    debug()
  })

program
  .command('build <environment>')
  .description('编译')
  .action((environment) => {
    pack.build(environment)
  })

  program
  .command('watch <environment>')
  .description('监听')
  .action((environment) => {
    pack.watch(environment)
    run()
  })

program.parse(process.argv)
