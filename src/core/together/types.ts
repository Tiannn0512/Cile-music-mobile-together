// 一起听协议消息定义（与 together-server 及桌面端的消息格式一一对应）

// 播放同步数据
export interface TogetherSyncData {
  musicInfo?: any
  currentTime?: number
  playing?: boolean
  timestamp?: number
}

// 所有消息的公共字段
interface BaseMessage {
  id?: string
  senderId?: string
  roomCode?: string
  timestamp?: number
}

// ========== 房间管理消息 ==========

export interface CreateRoomMessage extends BaseMessage {
  type: 'createRoom'
}

export interface JoinRoomMessage extends BaseMessage {
  type: 'joinRoom'
  roomCode: string
}

export interface LeaveRoomMessage extends BaseMessage {
  type: 'leaveRoom'
}

export interface RoomCreatedMessage extends BaseMessage {
  type: 'roomCreated'
  roomCode: string
  // 当前一起听人数
  onlineCount?: number
}

export interface RoomJoinedMessage extends BaseMessage {
  type: 'roomJoined'
  roomCode: string
  onlineCount?: number
}

export interface UserJoinedMessage extends BaseMessage {
  type: 'userJoined'
  onlineCount?: number
}

export interface UserLeftMessage extends BaseMessage {
  type: 'userLeft'
  onlineCount?: number
}

export interface RoomErrorMessage extends BaseMessage {
  type: 'roomError'
  message?: string
}

export interface RoomClosedMessage extends BaseMessage {
  type: 'roomClosed'
  message?: string
}

// ========== 播放同步消息 ==========

export interface MusicChangeMessage extends BaseMessage {
  type: 'musicChange'
  data?: TogetherSyncData
}

export interface PlayMessage extends BaseMessage {
  type: 'play'
  data?: TogetherSyncData
}

export interface PauseMessage extends BaseMessage {
  type: 'pause'
  data?: TogetherSyncData
}

export interface SeekMessage extends BaseMessage {
  type: 'seek'
  data?: TogetherSyncData
}

export interface ProgressMessage extends BaseMessage {
  type: 'progress'
  data?: TogetherSyncData
}

export interface SyncStateMessage extends BaseMessage {
  type: 'syncState'
  data?: TogetherSyncData
}

export type TogetherMessage =
  | CreateRoomMessage
  | JoinRoomMessage
  | LeaveRoomMessage
  | RoomCreatedMessage
  | RoomJoinedMessage
  | UserJoinedMessage
  | UserLeftMessage
  | RoomErrorMessage
  | RoomClosedMessage
  | MusicChangeMessage
  | PlayMessage
  | PauseMessage
  | SeekMessage
  | ProgressMessage
  | SyncStateMessage
