// 一起听同步用的歌曲信息归一化：
// 端与端之间只能同步在线歌曲（各端的本地文件互不可见），下载列表条目需提取其中的在线歌曲信息

/**
 * 提取可跨端同步的在线歌曲信息，本地歌曲返回 null
 * 入参为 LX.Music.MusicInfo 或 LX.Download.ListItem（下载条目含 progress 与 metadata 字段）
 */
export const getSyncableMusicInfo = (musicInfo: any): any => {
  if (!musicInfo) return null

  // 下载列表条目（含 progress 字段）提取其中的在线歌曲信息
  const target = ('progress' in musicInfo && musicInfo.metadata?.musicInfo)
    ? musicInfo.metadata.musicInfo
    : musicInfo

  if (target?.source == null || target.source === 'local') return null

  return target
}
