import {
  connectWebSocket,
  createRoom,
  joinRoom,
  leaveRoom,
  onReconnected,
} from './websocket'

import {
  setRoomCode,
  setHost,
  isHost,
  getRoomCode,
  clearRoom,
} from './room'

import { handleTogetherMessage } from './controller'

import {
  createMusicChangeMessage,
  createPlayMessage,
  createPauseMessage,
  createProgressMessage,
} from './sync'

import { sendMessage, registerReceiver } from './transport'

import { getRemoteAction, setTogetherEnabled } from './status'

import { updateTogetherUIState } from './uiState'

import { toast } from '@/utils/tools'

import type { TogetherMessage } from './types'

// 一起听服务器地址：本项目不提供公共服务器，需自建后填写。
// 服务端代码见 together-server 仓库（纯 Node.js + ws，npm start 即可运行），
// 部署后把地址填在这里，形如 'wss://你的域名' 或 'ws://IP:端口'，然后重新打包。
const SERVER_URL = ''

// 房主进度同步心跳间隔
const PROGRESS_SYNC_INTERVAL = 2000

let initialized = false

let progressTimer: ReturnType<typeof setInterval> | null = null

const startTogetherProgressSync = () => {
  if (progressTimer) return

  progressTimer = setInterval(() => {
    if (!isHost() || !getRoomCode() || getRemoteAction()) return

    sendMessage(createProgressMessage())
  }, PROGRESS_SYNC_INTERVAL)
}

export const stopTogetherProgressSync = () => {
  if (progressTimer) {
    clearInterval(progressTimer)
    progressTimer = null
  }
}

// 房间失效（服务端关闭/主动退出/断线重连后失效）时的统一清理
const handleRoomClosed = () => {
  clearRoom()
  stopTogetherProgressSync()
  setTogetherEnabled(false)
  updateTogetherUIState({ roomCode: null, onlineCount: 0, isHost: false, enabled: false })
}

// 房主广播播放事件（远程操作期间忽略本地事件，避免回环）
const broadcastHostEvent = (create: () => TogetherMessage | null) => {
  if (!isHost() || !getRoomCode() || getRemoteAction()) return

  const message = create()
  if (message) sendMessage(message)
}

export const initTogether = () => {
  if (initialized) return

  initialized = true

  connectWebSocket(SERVER_URL)

  // 断线重连成功后，本地若仍残留房间状态（服务端房间已随旧连接消失），统一清理
  onReconnected(() => {
    if (getRoomCode()) {
      handleRoomClosed()
      toast('网络连接中断，房间已失效，请重新创建或加入', 'long')
    }
  })

  registerReceiver((message: TogetherMessage) => {
    switch (message.type) {
      case 'roomCreated':
        setRoomCode(message.roomCode)
        setHost(true)
        setTogetherEnabled(true)
        updateTogetherUIState({
          roomCode: message.roomCode,
          isHost: true,
          enabled: true,
          onlineCount: message.onlineCount ?? 0,
        })
        startTogetherProgressSync()
        break

      case 'roomJoined':
        setRoomCode(message.roomCode)
        setHost(false)
        setTogetherEnabled(true)
        updateTogetherUIState({
          roomCode: message.roomCode,
          isHost: false,
          enabled: true,
          onlineCount: message.onlineCount ?? 0,
        })
        stopTogetherProgressSync()
        break

      case 'userJoined':
      case 'userLeft':
        updateTogetherUIState({ onlineCount: message.onlineCount ?? 0 })
        break

      case 'roomClosed':
        handleRoomClosed()
        break

      case 'roomError':
        console.error('一起听房间错误:', message.message)
        toast(message.message ?? '一起听房间错误', 'long')
        break

      // 播放同步消息
      default:
        handleTogetherMessage(message)
        break
    }
  })

  // 歌曲切换（仅房主广播，远程操作期间忽略本地事件，避免回环）
  global.state_event.on('playMusicInfoChanged', () => {
    broadcastHostEvent(createMusicChangeMessage)
  })

  // 播放/暂停
  global.state_event.on('playStateChanged', (playing) => {
    broadcastHostEvent(playing ? createPlayMessage : createPauseMessage)
  })
}

export const leaveTogetherRoom = () => {
  leaveRoom()
  handleRoomClosed()
}

export {
  createRoom,
  joinRoom,
}
