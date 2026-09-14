let remoteAction = false
let remoteActionTimer: ReturnType<typeof setTimeout> | null = null

// 每次进入远程操作时递增，用于丢弃过期的解除定时器：
// 旧消息安排的解除动作不能提前结束新消息的防护窗口
let generation = 0

let togetherEnabled = false

const REMOTE_ACTION_TIMEOUT = 3000

/**
 * 标记当前正在执行远程同步操作，抑制本地播放事件向外广播，避免同步动作回环
 */
export const setRemoteAction = (value: boolean) => {
  if (!value) {
    remoteAction = false
    if (remoteActionTimer) {
      clearTimeout(remoteActionTimer)
      remoteActionTimer = null
    }
    return
  }

  remoteAction = true
  generation++

  const currentGeneration = generation
  if (remoteActionTimer) {
    clearTimeout(remoteActionTimer)
  }
  remoteActionTimer = setTimeout(() => {
    remoteActionTimer = null
    if (currentGeneration !== generation) return
    remoteAction = false
  }, REMOTE_ACTION_TIMEOUT)
}

/**
 * 延迟解除远程操作标志，仅当期间没有新的远程操作时才生效
 */
export const releaseRemoteActionAfter = (ms: number) => {
  const currentGeneration = generation
  setTimeout(() => {
    if (currentGeneration !== generation) return
    remoteAction = false
  }, ms)
}

export const getRemoteAction = () => {
  return remoteAction
}

export const setTogetherEnabled = (value: boolean) => {
  togetherEnabled = value
}

export const getTogetherEnabled = () => {
  return togetherEnabled
}
