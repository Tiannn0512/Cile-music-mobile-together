import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react'
import {
  View,
  TextInput,
  Pressable,
  ScrollView,
  Animated,
  Easing,
} from 'react-native'
import Clipboard from '@react-native-clipboard/clipboard'

import Text from '@/components/common/Text'

import {
  createRoom,
  joinRoom,
  leaveTogetherRoom,
} from '@/core/together'

import {
  getTogetherUIState,
  subscribeTogetherUIState,
} from '@/core/together/uiState'

import { useTheme } from '@/store/theme/hook'
import { createStyle, toast } from '@/utils/tools'
import Dialog, { type DialogType } from '@/components/common/Dialog'
import Button from '@/components/common/Button'
import TogetherIcon from '@/components/common/TogetherIcon'


// 文本切换动画：与桌面端一致，旧文本下滑淡出(250ms)后新文本从上方滑入淡入(250ms)
const SlideText = ({
  text,
  style,
}: {
  text: string
  style?: any
}) => {
  const [displayText, setDisplayText] = useState(text)
  const translateY = useRef(new Animated.Value(0)).current
  const opacity = useRef(new Animated.Value(1)).current
  const lastText = useRef(text)

  useEffect(() => {
    if (lastText.current === text) return

    lastText.current = text
    let cancelled = false

    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 14,
        duration: 250,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 250,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (!finished || cancelled) return

      setDisplayText(text)
      translateY.setValue(-14)

      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 0,
          duration: 250,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 250,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start()
    })

    return () => {
      cancelled = true
    }
  }, [text, translateY, opacity])

  return (
    <Animated.Text
      numberOfLines={1}
      style={[
        style,
        {
          transform: [{ translateY }],
          opacity,
        },
      ]}
    >
      {displayText}
    </Animated.Text>
  )
}


// 连接状态点：未连接为灰点、连接中为主题色呼吸点、已连接为绿色静态点
const StatusDot = ({ color, pulsing }: {
  color: string
  pulsing?: boolean
}) => {
  const opacity = useRef(new Animated.Value(1)).current

  useEffect(() => {
    if (!pulsing) {
      opacity.stopAnimation()
      opacity.setValue(1)
      return
    }

    // 呼吸节奏 550ms × 2 = 1.1s/周期，柔和不干扰，仅为「进行中」状态提供生命感
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.25,
          duration: 550,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 550,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    )
    animation.start()

    return () => {
      animation.stop()
    }
  }, [pulsing, opacity])

  return (
    <Animated.View
      style={[styles.statusDot, { backgroundColor: color }, pulsing ? { opacity } : null]}
    />
  )
}


const Together = () => {
  const theme = useTheme()

  const togetherState = useSyncExternalStore(
    subscribeTogetherUIState,
    getTogetherUIState,
    getTogetherUIState,
  )

  const [inputRoom, setInputRoom] = useState('')
  const [inputFocused, setInputFocused] = useState(false)
  const exitDialogRef = useRef<DialogType>(null)


  // 房间码只允许数字：物理键盘/粘贴的非数字字符直接过滤掉
  const handleInputChange = (text: string) => {
    setInputRoom(text.replace(/\D/g, ''))
  }


  const handleCreateRoom = () => {
    if (togetherState.roomCode) return

    createRoom()
  }


  const handleJoinRoom = () => {
    if (togetherState.roomCode) return

    const code = inputRoom.trim()

    if (!code) {
      toast('请输入房间码')
      return
    }

    joinRoom(code)
  }


  const handleLeaveRoom = () => {
    if (!togetherState.roomCode) return

    exitDialogRef.current?.setVisible(true)
  }


  const handleExitRoom = () => {
    exitDialogRef.current?.setVisible(false)
    leaveTogetherRoom()
    setInputRoom('')
  }


  const handleCopyRoomCode = () => {
    if (!togetherState.roomCode) return

    Clipboard.setString(togetherState.roomCode)
    toast('房间码已复制到剪贴板')
  }


  const connectionText = (() => {
    switch (togetherState.connectionStatus) {
      case 'connected':
        return '已连接'
      case 'connecting':
        return '连接中'
      default:
        return '未连接'
    }
  })()


  // 状态三态视觉：连接中用主题色呼吸点+强调文字，已连接保留绿色功能点，未连接降为次要色
  const statusMeta = (() => {
    switch (togetherState.connectionStatus) {
      case 'connected':
        return { color: '#4caf50', textColor: theme['c-font'], pulsing: false }
      case 'connecting':
        return { color: theme['c-primary'], textColor: theme['c-primary-font'], pulsing: true }
      default:
        return { color: theme['c-font-label'], textColor: theme['c-font-label'], pulsing: false }
    }
  })()


  const hostText = !togetherState.roomCode
    ? '暂无'
    : (togetherState.isHost ? '房主' : '听客')

  const roomDisplay = togetherState.roomCode ?? '未创建'

  const onlineText = (() => {
    if (!togetherState.roomCode) {
      return '暂未创建房间'
    }

    if (togetherState.onlineCount <= 1) {
      return '等待其他人加入...'
    }

    return `当前${togetherState.onlineCount}人在听哦`
  })()


  const hasRoom = !!togetherState.roomCode

  return (
    <>
      <ScrollView
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme['c-font'] }]}>
            一起听
          </Text>
          <Text style={[styles.subtitle, { color: theme['c-font-label'] }]}>
            和另一个人同步听同一首歌
          </Text>
        </View>


        <View style={[styles.card, { backgroundColor: theme['c-content-background'] }]}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconCircle, { backgroundColor: theme['c-primary-input-background'] }]}>
              <TogetherIcon color={theme['c-primary-font']} size={22} />
            </View>

            <View style={styles.cardHeaderText}>
              <Text style={[styles.cardTitle, { color: theme['c-font'] }]}>
                一起听状态
              </Text>
              <SlideText
                text={hasRoom ? '当前正在一起听' : '创建或加入一个房间'}
                style={[styles.cardSubtitle, { color: theme['c-font-label'] }]}
              />
            </View>
          </View>


          <View style={[styles.divider, { backgroundColor: theme['c-border-background'] }]} />


          <View style={styles.infoRow}>
            <Text style={[styles.label, { color: theme['c-font-label'] }]}>
              状态
            </Text>

            <View style={styles.valueContainer}>
              <StatusDot color={statusMeta.color} pulsing={statusMeta.pulsing} />
              <SlideText
                text={connectionText}
                style={[styles.value, { color: statusMeta.textColor }]}
              />
            </View>
          </View>


          <View style={styles.infoRow}>
            <Text style={[styles.label, { color: theme['c-font-label'] }]}>
              身份
            </Text>

            <SlideText
              text={hostText}
              style={[styles.value, { color: theme['c-font'] }]}
            />
          </View>


          <View style={styles.infoRow}>
            <Text style={[styles.label, { color: theme['c-font-label'] }]}>
              房间码
            </Text>

            <View style={styles.roomValueContainer}>
              <SlideText
                text={roomDisplay}
                style={[
                  styles.value,
                  styles.roomCode,
                  { color: hasRoom ? theme['c-primary-font'] : theme['c-font-label'] },
                ]}
              />

              <Pressable
                disabled={!hasRoom}
                onPress={handleCopyRoomCode}
                style={({ pressed }) => [
                  styles.copyButton,
                  { backgroundColor: theme['c-button-background'] },
                  !hasRoom ? styles.disabledButton : null,
                  pressed ? styles.pressed : null,
                ]}
              >
                <Text
                  style={[styles.copyText, { color: theme['c-button-font'] }]}
                >
                  复制
                </Text>
              </Pressable>
            </View>
          </View>


          <View style={styles.infoRow}>
            <Text style={[styles.label, { color: theme['c-font-label'] }]}>
              人数
            </Text>

            <SlideText
              text={onlineText}
              style={[styles.value, { color: theme['c-font'] }]}
            />
          </View>
        </View>


        <View style={styles.actions}>
          <Pressable
            disabled={hasRoom}
            onPress={handleCreateRoom}
            style={({ pressed }) => [
              styles.primaryButton,
              { backgroundColor: theme['c-primary'] },
              hasRoom ? styles.disabledButton : null,
              pressed ? styles.pressed : null,
            ]}
          >
            <Text
              style={[styles.primaryButtonText, { color: theme['c-primary-light-1000'], fontWeight: '600' }]}
            >
              创建房间
            </Text>
          </Pressable>


          <View style={styles.joinContainer}>
            <TextInput
              value={inputRoom}
              onChangeText={handleInputChange}
              editable={!hasRoom}
              onFocus={() => { setInputFocused(true) }}
              onBlur={() => { setInputFocused(false) }}
              onSubmitEditing={handleJoinRoom}
              returnKeyType="done"
              placeholder="输入房间码"
              placeholderTextColor={theme['c-font-label']}
              keyboardType="number-pad"
              maxLength={6}
              selectionColor={theme['c-primary']}
              style={[
                styles.input,
                {
                  borderColor: inputFocused && !hasRoom ? theme['c-primary'] : theme['c-border-background'],
                  backgroundColor: theme['c-primary-input-background'],
                  color: theme['c-font'],
                },
                hasRoom ? styles.disabledButton : null,
              ]}
            />
          </View>


          <View style={styles.bottomButtons}>
            <Pressable
              disabled={hasRoom}
              onPress={handleJoinRoom}
              style={({ pressed }) => [
                styles.secondaryButton,
                { borderColor: theme['c-border-background'] },
                hasRoom ? styles.disabledButton : null,
                pressed ? styles.pressed : null,
              ]}
            >
              <Text style={[styles.secondaryButtonText, { color: theme['c-font'] }]}>
                加入房间
              </Text>
            </Pressable>


            <Pressable
              disabled={!hasRoom}
              onPress={handleLeaveRoom}
              style={({ pressed }) => [
                styles.secondaryButton,
                { borderColor: theme['c-border-background'] },
                !hasRoom ? styles.disabledButton : null,
                pressed ? styles.pressed : null,
              ]}
            >
              <Text style={[styles.secondaryButtonText, { color: theme['c-font'] }]}>
                退出房间
              </Text>
            </Pressable>
          </View>
        </View>


        <View style={styles.tipContainer}>
          <Text style={[styles.tipText, { color: theme['c-font-label'] }]}>
            {
              hasRoom
                ? togetherState.isHost
                  ? '等待对方加入房间，播放歌曲后会自动同步。'
                  : '已经加入房间，房主的播放状态会自动同步。'
                : '创建房间后，把房间码告诉对方即可一起听。'
            }
          </Text>
        </View>
      </ScrollView>

      <Dialog ref={exitDialogRef} closeBtn={false}>
        <View style={styles.dialogContent}>
          <Text style={styles.dialogMessage} color={theme['c-font']}>
            确定要退出当前房间吗？
          </Text>
          <View style={styles.dialogBtns}>
            <Button
              style={[styles.dialogBtn, { backgroundColor: theme['c-button-background'] }]}
              onPress={() => { exitDialogRef.current?.setVisible(false) }}
            >
              <Text style={styles.dialogBtnText} color={theme['c-font']}>取消</Text>
            </Button>
            <Button
              style={[styles.dialogBtn, { backgroundColor: theme['c-primary'] }]}
              onPress={handleExitRoom}
            >
              <Text style={styles.dialogBtnText} color={theme['c-primary-light-1000']}>退出</Text>
            </Button>
          </View>
        </View>
      </Dialog>
    </>
  )
}


const styles = createStyle({
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },

  header: {
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 24,
  },

  title: {
    fontSize: 24,
    fontWeight: '600',
  },

  subtitle: {
    marginTop: 7,
    fontSize: 13,
  },

  card: {
    borderRadius: 14,
    padding: 18,
  },

  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },

  cardHeaderText: {
    marginLeft: 12,
  },

  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
  },

  cardSubtitle: {
    marginTop: 3,
    fontSize: 12,
  },

  divider: {
    height: 1,
    marginVertical: 15,
  },

  infoRow: {
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
  },

  label: {
    width: 58,
    fontSize: 13,
  },

  value: {
    flex: 1,
    fontSize: 13,
    overflow: 'hidden',
  },

  valueContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },

  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 7,
  },

  roomValueContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },

  roomCode: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 1.5,
  },

  copyButton: {
    minWidth: 50,
    height: 30,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },

  copyText: {
    fontSize: 12,
  },

  actions: {
    marginTop: 20,
  },

  primaryButton: {
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  primaryButtonText: {
    fontSize: 14,
  },

  joinContainer: {
    marginTop: 12,
  },

  input: {
    height: 44,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
  },

  bottomButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },

  secondaryButton: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  secondaryButtonText: {
    fontSize: 14,
  },

  dialogContent: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 24,
  },

  dialogMessage: {
    fontSize: 15,
    lineHeight: 22,
  },

  dialogBtns: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },

  dialogBtn: {
    flex: 1,
    height: 42,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },

  dialogBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },

  disabledButton: {
    opacity: 0.45,
  },

  pressed: {
    opacity: 0.7,
  },

  tipContainer: {
    marginTop: 18,
  },

  tipText: {
    textAlign: 'center',
    fontSize: 12,
  },
})


export default Together
