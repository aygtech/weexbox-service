const { IosRunner, AndroidRunner } = require('./index')
const fse = require('fs-extra')
const path = require('path')
const debug = require('debug')('run')
const inquirer = require('inquirer')
const device = require('@weex-cli/device')
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

const run = async (platform) => {
  let spinner
  let closeSpinner = false
  const runnerOptions = {
    jsBundleFolderPath: 'dist',
    jsBundleEntry: 'index.js',
    projectPath: '',
    applicationId: '',
    preCommand: 'npm run dev',
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
          text: `${logger.colors.green('Start hotreload server done')}`
        })
        spinner = logger.spin(`Start setting native config ${logger.colors.gray('- this may take a few seconds')}`)
        spinner.succeed('完成')
        spinner.start('开始本地配置 - 会花费一些时间')
      }
      else if (state === RUNNERSTATE.SET_NATIVE_CONFIG_DONE) {
        spinner.succeed('完成')
        spinner.start('拷贝JS资源文件 - 会花费一些时间')
      }
      else if (state === RUNNERSTATE.COPY_JS_BUNDLE_DOEN) {
        spinner.succeed('完成')
        spinner.start('启动监听服务')
      }
      else if (state === RUNNERSTATE.WATCH_FILE_CHANGE_DONE) {
        spinner.succeed('完成')
        spinner.start('打包APP - 会花费一些时间')
      }
      else if (state === RUNNERSTATE.BUILD_NATIVE_DONE) {
        spinner.succeed('完成')
        spinner.start('启动APP - 会花费一些时间')
        closeSpinner = true
      }
      else if (state === RUNNERSTATE.INSTALL_AND_LANUNCH_APP_DONE) {
        spinner.succeed('完成')
      }
      if (state === RUNNERSTATE.END) {
        spinner.succeed('所有服务已启动，开启写bug之旅吧')
      }
    })
  }

  const prepareJSBundle = async () => {
    system.exec('npm run develop')
    return
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
    spinner.start('编译 JSBundle...')
    try {
      await prepareJSBundle()
      spinner.succeed('完成')
    } catch (err) {
      spinner.fail(err.stack || err)
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
        spinner.succeed(`使用${androidDeviceList[0].name}${androidDeviceList[0].isSimulator ? ' (Simulator)' : ''}`)
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
    spinner.start('编译 JSBundle...')
    try {
      await prepareJSBundle()
      spinner.succeed('完成')
    } catch (err) {
      spinner.fail(err.stack || err)
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
      jsBundleFolderPath: path.resolve(runnerOptions.jsBundleFolderPath),
      jsBundleEntry: runnerOptions.jsBundleEntry,
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