import playerState from '@/store/player/state'

import { getSyncableMusicInfo } from './musicInfo'
import { clientId } from './client'
import { getRoomCode } from './room'
import type { TogetherMessage, TogetherSyncData } from './types'

const createMessage = (
  type: TogetherMessage['type'],
  data?: TogetherSyncData,
): TogetherMessage => {
  const message = {
    id: Math.random().toString(36).substring(2),
    senderId: clientId,
    roomCode: getRoomCode() ?? undefined,
    type,
    timestamp: Date.now(),
    data,
  }
  return message as TogetherMessage
}

// 当前播放进度（播放器进度每秒轮询一次，误差在 1s 内）
const getCurrentTime = () => {
  return playerState.progress.nowPlayTime || 0
}

export const createMusicChangeMessage = () => {
  const music = getSyncableMusicInfo(playerState.playMusicInfo.musicInfo)
  if (!music) return null

  // 切歌永远从 0 开始：musicToggled 触发时播放器还停留在上一首歌的进度，
  // 带旧位置会让听客先 seek 到上一首歌的时间点（表现为“先跳错再追回”）
  return createMessage('musicChange', {
    musicInfo: music,
    currentTime: 0,
  })
}

export const createPlayMessage = () => {
  return createMessage('play', { currentTime: getCurrentTime() })
}

export const createPauseMessage = () => {
  return createMessage('pause', { currentTime: getCurrentTime() })
}

export const createProgressMessage = () => {
  return createMessage('progress', { currentTime: getCurrentTime() })
}
