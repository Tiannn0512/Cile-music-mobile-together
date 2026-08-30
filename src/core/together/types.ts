export interface TogetherMessage {


  id?: string


  senderId?: string



  type:

    | 'musicChange'

    | 'play'

    | 'pause'

    | 'seek'

    | 'progress'


    // 房间相关

    | 'createRoom'

    | 'joinRoom'

    | 'leaveRoom'

    | 'roomCreated'

    | 'roomJoined'

    | 'userJoined'

    | 'userLeft'

    | 'roomError'

    | 'roomClosed'


    // 状态同步

    | 'syncState'





  timestamp?: number



  roomCode?: string



  message?: string




  onlineCount?: number




  data?: {


    musicInfo?: any


    currentTime?: number


    playing?: boolean


  }


}