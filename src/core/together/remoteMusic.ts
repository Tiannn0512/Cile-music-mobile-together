// 远程歌曲解析：收到房主切歌消息后，先确保歌曲在本机可播放再应用。
// 若直接应用后取链接失败，会触发播放器“出错自动跳歌”，导致听客播放自己列表的下一首，
// 所以这里先验证链接可取，失败时依次尝试同源精确重搜、跨源精确匹配。

import { getMusicUrl } from '@/core/music'
import { handlePlay } from '@/core/player/player'
import { setPlayMusicInfo } from '@/core/player/playInfo'
import { setCurrentTime } from '@/plugins/player'
import playerState from '@/store/player/state'
import { toast } from '@/utils/tools'
import { toNewMusicInfo, toOldMusicInfo } from '@/utils'
import musicSdk, { findMusic } from '@/utils/musicSdk'

// 请求令牌：连续收到多条切歌消息时，只应用最后一条的结果
let requestToken = 0

// 起播对齐的判定容差（秒），与 controller 的进度死区一致
const ALIGN_EPSILON = 1.2

const filterStr = (str: any) => String(str ?? '').replace(/\s|'|\.|,|，|&|"|、|\(|\)|（|）|`|~|-|<|>|\||\/|\]|\[|!|！/g, '').toLowerCase()

const toSeconds = (interval?: any) => {
  if (!interval) return 0
  const arr = String(interval).split(':')
  let time = 0
  let unit = 1
  while (arr.length) {
    time += parseInt(arr.pop()!) * unit
    unit *= 60
  }
  return time
}

// 在同源搜索结果里挑选与目标一致的歌曲：歌名相等 + 歌手匹配 + 时长接近
const pickExactMatch = (list: any[], target: any) => {
  const targetName = filterStr(target.name)
  const targetSinger = filterStr(target.singer)
  const targetInterval = toSeconds(target.interval)

  for (const item of list) {
    if (item?.name == null) continue
    if (filterStr(item.name) != targetName) continue

    const itemSinger = filterStr(item.singer)
    if (targetSinger && itemSinger && !targetSinger.includes(itemSinger) && !itemSinger.includes(targetSinger)) continue

    const itemInterval = toSeconds(item.interval)
    if (targetInterval && itemInterval && Math.abs(targetInterval - itemInterval) > 5) continue

    return item
  }
  return null
}

const applyMusic = (musicInfo: any, autoPlay: boolean, startAt?: number, receivedAt = Date.now()) => {
  // 丢弃待恢复的本地播放状态，避免被“恢复上次播放”分支拦截
  global.lx.restorePlayInfo = null
  setPlayMusicInfo(null, musicInfo as LX.Music.MusicInfo)
  if (autoPlay) {
    void handlePlay()

    // 起播后对齐房主进度：新歌加载（URL 获取）可能超过 1s，
    // 播放器未就绪时 seek 会静默失败，因此分多次重试直到位置真正对齐；
    // 期间收到新切歌消息（令牌变化）则放弃本次对齐
    if (startAt != null) {
      const token = requestToken
      const startedAt = receivedAt
      const alignState = { prevPos: -1 }
      void (async() => {
        for (const delay of [900, 1200, 1500, 1800, 2200, 2600, 3000]) {
          await new Promise<void>(resolve => setTimeout(resolve, delay))
          if (token != requestToken) return
          // 目标位置按经过时间外推：加载耗时内房主已继续播放，直接跳到"此刻应在的位置"
          const expected = startAt + (Date.now() - startedAt) / 1000
          const current = playerState.progress.nowPlayTime

          if (Math.abs(current - expected) < ALIGN_EPSILON) return
          if (current > startAt + 0.5 && current > alignState.prevPos && current <= expected + ALIGN_EPSILON) return
          try {
            await setCurrentTime(expected)
          } catch {
            continue
          }
          alignState.prevPos = current
        }
      })()
    }
  }
}

const canPlay = async(musicInfo: any) => {
  // isRefresh 确保真实取一次链接（成功后同时写入缓存，随后的播放直接命中）
  // allowToggleSource 关闭内置换源，换源策略由下面的精确匹配流程接管
  try {
    await getMusicUrl({ musicInfo: musicInfo as LX.Music.MusicInfo, isRefresh: true, allowToggleSource: false })
    return true
  } catch {
    return false
  }
}

export const playRemoteMusic = async(musicInfo: any, autoPlay: boolean, startAt?: number, receivedAt = Date.now()) => {
  const token = ++requestToken

  // 1) 直接尝试原始歌曲
  if (await canPlay(musicInfo)) {
    if (token != requestToken) return
    applyMusic(musicInfo, autoPlay, startAt, receivedAt)
    return
  }
  if (token != requestToken) return

  // 2) 同源精确重搜（修复歌曲信息在端与端之间的细微差异）
  try {
    const source = musicSdk[musicInfo.source as LX.OnlineSource]
    const keyword = `${musicInfo.name ?? ''} ${musicInfo.singer ?? ''}`.trim()
    const result = await source?.musicSearch?.search(keyword, 1, 25)
    const match = pickExactMatch((result?.list ?? []) as any[], musicInfo)
    if (match) {
      const newInfo = toNewMusicInfo(match)
      if (await canPlay(newInfo)) {
        if (token != requestToken) return
        applyMusic(newInfo, autoPlay, startAt, receivedAt)
        return
      }
    }
  } catch (err) {
    console.log('一起听同源重搜失败:', err)
  }
  if (token != requestToken) return

  // 3) 跨源精确匹配（与播放器“换源”功能同一套匹配器）
  try {
    const candidates = await findMusic(toOldMusicInfo(musicInfo as LX.Music.MusicInfo))
    for (const item of candidates) {
      const newInfo = toNewMusicInfo(item)
      if (await canPlay(newInfo)) {
        if (token != requestToken) return
        applyMusic(newInfo, autoPlay, startAt, receivedAt)
        return
      }
    }
  } catch (err) {
    console.log('一起听跨源匹配失败:', err)
  }
  if (token != requestToken) return

  toast('一起听：当前歌曲无法获取播放链接，已保持原播放', 'long')
}
