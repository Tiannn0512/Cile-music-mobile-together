import {
  setConnectionStatus
} from './connection'


import type {
  TogetherMessage
} from './types'





type Receiver = (

  message: TogetherMessage

)=>void






let receiver:Receiver|null = null



let socket:any = null



let serverUrl = ''



let reconnectTimer:
  ReturnType<typeof setTimeout> | null = null



let reconnectCount = 0








const connect = ()=>{


  if(!serverUrl)

    return





  socket = new WebSocket(

    serverUrl

  )



  setConnectionStatus(

    'connecting'

  )








  socket.onopen = ()=>{


    console.log(

      '一起听服务器连接成功'

    )



    setConnectionStatus(

      'connected'

    )



    reconnectCount = 0


  }









  socket.onmessage = (

    event:any

  )=>{


    try{


      const message =

        JSON.parse(

          event.data

        )



      console.log(

        '收到一起听消息:',

        message

      )



      if(receiver){


        receiver(

          message

        )


      }


    }catch(e){


      console.error(

        '一起听消息解析失败',

        e

      )


    }


  }









  socket.onerror = (

    error:any

  )=>{


    console.error(

      '一起听连接错误',

      error

    )


  }









  socket.onclose = ()=>{


    console.log(

      '一起听服务器断开'

    )



    setConnectionStatus(

      'disconnected'

    )



    socket = null



    startReconnect()


  }



}









const startReconnect = ()=>{


  if(reconnectTimer)

    return





  reconnectCount++





  const delay =

    Math.min(

      reconnectCount * 2000,

      10000

    )








  reconnectTimer =

    setTimeout(()=>{


      reconnectTimer = null



      console.log(

        '重新连接一起听服务器'

      )



      connect()



    },delay)



}









export const connectWebSocket = (

  url:string

)=>{


  serverUrl = url



  connect()



}









export const sendWebSocketMessage = (

  message:any

)=>{


  if(

    socket &&

    socket.readyState === 1

  ){


    socket.send(

      JSON.stringify(

        message

      )

    )


  }else{


    console.warn(

      '一起听未连接:',

      message

    )


  }


}









export const registerWebSocketReceiver = (

  callback:Receiver

)=>{


  receiver = callback


}









export const createRoom = ()=>{


  sendWebSocketMessage({

    type:'createRoom'

  })


}









export const joinRoom = (

  roomCode:string

)=>{


  sendWebSocketMessage({

    type:'joinRoom',

    roomCode

  })


}









export const leaveRoom = ()=>{


  sendWebSocketMessage({

    type:'leaveRoom'

  })


}