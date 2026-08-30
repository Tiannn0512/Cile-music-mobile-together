import playerState from '@/store/player/state'


import {
  clientId
} from './client'


import {
  getRoomCode
} from './room'


import type {
  TogetherMessage
} from './types'







const createMessage = (

  type: TogetherMessage['type'],

  data:any

):TogetherMessage=>{


  return {


    id:

      Math.random()

      .toString(36)

      .substring(2),






    senderId:

      clientId,







    roomCode:

      getRoomCode() || undefined,







    type,







    timestamp:

      Date.now(),






    data


  }


}









const getCurrentTime = ()=>{


  return (

    playerState.progress.nowPlayTime

    ||

    0

  )


}









export const createMusicChangeMessage = ()=>{


  const music =

    playerState.playMusicInfo.musicInfo







  if(!music)

    return null






  return createMessage(

    'musicChange',

    {

      musicInfo:music

    }

  )


}









export const createPlayMessage = ()=>{


  return createMessage(

    'play',

    {


      currentTime:

        getCurrentTime()


    }

  )


}









export const createPauseMessage = ()=>{


  return createMessage(

    'pause',

    {


      currentTime:

        getCurrentTime()


    }

  )


}









export const createProgressMessage = ()=>{


  return createMessage(

    'progress',

    {


      currentTime:

        getCurrentTime()


    }

  )


}