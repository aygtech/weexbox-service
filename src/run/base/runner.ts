const fs = require('fs')
import * as WebSocket from 'ws'

import * as EventEmitter from 'events'
import { RunnerConfig, runnerState, messageType } from '../common/runner'
import { PLATFORM_TYPES } from '../common/const'
import WsServer from '../server/ws'
import { FSWatcher } from 'fs'

export default class Runner extends EventEmitter {
  public type: PLATFORM_TYPES
  protected config: RunnerConfig
  protected filesWatcher: FSWatcher
  protected wsServer: WsServer

  constructor(options: RunnerConfig) {
    super()
    this.config = options
    this.on('error', e => {
      // To prevent the collapse
      console.error(e)
    })
  }

  private async startServer() {
    if (this.wsServer) {
      return this.wsServer
    }
    const config = this.config
    this.wsServer = new WsServer({
      staticFolder: config.jsBundleFolderPath,
    })
    await this.wsServer.init()
  }

  protected transmitEvent(outEvent) {
    outEvent.on(messageType.outputError, message => {
      this.emit(messageType.outputError, message)
    })
    outEvent.on(messageType.outputLog, message => {
      this.emit(messageType.outputLog, message)
    })
  }

  protected watchFileChange() {
    if (this.filesWatcher) {
      this.filesWatcher.close()
    }
    this.filesWatcher = fs.watch(
      this.config.jsBundleFolderPath,
      {
        recursive: true,
      },
      (type, name) => {
        const wsServer = this.wsServer
        const serverInfo = wsServer.getServerInfo()
        const wsS = wsServer.getWs()
        if (!wsS) {
          return
        }
        for (const ws of wsS) {
          if (ws.readyState === WebSocket.OPEN && name.includes('www')) {
            ws.send(
              JSON.stringify({
                method: 'WXReloadBundle',
                params: `http://${serverInfo.hostname}:${serverInfo.port}/${name}`,
              }),
            )
          }
        }
      },
    )
    return true
  }

  public async run(options?: any): Promise<any> {
    let appPath
    try {
      // All method catch in here
      this.emit(messageType.state, runnerState.start)
      await this.startServer()
      const serverInfo = this.wsServer.getServerInfo()
      this.emit(messageType.state, runnerState.startServerDone, `ws://${serverInfo.hostname}:${serverInfo.port}`)

      this.watchFileChange()
      this.emit(messageType.state, runnerState.watchFileChangeDone)

      this.emit(messageType.state, runnerState.done)
    } catch (error) {
      throw error
    }
  }

  public dispose() {
    this.filesWatcher.close()
    this.wsServer.dispose()
  }
}
