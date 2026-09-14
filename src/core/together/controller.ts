import { play, pause } from '@/core/player/player'
import { setCurrentTime } from '@/plugins/player'
import playerState from '@/store/player/state'

import { setRemoteAction, releaseRemoteActionAfter } from './status'
import { getSyncableMusicInfo } from './musicInfo'
import { playRemoteMusic } from './remoteMusic'
import type { TogetherMessage } from './types'

// 远程操作后的防护窗口：期间抑制本地播放事件向外广播，避免同步动作回环
const REMOTE_ACTION_GUARD_MS = 1000

// 进度延迟补偿的上限（秒）：正常网络延迟远小于此值，
// 钳制可避免双端时钟偏差把听客进度推到错误位置
const PROGRESS_DELAY_MAX = 2

// 进度对齐死区（秒）：偏差小于此值不干预，各自自然播放，
// 避免每次进度心跳都强制 seek 造成播放卡顿
const PROGRESS_SYNC_THRESHOLD = 1.2

// 直追判定窗口（毫秒）：仅在此时间内收到的心跳才参与外推，超过则视为常规同步
const PROGRESS_CATCHUP_WINDOW = 6000

// 直追的最小目标位置（秒）：0 = 任何明显落后都一步追到房主实时位置，
// 消除“每次心跳追一小段、连续跳好几下”的阶梯式追赶
const PROGRESS_CATCHUP_MIN = 0

// 最近一次收到房主进度心跳的时间（用于直追外推）
let lastProgressAt = 0

// 房主当前播放状态（由 play/pause/syncState/musicChange 消息持续更新）
let hostPlaying = false

// 正在解析房主切歌/同步状态（音源请求期间本机引擎还没切到新歌），
// 期间忽略 play/pause/progress，避免对旧曲目做无意义的播放与 seek
let remoteApplyPending = false
let remoteApplySeq = 0

// 追踪式进度对齐：新歌加载耗时不可控（音源请求 + 缓冲），
// 目标位置按经过时间持续外推，多次尝试；确认自然播放后交给心跳，避免额外 seek 造成跳感。
const alignPlaybackPosition = (basePosition: number) => {
  const startedAt = Date.now()
  const alignState = { prevPos: -1 }

  void (async() => {
    for (const delay of [900, 1200, 1500, 1800, 2200, 2600, 3000]) {
      await new Promise<void>(resolve => setTimeout(resolve, delay))
      const elapsed = (Date.now() - startedAt) / 1000
      const expected = basePosition + elapsed
      const current = playerState.progress.nowPlayTime

      // 已对齐
      if (Math.abs(current - expected) < PROGRESS_SYNC_THRESHOLD) return
      // 已自然播放、离目标不远且没有异常超前：交给心跳微调
      if (current > basePosition + 0.5 && current > alignState.prevPos && current <= expected + PROGRESS_SYNC_THRESHOLD) return
      try {
        await setCurrentTime(expected)
      } catch {
        // 播放器尚未就绪（无曲目/加载中），继续下一次尝试
      }
      alignState.prevPos = current
    }
  })()
}

export const handleTogetherMessage = (message: TogetherMessage) => {
  // 消息到达时刻：解析器对齐/直追的计时基准（音源请求耗时也要算进外推）
  const receivedAt = Date.now()

  setRemoteAction(true)

  try {
    switch (message.type) {
      // 加入房间时服务端下发的完整播放状态
      case 'syncState': {
        const state = message.data

        const musicInfo = getSyncableMusicInfo(state?.musicInfo)
        hostPlaying = state?.playing == true
        if (musicInfo) {
          // 先确保能取到播放链接再应用，避免取链失败触发自动跳歌；
          // 附带进度，起播后由解析器对齐（含重搜后再对齐，时序更准）
          const seq = ++remoteApplySeq
          remoteApplyPending = true
          void playRemoteMusic(musicInfo, hostPlaying, state?.currentTime, receivedAt).finally(() => {
            if (seq == remoteApplySeq) remoteApplyPending = false
          })
        }

        // 房主处于暂停态：延后对齐进度并暂停（等待播放器完成加载）
        if (state?.playing === false) {
          const currentTime = state?.currentTime
          setTimeout(() => {
            // 房主空闲时 currentTime 为 0，无歌曲时不对齐，避免把本地播放 seek 到 0
            if (currentTime !== undefined && musicInfo) void setCurrentTime(currentTime)
            void pause()
          }, 1200)
        }

        break
      }

      // 房主切换了歌曲
      case 'musicChange': {
        const musicInfo = getSyncableMusicInfo(message.data?.musicInfo)
        if (!musicInfo) break

        // 切歌意味着房主开始播放新歌（消息携带的进度固定为 0）
        hostPlaying = true
        const seq = ++remoteApplySeq
        remoteApplyPending = true

        // 先确保能取到播放链接再应用，失败时解析器会精确重搜，不触发自动跳歌；
        // 解析期间房主若暂停，完成后这里补一个暂停保持跟随
        void playRemoteMusic(musicInfo, true, message.data?.currentTime, receivedAt).finally(() => {
          if (seq == remoteApplySeq) remoteApplyPending = false
          if (!hostPlaying) void pause()
        })

        break
      }

      case 'play': {
        hostPlaying = true
        // 解析期间引擎还没切到新歌，忽略瞬态播放事件，解析完成后统一对齐
        if (remoteApplyPending) break

        play()

        const currentTime = message.data?.currentTime
        if (currentTime !== undefined) {
          alignPlaybackPosition(currentTime)
        }

        break
      }

      case 'pause': {
        hostPlaying = false
        // 解析期间忽略瞬态暂停事件（解析完成后按 hostPlaying 呈现正确状态）
        if (remoteApplyPending) break

        void pause()

        const currentTime = message.data?.currentTime
        // 暂停前已对齐就不重复 seek，避免暂停动作本身产生跳感
        if (currentTime !== undefined && Math.abs(playerState.progress.nowPlayTime - currentTime) > PROGRESS_SYNC_THRESHOLD) {
          void setCurrentTime(currentTime)
        }

        break
      }

      case 'seek': {
        const currentTime = message.data?.currentTime
        if (currentTime !== undefined) {
          void setCurrentTime(currentTime)
        }

        break
      }

      case 'progress': {
        const currentTime = message.data?.currentTime
        if (currentTime === undefined) break

        lastProgressAt = Date.now()

        // 解析期间不对旧曲目做 seek，等新歌应用后由对齐/心跳接管
        if (remoteApplyPending) break

        const delay = Math.min(
          Math.max((Date.now() - (message.timestamp ?? Date.now())) / 1000, 0),
          PROGRESS_DELAY_MAX,
        )

        const target = currentTime + delay

        // 晚到端快速直追：本端刚完成加载（明显落后）且心跳新鲜时，
        // 按"房主位置 + 心跳龄"外推当前应处位置，一步追平，
        // 消除"一端先播、另一端加载完突然跳过去"的两段式追赶
        if (target > PROGRESS_CATCHUP_MIN && Date.now() - lastProgressAt < PROGRESS_CATCHUP_WINDOW) {
          const age = (Date.now() - lastProgressAt) / 1000
          const liveTarget = target + age
          if (playerState.progress.nowPlayTime < liveTarget - PROGRESS_SYNC_THRESHOLD) {
            void setCurrentTime(liveTarget)
            break
          }
        }

        // 偏差在死区内不干预，避免频繁 seek 造成卡顿
        if (Math.abs(playerState.progress.nowPlayTime - target) < PROGRESS_SYNC_THRESHOLD) break

        void setCurrentTime(target)

        break
      }
    }
  } finally {
    releaseRemoteActionAfter(REMOTE_ACTION_GUARD_MS)
  }
}
