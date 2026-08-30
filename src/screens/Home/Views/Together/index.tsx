import React, {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore
} from 'react'


import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
  ScrollView,
  Animated
} from 'react-native'


import {
  initTogether,
  createRoom,
  joinRoom,
  leaveTogetherRoom
} from '@/core/together'


import {
  getTogetherUIState,
  subscribeTogetherUIState
} from '@/core/together/uiState'


import {
  getConnectionStatus
} from '@/core/together/connection'



const SlideText = ({
  text,
  style
}:{
  text:string,
  style?:any
})=>{

  const translateY =
    useRef(
      new Animated.Value(-10)
    ).current


  const opacity =
    useRef(
      new Animated.Value(1)
    ).current


  const lastText =
    useRef(text)


  useEffect(()=>{

    if(lastText.current === text){
      return
    }


    lastText.current = text


    translateY.setValue(-10)

    opacity.setValue(0)


    Animated.parallel([

      Animated.timing(
        translateY,
        {
          toValue:0,
          duration:250,
          useNativeDriver:true
        }
      ),

      Animated.timing(
        opacity,
        {
          toValue:1,
          duration:250,
          useNativeDriver:true
        }
      )

    ]).start()


  },[text])


  return (

    <Animated.Text

      numberOfLines={1}

      style={[
        style,
        {
          transform:[
            {
              translateY
            }
          ],
          opacity
        }
      ]}

    >

      {text}

    </Animated.Text>

  )

}



const Together = ()=>{


  const togetherState =
    useSyncExternalStore(
      subscribeTogetherUIState,
      getTogetherUIState,
      getTogetherUIState
    )


  const [
    inputRoom,
    setInputRoom
  ] = useState('')


  const [
    connectionStatus,
    setConnectionStatus
  ] = useState(
    getConnectionStatus()
  )



  useEffect(()=>{

    initTogether()


    const timer =
      setInterval(()=>{

        setConnectionStatus(
          getConnectionStatus()
        )

      },500)


    return ()=>{

      clearInterval(timer)

    }

  },[])



  const handleCreateRoom = ()=>{

    if(togetherState.roomCode){
      return
    }


    initTogether()

    createRoom()

  }



  const handleJoinRoom = ()=>{

    if(togetherState.roomCode){
      return
    }


    const code =
      inputRoom.trim()


    if(!code){

      Alert.alert(
        '提示',
        '请输入房间码'
      )

      return

    }


    initTogether()

    joinRoom(code)

  }



  const handleLeaveRoom = ()=>{

    if(!togetherState.roomCode){
      return
    }


    Alert.alert(

      '退出一起听',

      '确定要退出当前房间吗？',

      [
        {
          text:'取消',
          style:'cancel'
        },
        {
          text:'退出',
          style:'destructive',

          onPress:()=>{

            leaveTogetherRoom()

            setInputRoom('')

          }
        }
      ]

    )

  }



  const handleCopyRoomCode = ()=>{

    if(!togetherState.roomCode){
      return
    }


    try{

      const Clipboard =
        require(
          '@react-native-clipboard/clipboard'
        ).default


      Clipboard.setString(
        togetherState.roomCode
      )


      Alert.alert(
        '已复制',
        '房间码已复制到剪贴板'
      )

    }catch(e){

      Alert.alert(
        '提示',
        '复制功能暂不可用'
      )

    }

  }



  const getConnectionText = ()=>{

    switch(connectionStatus){

      case 'connected':
        return '已连接'

      case 'connecting':
        return '连接中'

      default:
        return '未连接'

    }

  }



  const getHostText = ()=>{

    if(!togetherState.roomCode){
      return '暂无'
    }


    return togetherState.isHost
      ? '房主'
      : '听客'

  }



  const getRoomText = ()=>{

    return togetherState.roomCode
      ? togetherState.roomCode
      : '未创建'

  }



  const getOnlineText = ()=>{

    if(!togetherState.roomCode){

      return '现在还没有人听哦，快叫人一起来听吧！'

    }


    if(togetherState.onlineCount <= 1){

      return '等待其他人加入...'

    }


    return `当前${togetherState.onlineCount}人在听哦`

  }



  const connected =
    connectionStatus === 'connected'


  const hasRoom =
    !!togetherState.roomCode

  return (

    <ScrollView

      style={styles.container}

      contentContainerStyle={styles.contentContainer}

      keyboardShouldPersistTaps="handled"

    >

      <View style={styles.header}>

        <Text style={styles.title}>
          一起听
        </Text>

        <Text style={styles.subtitle}>
          和另一个人同步听同一首歌
        </Text>

      </View>



      <View style={styles.card}>


        <View style={styles.cardHeader}>

          <View style={styles.iconCircle}>

            <Text style={styles.iconText}>
              ♫
            </Text>

          </View>


          <View style={styles.cardHeaderText}>

            <Text style={styles.cardTitle}>
              一起听状态
            </Text>


            <Text style={styles.cardSubtitle}>

              {
                hasRoom
                  ? '当前正在一起听'
                  : '创建或加入一个房间'
              }

            </Text>

          </View>

        </View>



        <View style={styles.divider}/>



        <View style={styles.infoRow}>

          <Text style={styles.label}>
            状态
          </Text>


          <View style={styles.valueContainer}>

            <View

              style={[
                styles.statusDot,
                connected
                  ? styles.statusOnline
                  : styles.statusOffline
              ]}

            />

            <Text style={styles.value}>
              {getConnectionText()}
            </Text>

          </View>

        </View>




        <View style={styles.infoRow}>

          <Text style={styles.label}>
            身份
          </Text>


          <SlideText

            text={getHostText()}

            style={styles.value}

          />

        </View>




        <View style={styles.infoRow}>

          <Text style={styles.label}>
            房间码
          </Text>


          <View style={styles.roomValueContainer}>


            <SlideText

              text={getRoomText()}

              style={[
                styles.value,
                hasRoom
                  ? styles.roomCode
                  : null
              ]}

            />



            <Pressable

              disabled={!hasRoom}

              onPress={handleCopyRoomCode}

              style={({pressed})=>[

                styles.copyButton,

                !hasRoom
                  ? styles.disabledButton
                  : null,

                pressed
                  ? styles.pressed
                  : null

              ]}

            >

              <Text

                style={[
                  styles.copyText,

                  !hasRoom
                    ? styles.disabledText
                    : null
                ]}

              >

                复制

              </Text>

            </Pressable>


          </View>

        </View>




        <View style={styles.infoRow}>

          <Text style={styles.label}>
            人数
          </Text>


          <SlideText

            text={getOnlineText()}

            style={styles.value}

          />

        </View>


      </View>




      <View style={styles.actions}>


        <Pressable

          disabled={hasRoom}

          onPress={handleCreateRoom}

          style={({pressed})=>[

            styles.primaryButton,

            hasRoom
              ? styles.disabledButton
              : null,

            pressed
              ? styles.pressed
              : null

          ]}

        >

          <Text

            style={[
              styles.primaryButtonText,

              hasRoom
                ? styles.disabledText
                : null
            ]}

          >

            创建房间

          </Text>


        </Pressable>



        <View style={styles.joinContainer}>


          <TextInput

            value={inputRoom}

            onChangeText={setInputRoom}

            editable={!hasRoom}

            placeholder="输入房间码"

            placeholderTextColor="#999"

            keyboardType="number-pad"

            maxLength={6}

            style={[

              styles.input,

              hasRoom
                ? styles.inputDisabled
                : null

            ]}

          />

        </View>




        <View style={styles.bottomButtons}>


          <Pressable

            disabled={hasRoom}

            onPress={handleJoinRoom}

            style={({pressed})=>[

              styles.secondaryButton,

              hasRoom
                ? styles.disabledButton
                : null,

              pressed
                ? styles.pressed
                : null

            ]}

          >

            <Text

              style={[
                styles.secondaryButtonText,

                hasRoom
                  ? styles.disabledText
                  : null
              ]}

            >

              加入房间

            </Text>


          </Pressable>




          <Pressable

            disabled={!hasRoom}

            onPress={handleLeaveRoom}

            style={({pressed})=>[

              styles.secondaryButton,

              !hasRoom
                ? styles.disabledButton
                : null,

              pressed
                ? styles.pressed
                : null

            ]}

          >

            <Text

              style={[
                styles.secondaryButtonText,

                !hasRoom
                  ? styles.disabledText
                  : null
              ]}

            >

              退出房间

            </Text>


          </Pressable>


        </View>


      </View>




      <View style={styles.tipContainer}>


        <Text style={styles.tipText}>

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

  )

}





const styles = StyleSheet.create({

  container:{
    flex:1,
    backgroundColor:'#f7f7f7'
  },


  contentContainer:{
    padding:20,
    paddingBottom:40
  },


  header:{
    alignItems:'center',
    marginTop:10,
    marginBottom:24
  },


  title:{
    fontSize:24,
    fontWeight:'600',
    color:'#333'
  },


  subtitle:{
    marginTop:7,
    fontSize:13,
    color:'#999'
  },


  card:{
    backgroundColor:'#fff',
    borderRadius:14,
    padding:18
  },


  cardHeader:{
    flexDirection:'row',
    alignItems:'center'
  },


  iconCircle:{
    width:44,
    height:44,
    borderRadius:22,
    backgroundColor:'#f1f1f1',
    alignItems:'center',
    justifyContent:'center'
  },


  iconText:{
    fontSize:21,
    color:'#666'
  },


  cardHeaderText:{
    marginLeft:12
  },


  cardTitle:{
    fontSize:16,
    fontWeight:'600',
    color:'#333'
  },


  cardSubtitle:{
    marginTop:3,
    fontSize:12,
    color:'#999'
  },


  divider:{
    height:1,
    backgroundColor:'#eee',
    marginVertical:15
  },


  infoRow:{
    minHeight:38,
    flexDirection:'row',
    alignItems:'center'
  },


  label:{
    width:58,
    fontSize:13,
    color:'#999'
  },


  value:{
    flex:1,
    fontSize:13,
    color:'#444',
    overflow:'hidden'
  },


  valueContainer:{
    flex:1,
    flexDirection:'row',
    alignItems:'center'
  },


  statusDot:{
    width:8,
    height:8,
    borderRadius:4,
    marginRight:7
  },


  statusOnline:{
    backgroundColor:'#4caf50'
  },


  statusOffline:{
    backgroundColor:'#aaa'
  },


  roomValueContainer:{
    flex:1,
    flexDirection:'row',
    alignItems:'center'
  },


  roomCode:{
    fontSize:16,
    fontWeight:'600',
    letterSpacing:1.5
  },


  copyButton:{
    minWidth:50,
    height:30,
    borderRadius:6,
    backgroundColor:'#f1f1f1',
    alignItems:'center',
    justifyContent:'center',
    marginLeft:10
  },


  copyText:{
    fontSize:12,
    color:'#555'
  },


  actions:{
    marginTop:20
  },


  primaryButton:{
    height:44,
    borderRadius:10,
    backgroundColor:'#555',
    alignItems:'center',
    justifyContent:'center'
  },


  primaryButtonText:{
    color:'#fff',
    fontSize:14
  },


  joinContainer:{
    marginTop:12
  },


  input:{
    height:44,
    borderWidth:1,
    borderColor:'#ddd',
    borderRadius:10,
    paddingHorizontal:14,
    backgroundColor:'#fff'
  },


  inputDisabled:{
    backgroundColor:'#f1f1f1'
  },


  bottomButtons:{
    flexDirection:'row',
    gap:12,
    marginTop:12
  },


  secondaryButton:{
    flex:1,
    height:44,
    borderRadius:10,
    borderWidth:1,
    borderColor:'#ddd',
    alignItems:'center',
    justifyContent:'center'
  },


  secondaryButtonText:{
    color:'#444'
  },


  disabledButton:{
    opacity:.45
  },


  disabledText:{
    color:'#999'
  },


  pressed:{
    opacity:.7
  },


  tipContainer:{
    marginTop:18
  },


  tipText:{
    textAlign:'center',
    fontSize:12,
    color:'#999'
  }

})


export default Together