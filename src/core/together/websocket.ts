import { setConnectionStatus } from './connection'
import type { TogetherMessage } from './types'

type Receiver = (message: TogetherMessage) => void

const RECONNECT_BASE_DELAY = 2000
const RECONNECT_MAX_DELAY = 10000

let receiver: Receiver | null = null

// 断线重连成功时通知（用于清理本地残留的房间状态），由 index.ts 注册
let reconnectedListener: (() => void) | null = null

let socket: WebSocket | null = null

let serverUrl = ''

let reconnectTimer: ReturnType<typeof setTimeout> | null = null

let reconnectCount = 0

// 是否已成功连接过，用于区分首次连接与断线重连
let hadConnected = false

const connect = () => {
  if (!serverUrl || socket) return

  socket = new WebSocket(serverUrl)

  setConnectionStatus('connecting')

  socket.onopen = () => {
    console.log('一起听服务器连接成功')


    setConnectionStatus('connected')

    reconnectCount = 0

    // 断线重连成功：旧连接上的房间在服务端已随连接消失，清理本地残留的房间状态，避免“僵尸房间”
    if (hadConnected && reconnectedListener) {
      reconnectedListener()
    }
    hadConnected = true
  }

  socket.onmessage = (event) => {
    let message: TogetherMessage
    try {
      message = JSON.parse(event.data as string)
    } catch (err) {
      console.warn('一起听消息解析失败:', err)
      return
    }

    receiver?.(message)
  }

  socket.onerror = (error) => {
    console.error('一起听连接错误', error)
  }

  socket.onclose = () => {
    console.log('一起听服务器断开')

    setConnectionStatus('disconnected')

    socket = null

    startReconnect()
  }
}

const startReconnect = () => {
  if (reconnectTimer) return

  reconnectCount++

  const delay = Math.min(reconnectCount * RECONNECT_BASE_DELAY, RECONNECT_MAX_DELAY)

  reconnectTimer = setTimeout(() => {
    reconnectTimer = null

    console.log('尝试重新连接一起听服务器')

    connect()
  }, delay)
}

export const connectWebSocket = (url: string) => {
  serverUrl = url

  connect()
}

/**
 * 注册断线重连成功后的回调（仅在重连时触发，首次连接不触发）
 */
export const onReconnected = (callback: () => void) => {
  reconnectedListener = callback
}

export const sendWebSocketMessage = (message: TogetherMessage) => {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(message))
  } else {
    console.warn('一起听未连接，消息未发送:', message)
  }
}

export const registerWebSocketReceiver = (callback: Receiver) => {
  receiver = callback
}

export const createRoom = () => {
  sendWebSocketMessage({ type: 'createRoom' })
}

export const joinRoom = (roomCode: string) => {
  sendWebSocketMessage({ type: 'joinRoom', roomCode })
}

export const leaveRoom = () => {
  sendWebSocketMessage({ type: 'leaveRoom' })
}
