const { api } = require('./out-index')
const uuid = require('uuid')
const detect = require('detect-port')

const transformOptions = async (options) => {
  let defaultPort = await detect(8089)
  return {
    ip: options.host,
    port: options.port || options.p || defaultPort,
    channelId: options.channelid || uuid(),
    manual: options.manual,
    remoteDebugPort: options.remoteDebugPort
  }
}

const debug = async () => {
  const options = {}
  let devtoolOptions = await transformOptions(options)
  await api.startDevtoolServer([], devtoolOptions)
}

module.exports = debug

