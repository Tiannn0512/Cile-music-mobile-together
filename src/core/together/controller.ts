import {
  handlePlay,
  play,
  pause
} from '@/core/player/player'


import playerAction from '@/store/player/action'


import {
  setCurrentTime
} from '@/plugins/player'


import {
  setRemoteAction
} from './status'





export const handleTogetherMessage = (

  message:any

)=>{


  setRemoteAction(true)



  try{


    switch(message.type){



      case 'syncState':{


        const state =
          message.data



        if(
          state &&
          state.musicInfo
        ){


          playerAction.setPlayMusicInfo(

            null,

            state.musicInfo

          )


          if(
            state.playing
          ){


            handlePlay()


          }


        }




        if(
          state &&
          state.currentTime !== undefined
        ){


          setTimeout(()=>{


            setCurrentTime(

              state.currentTime

            )


          },1000)


        }




        if(
          state &&
          state.playing === false
        ){


          setTimeout(()=>{


            pause()


          },1200)


        }



        break

      }







      case 'musicChange':{


        playerAction.setPlayMusicInfo(

          null,

          message.data.musicInfo

        )


        handlePlay()



        break

      }








      case 'play':{


        play()



        if(
          message.data.currentTime !== undefined
        ){


          setTimeout(()=>{


            setCurrentTime(

              message.data.currentTime

            )


          },1000)


        }



        break

      }







      case 'pause':{


        pause()



        if(
          message.data.currentTime !== undefined
        ){


          setCurrentTime(

            message.data.currentTime

          )


        }



        break

      }







      case 'seek':{


        setCurrentTime(

          message.data.currentTime

        )


        break

      }







      case 'progress':{


        const delay =

          (

            Date.now()

            -

            message.timestamp

          )

          /

          1000




        setCurrentTime(

          message.data.currentTime

          +

          delay

        )



        break

      }


    }


  }

  finally{


    setTimeout(()=>{


      setRemoteAction(false)


    },1000)


  }


}