const { IosRunner, AndroidRunner } = require('./index')
const fse = require('fs-extra')
const path = require('path')
const debug = require('debug')('run')
const device = require('@weex-cli/device')
const { system, logger, inquirer } = require('@weex-cli/core')

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

const run = async (platform) => {
  let spinner
  let closeSpinner = false
  const runnerOptions = {
    // jsBundleFolderPath: 'dist',
    // jsBundleEntry: 'index.js',
    projectPath: '',
    applicationId: '',
    // preCommand: 'npm run dev',
    deviceId: '',
    nativeConfig: {}
  }

  const platformChoices = [
    {
      name: 'android',
      value: 'android'
    },
    {
      name: 'ios',
      value: 'ios'
    },
    {
      name: 'all',
      value: 'all'
    },
  ]

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
    event.on(MESSAGETYPE.STATE, (state) => {
      if (state === RUNNERSTATE.START) {
        spinner = logger.spin('启动热重载服务')
      }
      else if (state === RUNNERSTATE.START_SERVER_DONE) {
        spinner.stopAndPersist({
          symbol: `${logger.colors.green(`[${logger.checkmark}]`)}`,
          text: `${logger.colors.green('启动热重载服务 - 完成')}`
        })
        spinner = logger.spin(`配置 ${logger.colors.gray('- 会花费一些时间')}`)
      }
      else if (state === RUNNERSTATE.SET_NATIVE_CONFIG_DONE) {
        spinner.stopAndPersist({
          symbol: `${logger.colors.green(`[${logger.checkmark}]`)}`,
          text: `${logger.colors.green('配置 - 完成')}`
        })
        spinner = logger.spin(`拷贝JS资源文件 ${logger.colors.gray('- 会花费一些时间')}`)
      }
      else if (state === RUNNERSTATE.COPY_JS_BUNDLE_DOEN) {
        spinner.stopAndPersist({
          symbol: `${logger.colors.green(`[${logger.checkmark}]`)}`,
          text: `${logger.colors.green('拷贝JS资源文件 - 完成')}`
        })
        spinner = logger.spin('启动监听服务')
      }
      else if (state === RUNNERSTATE.WATCH_FILE_CHANGE_DONE) {
        spinner.stopAndPersist({
          symbol: `${logger.colors.green(`[${logger.checkmark}]`)}`,
          text: `${logger.colors.green('启动监听服务 - 完成')}`
        })
        spinner = logger.spin(`打包AAPP ${logger.colors.gray('- 会花费一些时间')}\n`)
      }
      else if (state === RUNNERSTATE.BUILD_NATIVE_DONE) {
        spinner.stopAndPersist({
          symbol: `${logger.colors.green(`[${logger.checkmark}]`)}`,
          text: `${logger.colors.green('打包AAPP - 完成')}`
        })
        spinner = logger.spin(`启动APP ${logger.colors.gray('- 会花费一些时间')}`)
        closeSpinner = true
      }
      else if (state === RUNNERSTATE.INSTALL_AND_LANUNCH_APP_DONE) {
        spinner.stopAndPersist({
          symbol: `${logger.colors.green(`[${logger.checkmark}]`)}`,
          text: `${logger.colors.green('启动APP - 完成')}`
        })
      }
      if (state === RUNNERSTATE.END) {
        logger.success('所有服务已启动，开启写bug之旅吧')
      }
    })
  }

  const prepareJSBundle = async () => {
    await system.exec('npm run develop')
  }

  let nativeConfig
  let runner
  if (!platform) {
    // ask for choose platform
    let answers = await inquirer.prompt([
      {
        type: 'list',
        message: '选择你想运行的平台',
        name: 'choosePlatform',
        choices: platformChoices
      }
    ])
    platform = answers.choosePlatform
  }
  if (platform === 'android') {
    let androidConfigurationFilePath = path.resolve('android.config.json')
    let projectPath = runnerOptions.projectPath ? path.resolve(runnerOptions.projectPath) : path.resolve('platforms/android')
    let spinner = logger.spin('编译 JSBundle')
    try {
      await prepareJSBundle()
      spinner.stopAndPersist({
        symbol: `${logger.colors.green(`[${logger.checkmark}]`)}`,
        text: `${logger.colors.green('编译 JSBundle - 完成')}`
      })
    } catch (err) {
      spinner.stopAndPersist({
        symbol: `${logger.colors.red(`[${logger.xmark}]`)}`,
        text: `${logger.colors.red(err.stack || err)}`
      })
      // exist
      return
    }
    if (!runnerOptions.deviceId) {
      const androidDevice = new device.AndroidDevices()
      let androidDeviceList = await androidDevice.getList()
      if (androidDeviceList && androidDeviceList.length > 1) {
        androidDeviceList = androidDeviceList.map(device => {
          if (device.isSimulator) {
            return {
              name: `${device.name} ${device.isSimulator ? '(Simulator)' : ''}`,
              value: device.id
            }
          } else {
            return {
              name: device.name,
              value: device.id
            }
          }
        })
        let answers = await inquirer.prompt([
          {
            type: 'list',
            message: '选择设备',
            name: 'chooseDevice',
            choices: androidDeviceList
          }
        ])
        runnerOptions.deviceId = answers.chooseDevice
      } else if (androidDeviceList && androidDeviceList.length === 1) {
        runnerOptions.deviceId = androidDeviceList[0].id
        logger.log(`${logger.colors.green(`[${logger.checkmark}]`)} 使用 ${logger.colors.green(`${androidDeviceList[0].name}${androidDeviceList[0].isSimulator ? ' (Simulator)' : ''}`)}`)
      }
    }
    if (fse.existsSync(androidConfigurationFilePath)) {
      nativeConfig = await fse.readJson(androidConfigurationFilePath, { throws: false })
    }
    runner = new AndroidRunner({
      jsBundleFolderPath: path.resolve(runnerOptions.jsBundleFolderPath),
      jsBundleEntry: runnerOptions.jsBundleEntry,
      projectPath: projectPath,
      deviceId: runnerOptions.deviceId,
      applicationId: runnerOptions.applicationId || nativeConfig.AppId,
      nativeConfig
    })
    receiveEvent(runner)
    await runner.run({
      // onOutCallback: output => {
      //   // console.OUTPUT('BUILD OUTPUT:', output)
      //   if(!closeSpinner && spinner) {
      //     spinner.text = output
      //   } else {
      //     logger.write('Output', output)
      //   }
      // },
      // onErrorCallback: error => {

      // }
    })
  } else if (platform === 'ios') {
    let iosConfigurationFilePath = path.resolve('ios.config.json')
    let projectPath = runnerOptions.projectPath ? path.resolve(runnerOptions.projectPath) : path.resolve('platforms/ios')
    spinner = logger.spin('编译 JSBundle')
    
    try {
      await prepareJSBundle()
      spinner.stopAndPersist({
        symbol: `${logger.colors.green(`[${logger.checkmark}]`)}`,
        text: `${logger.colors.green('编译 JSBundle - 完成')}`
      })
    } catch (err) {
      spinner.stopAndPersist({
        symbol: `${logger.colors.red(`[${logger.xmark}]`)}`,
        text: `${logger.colors.red(err.stack || err)}`
      })
      // exist
      return
    }
    if (!runnerOptions.deviceId) {
      const iosDevice = new device.IosDevices()
      let iosDeviceList = await iosDevice.getList()
      iosDeviceList = iosDeviceList.map(device => {
        if (device.isSimulator) {
          return {
            name: `${device.name} ${device.isSimulator ? '(Simulator)' : ''}`,
            value: device.id
          }
        } else {
          return {
            name: device.name,
            value: device.id
          }
        }
      })

      let answers = await inquirer.prompt([
        {
          type: 'list',
          message: '选择设备',
          name: 'chooseDevice',
          choices: iosDeviceList
        }
      ])
      runnerOptions.deviceId = answers.chooseDevice
    }
    if (fse.existsSync(iosConfigurationFilePath)) {
      nativeConfig = await fse.readJson(iosConfigurationFilePath, { throws: false })
    }
    runner = new IosRunner({
      // jsBundleFolderPath: path.resolve(runnerOptions.jsBundleFolderPath),
      // jsBundleEntry: runnerOptions.jsBundleEntry,
      projectPath: projectPath,
      deviceId: runnerOptions.deviceId,
      applicationId: runnerOptions.applicationId || nativeConfig.AppId,
      nativeConfig
    })
    receiveEvent(runner)
    await runner.run()
  }
}

module.exports = run