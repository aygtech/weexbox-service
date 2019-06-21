import Runner from './base/runner'
const path = require('path')
const debug = require('debug')('run')
const { system, logger } = require('@weex-cli/core')

const MESSAGETYPE = {
  STATE: 'state',
  OUTPUT: 'outputLog',
  OUTPUTERR: 'outputError'
}

const RUNNERSTATE = {
  START: 0,
  START_SERVER_DONE: 1,
  SET_NATIVE_CONFIG_DONE: 2,
  COPY_JS_BUNDLE_DOEN: 3,
  WATCH_FILE_CHANGE_DONE: 4,
  BUILD_NATIVE_DONE: 5,
  INSTALL_AND_LANUNCH_APP_DONE: 6,
  END: 7
}

const run = async () => {
  let spinner
  let closeSpinner = false
  const runnerOptions = {
    jsBundleFolderPath: 'deploy',
    // jsBundleEntry: 'index.js',
    projectPath: '',
    applicationId: '',
    // preCommand: 'npm run dev',
    deviceId: '',
    nativeConfig: {}
  }

  const receiveEvent = (event) => {
    event.on(MESSAGETYPE.OUTPUTERR, (err) => {
      debug('Error from ADB or Xcrun: ', err)
    })
    event.on(MESSAGETYPE.OUTPUT, (log) => {
      if (!closeSpinner) {
        spinner.text = log
      } else {
        spinner.clear()
      }
    })
    event.on(MESSAGETYPE.STATE, (state, log) => {
      if (state === RUNNERSTATE.START) {
        spinner = logger.spin('启动热重载服务')
      }
      else if (state === RUNNERSTATE.START_SERVER_DONE) {
        spinner.stopAndPersist({
          symbol: `${logger.colors.green(`[${logger.checkmark}]`)}`,
          text: `${logger.colors.green(`启动热重载服务 - 完成 - ${log}`)}`
        })
        spinner = logger.spin('启动监听服务')
      }
      else if (state === RUNNERSTATE.WATCH_FILE_CHANGE_DONE) {
        spinner.stopAndPersist({
          symbol: `${logger.colors.green(`[${logger.checkmark}]`)}`,
          text: `${logger.colors.green('启动监听服务 - 完成')}`
        })
      }
      if (state === RUNNERSTATE.END) {
        logger.success('所有服务已启动，开启写bug之旅吧')
      }
    })
  }

  const prepareJSBundle = async () => {
    system.exec('npm run watch')
    await system.exec('npm run develop')
  }
  let runner

  spinner = logger.spin('编译JSBundle')
  
  try {
    await prepareJSBundle()
    spinner.stopAndPersist({
      symbol: `${logger.colors.green(`[${logger.checkmark}]`)}`,
      text: `${logger.colors.green('编译JSBundle - 完成')}`
    })
  } catch (err) {
    spinner.stopAndPersist({
      symbol: `${logger.colors.red(`[${logger.xmark}]`)}`,
      text: `${logger.colors.red(err.stack || err)}`
    })
    // exist
    return
  }

  runner = new Runner({
    jsBundleFolderPath: path.resolve(runnerOptions.jsBundleFolderPath),
  })
  receiveEvent(runner)
  await runner.run()
}

module.exports = run