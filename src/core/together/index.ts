import {
  connectWebSocket,
  createRoom,
  joinRoom,
  leaveRoom
} from './websocket'


import {
  setRoomCode,
  setHost,
  isHost,
  getRoomCode,
  clearRoom
} from './room'


import {
  handleTogetherMessage
} from './controller'


import {
  createMusicChangeMessage,
  createPlayMessage,
  createPauseMessage,
  createProgressMessage
} from './sync'


import {
  sendMessage,
  registerReceiver
} from './transport'


import {
  getRemoteAction,
  setTogetherEnabled
} from './status'


import {
  updateTogetherUIState
} from './uiState'


import type {
  TogetherMessage
} from './types'





let initialized = false


let progressTimer:
ReturnType<typeof setInterval> | null = null







const updateOnlineCount = (

  count:number

)=>{


  updateTogetherUIState({

    onlineCount:count

  })


}









const startTogetherProgressSync = ()=>{


  if(progressTimer)

    return



  progressTimer = setInterval(()=>{


    if(

      !isHost() ||

      !getRoomCode() ||

      getRemoteAction()

    )

      return




    sendMessage(

      createProgressMessage()

    )



  },2000)



}









export const stopTogetherProgressSync = ()=>{


  if(progressTimer){


    clearInterval(progressTimer)


    progressTimer=null


  }


}









export const initTogether = ()=>{


  if(initialized)

    return



  initialized=true





  connectWebSocket(

    'wss://together-server-sxyr.onrender.com'

  )









  registerReceiver(

    (message:TogetherMessage)=>{



      console.log(

        '收到一起听消息',

        message

      )






      switch(message.type){





        case 'roomCreated':{


          setRoomCode(

            message.roomCode!

          )


          setHost(true)


          setTogetherEnabled(true)



          updateTogetherUIState({

            roomCode:
              message.roomCode!,

            isHost:true,

            enabled:true

          })



          updateOnlineCount(

            message.onlineCount ?? 0

          )



          startTogetherProgressSync()



          break

        }








        case 'roomJoined':{


          setRoomCode(

            message.roomCode!

          )


          setHost(false)


          setTogetherEnabled(true)




          updateTogetherUIState({

            roomCode:
              message.roomCode!,

            isHost:false,

            enabled:true

          })




          updateOnlineCount(

            message.onlineCount ?? 0

          )



          stopTogetherProgressSync()



          break

        }









        case 'userJoined':{


          updateOnlineCount(

            message.onlineCount ?? 0

          )


          break

        }








        case 'userLeft':{


          updateOnlineCount(

            message.onlineCount ?? 0

          )


          break

        }









        case 'roomClosed':{


          clearRoom()


          stopTogetherProgressSync()


          setTogetherEnabled(false)



          updateTogetherUIState({

            roomCode:null,

            onlineCount:0,

            isHost:false,

            enabled:false

          })



          break

        }









        case 'roomError':{


          console.error(

            message.message

          )


          break

        }








        default:{


          handleTogetherMessage(

            message

          )


        }


      }



    }


  )













  const stateEvent:any =

    (global as any).state_event





  if(stateEvent){



    stateEvent.playMusicInfoChanged = ()=>{



      if(

        !isHost() ||

        !getRoomCode() ||

        getRemoteAction()

      )

        return





      const message =

        createMusicChangeMessage()



      if(message)

        sendMessage(message)



    }








    stateEvent.playStateChanged = (

      playing:boolean

    )=>{



      if(

        !isHost() ||

        !getRoomCode() ||

        getRemoteAction()

      )

        return





      if(playing){


        sendMessage(

          createPlayMessage()

        )


      }else{


        sendMessage(

          createPauseMessage()

        )


      }


    }


  }


}









export const leaveTogetherRoom = ()=>{


  leaveRoom()



  stopTogetherProgressSync()



  clearRoom()



  setTogetherEnabled(false)



  updateTogetherUIState({

    roomCode:null,

    onlineCount:0,

    isHost:false,

    enabled:false

  })


}









export {
  createRoom,
  joinRoom
}