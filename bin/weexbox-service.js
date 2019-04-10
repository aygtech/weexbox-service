#! /usr/bin/env node

const program = require('commander')
const debug = require('../lib/debug/debug')
const pack = require('../lib/compile/webpack').default
const run = require('../lib/run/run')

program
  .command('debug [source]')
  .description('调试')
  .action((source) => {
    debug(source)
  })

program
  .command('build <environment>')
  .description('编译')
  .action((environment) => {
    pack.build(environment)
  })

program
  .command('run <platform>')
  .description('运行')
  .action((platform) => {
    run(platform)
  })

program.parse(process.argv)
