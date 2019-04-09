#! /usr/bin/env node

const program = require('commander')
const debug = require('../lib/debugger/debug')
const pack = require('../lib/builder/webpack').default

program
  .command('debug [source]')
  .description('调试')
  .action((source) => {
    debug.run(source)
  })

program
  .command('build <environment>')
  .description('编译')
  .action((environment) => {
    pack.build(environment)
  })

program.parse(process.argv)
