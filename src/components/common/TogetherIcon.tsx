import { memo } from 'react'
import { View } from 'react-native'

// 复刻桌面端一起听的“双人”图标（24x24 视口，填充风格，两人一前一后）
export default memo(({ color, size = 24 }: {
  color: string
  size?: number
}) => {
  const s = size / 24
  const u = (v: number) => Math.round(v * s * 100) / 100

  return (
    <View style={{ width: size, height: size }}>
      {/* 后面的人（右侧，稍小） */}
      <View style={{
        position: 'absolute',
        left: u(14),
        top: u(5.5),
        width: u(6),
        height: u(6),
        borderRadius: u(3),
        backgroundColor: color,
      }} />
      <View style={{
        position: 'absolute',
        left: u(12.5),
        top: u(13.5),
        width: u(9.5),
        height: u(6.5),
        borderTopLeftRadius: u(4.75),
        borderTopRightRadius: u(4.75),
        backgroundColor: color,
      }} />

      {/* 前面的人（左侧，稍大） */}
      <View style={{
        position: 'absolute',
        left: u(5.5),
        top: u(4.5),
        width: u(7),
        height: u(7),
        borderRadius: u(3.5),
        backgroundColor: color,
      }} />
      <View style={{
        position: 'absolute',
        left: u(2.5),
        top: u(13),
        width: u(13),
        height: u(7),
        borderTopLeftRadius: u(6.5),
        borderTopRightRadius: u(6.5),
        backgroundColor: color,
      }} />
    </View>
  )
})
