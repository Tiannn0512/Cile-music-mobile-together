import type { TogetherConnectionStatus } from './connection'

interface TogetherUIState {
  roomCode: string | null
  onlineCount: number
  isHost: boolean
  enabled: boolean
  connectionStatus: TogetherConnectionStatus
}

let state: TogetherUIState = {
  roomCode: null,
  onlineCount: 0,
  isHost: false,
  enabled: false,
  connectionStatus: 'disconnected',
}

const listeners = new Set<() => void>()

export const getTogetherUIState = () => {
  return state
}

export const updateTogetherUIState = (data: Partial<TogetherUIState>) => {
  state = {
    ...state,
    ...data,
  }
  listeners.forEach(callback => { callback() })
}

export const subscribeTogetherUIState = (callback: () => void) => {
  listeners.add(callback)
  return () => {
    listeners.delete(callback)
  }
}
