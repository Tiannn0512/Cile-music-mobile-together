import { updateTogetherUIState } from './uiState'

export type TogetherConnectionStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'

let connectionStatus: TogetherConnectionStatus = 'disconnected'

export const setConnectionStatus = (value: TogetherConnectionStatus) => {
  connectionStatus = value
  // 同步给 UI 状态，一起听页面据此显示连接状态
  updateTogetherUIState({ connectionStatus: value })
}

export const getConnectionStatus = () => {
  return connectionStatus
}
