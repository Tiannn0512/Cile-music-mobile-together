import type { TogetherMessage } from './types'
import { sendWebSocketMessage, registerWebSocketReceiver } from './websocket'

export const sendMessage = (message: TogetherMessage) => {
  sendWebSocketMessage(message)
}

export const registerReceiver = (callback: (message: TogetherMessage) => void) => {
  registerWebSocketReceiver(callback)
}
